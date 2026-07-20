// ========================================
// SISTEMA DE LOGGING DE SEGURIDAD
// ========================================

import { NextRequest } from 'next/server';
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

// Tipos de eventos de seguridad
export enum SecurityEventType {
  // Autenticación
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  REGISTER_SUCCESS = 'REGISTER_SUCCESS',
  REGISTER_FAILED = 'REGISTER_FAILED',
  
  // Autorización
  ACCESS_DENIED = 'ACCESS_DENIED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // Archivos
  FILE_UPLOAD_SUCCESS = 'FILE_UPLOAD_SUCCESS',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_VALIDATION_FAILED = 'FILE_VALIDATION_FAILED',
  
  // Errores de seguridad
  SECURITY_ERROR = 'SECURITY_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Actividad sospechosa
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  
  // Sistema
  SYSTEM_STARTUP = 'SYSTEM_STARTUP',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE'
}

// Niveles de severidad
export enum SecurityLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// Interfaz para eventos de seguridad
export interface SecurityEvent {
  timestamp: string;
  level: SecurityLevel;
  type: SecurityEventType;
  message: string;
  userId?: string;
  email?: string;
  companyId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  details?: Record<string, unknown>;
  sessionId?: string;
}

// Configuración del logger
const LOGGER_CONFIG = {
  ENABLED: process.env.SECURITY_LOGGING_ENABLED !== 'false',
  LOG_LEVEL: (process.env.SECURITY_LOG_LEVEL || 'INFO') as SecurityLevel,
  LOG_DIR: process.env.SECURITY_LOG_DIR || './logs/security',
  MAX_LOG_SIZE: parseInt(process.env.SECURITY_MAX_LOG_SIZE || '10485760'), // 10MB
  ROTATION_DAYS: parseInt(process.env.SECURITY_LOG_ROTATION_DAYS || '30'),
  CONSOLE_OUTPUT: process.env.NODE_ENV === 'development'
};

// Función para obtener la ruta del archivo de log
function getLogFilePath(): string {
  const today = new Date().toISOString().slice(0, 10);
  const logDir = join(process.cwd(), LOGGER_CONFIG.LOG_DIR);
  
  // Crear directorio si no existe
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  
  return join(logDir, `security-${today}.log`);
}

// Función para obtener información del request
function getRequestInfo(request: NextRequest): {
  ip: string;
  userAgent: string;
  path: string;
  method: string;
} {
  const ipHeader =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip');

  let ip: string;
  if (typeof ipHeader === 'string') {
    const first = ipHeader.split(',')[0];
    ip = typeof first === 'string' ? first.trim() : 'unknown';
  } else {
    ip = 'unknown';
  }

  return {
    ip,
    userAgent: request.headers.get('user-agent') ?? 'unknown',
    path:
      typeof request.nextUrl !== 'undefined' &&
      typeof request.nextUrl.pathname === 'string'
        ? request.nextUrl.pathname
        : 'unknown',
    method: typeof request.method === 'string' ? request.method : 'unknown',
  };
}

// Función para obtener información del usuario desde headers
function getUserInfo(request: NextRequest): {
  userId?: string;
  email?: string;
  companyId?: string;
} {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const companyId = request.headers.get('x-company-id');
  
  return {
    ...(userId && { userId }),
    ...(email && { email }),
    ...(companyId && { companyId })
  };
}

// Función para generar ID de sesión
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Función para verificar si debemos loggear según el nivel
function shouldLog(level: SecurityLevel): boolean {
  if (!LOGGER_CONFIG.ENABLED) return false;
  
  const levels = [SecurityLevel.INFO, SecurityLevel.WARNING, SecurityLevel.ERROR, SecurityLevel.CRITICAL];
  const configLevelIndex = levels.indexOf(LOGGER_CONFIG.LOG_LEVEL);
  const eventLevelIndex = levels.indexOf(level);
  
  return eventLevelIndex >= configLevelIndex;
}

// Función para formatear el log
function formatLogEntry(event: SecurityEvent): string {
  const parts = [
    `[${event.timestamp}]`,
    `[${event.level}]`,
    `[${event.type}]`,
    event.message
  ];
  
  if (event.userId) parts.push(`user:${event.userId}`);
  if (event.email) parts.push(`email:${event.email}`);
  if (event.companyId) parts.push(`company:${event.companyId}`);
  if (event.ip) parts.push(`ip:${event.ip}`);
  if (event.path) parts.push(`path:${event.path}`);
  if (event.method) parts.push(`method:${event.method}`);
  if (event.sessionId) parts.push(`session:${event.sessionId}`);
  
  if (typeof event.details === 'object' && event.details && Object.keys(event.details).length > 0) {
    parts.push(`details:${JSON.stringify(event.details)}`);
  }
  
  return parts.join(' | ');
}

// Función para escribir en el archivo de log
function writeToLogFile(entry: string): void {
  try {
    const logFile = getLogFilePath();
    appendFileSync(logFile, entry + '\n', 'utf8');
  } catch (error) {
    console.error('Error writing to security log:', error);
  }
}

// Función para rotar logs antiguos
function rotateOldLogs(): void {
  try {
    const logDir = join(process.cwd(), LOGGER_CONFIG.LOG_DIR);
    if (!existsSync(logDir)) return;
    
    const files = readdirSync(logDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOGGER_CONFIG.ROTATION_DAYS);
    
    files.forEach((file: string) => {
      if (file.startsWith('security-') && file.endsWith('.log')) {
        const filePath = join(logDir, file);
        const stats = statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          unlinkSync(filePath);
          console.log(`🗑️ Log rotado: ${file}`);
        }
      }
    });
  } catch (error) {
    console.error('Error rotating logs:', error);
  }
}

// Función principal para loggear eventos de seguridad
export function logSecurityEvent(
  level: SecurityLevel,
  type: SecurityEventType,
  message: string,
  request?: NextRequest,
  details?: Record<string, unknown>
): void {
  if (!shouldLog(level)) return;
  
  const timestamp = new Date().toISOString();
  const sessionId = generateSessionId();
  
  const event: SecurityEvent = {
    timestamp,
    level,
    type,
    message,
    sessionId,
    ...(details && { details })
  };
  
  // Agregar información del request si está disponible
  if (request) {
    const requestInfo = getRequestInfo(request);
    const userInfo = getUserInfo(request);
    
    Object.assign(event, {
      ...requestInfo,
      ...userInfo
    });
  }
  
  const logEntry = formatLogEntry(event);
  
  // Escribir en archivo
  writeToLogFile(logEntry);
  
  // Mostrar en consola en desarrollo
  if (LOGGER_CONFIG.CONSOLE_OUTPUT) {
    const emoji = {
      [SecurityLevel.INFO]: 'ℹ️',
      [SecurityLevel.WARNING]: '⚠️',
      [SecurityLevel.ERROR]: '❌',
      [SecurityLevel.CRITICAL]: '🚨'
    }[level];
    
    console.log(`${emoji} [SECURITY] ${logEntry}`);
  }
  
  // Rotar logs antiguos (solo una vez por día)
  if (Math.random() < 0.001) { // 0.1% de probabilidad
    rotateOldLogs();
  }
}

// Funciones de conveniencia para eventos comunes
export const SecurityLogger = {
  // Autenticación
  loginSuccess: (request: NextRequest, email: string, userId: string) => {
    logSecurityEvent(
      SecurityLevel.INFO,
      SecurityEventType.LOGIN_SUCCESS,
      `Login exitoso para ${email}`,
      request,
      { userId, email }
    );
  },
  
  loginFailed: (request: NextRequest, email: string, reason: string) => {
    logSecurityEvent(
      SecurityLevel.WARNING,
      SecurityEventType.LOGIN_FAILED,
      `Login fallido para ${email}: ${reason}`,
      request,
      { email, reason }
    );
  },
  
  logout: (request: NextRequest, userId: string, email: string) => {
    logSecurityEvent(
      SecurityLevel.INFO,
      SecurityEventType.LOGOUT,
      `Logout para ${email}`,
      request,
      { userId, email }
    );
  },
  
  // Autorización
  accessDenied: (request: NextRequest, reason: string) => {
    logSecurityEvent(
      SecurityLevel.WARNING,
      SecurityEventType.ACCESS_DENIED,
      `Acceso denegado: ${reason}`,
      request,
      { reason }
    );
  },
  
  unauthorizedAccess: (request: NextRequest) => {
    logSecurityEvent(
      SecurityLevel.ERROR,
      SecurityEventType.UNAUTHORIZED_ACCESS,
      'Intento de acceso no autorizado',
      request
    );
  },
  
  tokenExpired: (request: NextRequest, userId?: string) => {
    logSecurityEvent(
      SecurityLevel.WARNING,
      SecurityEventType.TOKEN_EXPIRED,
      'Token expirado',
      request,
      { userId }
    );
  },
  
  tokenInvalid: (request: NextRequest) => {
    logSecurityEvent(
      SecurityLevel.ERROR,
      SecurityEventType.TOKEN_INVALID,
      'Token inválido',
      request
    );
  },
  
  // Rate Limiting
  rateLimitExceeded: (request: NextRequest, type: string) => {
    logSecurityEvent(
      SecurityLevel.WARNING,
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      `Rate limit excedido para ${type}`,
      request,
      { type }
    );
  },
  
  suspiciousActivity: (request: NextRequest, details: Record<string, unknown>) => {
    logSecurityEvent(
      SecurityLevel.WARNING,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      'Actividad sospechosa detectada',
      request,
      details
    );
  },
  
  // Archivos
  fileUploadSuccess: (request: NextRequest, fileName: string, fileSize: number) => {
    logSecurityEvent(
      SecurityLevel.INFO,
      SecurityEventType.FILE_UPLOAD_SUCCESS,
      `Archivo subido exitosamente: ${fileName}`,
      request,
      { fileName, fileSize }
    );
  },
  
  fileUploadFailed: (request: NextRequest, fileName: string, reason: string) => {
    logSecurityEvent(
      SecurityLevel.ERROR,
      SecurityEventType.FILE_UPLOAD_FAILED,
      `Error al subir archivo ${fileName}: ${reason}`,
      request,
      { fileName, reason }
    );
  },
  
  // Errores de seguridad
  securityError: (request: NextRequest, error: string, details?: Record<string, unknown>) => {
    logSecurityEvent(
      SecurityLevel.ERROR,
      SecurityEventType.SECURITY_ERROR,
      `Error de seguridad: ${error}`,
      request,
      details
    );
  },
  
  // Ataques
  bruteForceAttempt: (request: NextRequest, email: string, attempts: number) => {
    logSecurityEvent(
      SecurityLevel.CRITICAL,
      SecurityEventType.BRUTE_FORCE_ATTEMPT,
      `Intento de fuerza bruta detectado para ${email}`,
      request,
      { email, attempts }
    );
  },
  
  sqlInjectionAttempt: (request: NextRequest, payload: string) => {
    logSecurityEvent(
      SecurityLevel.CRITICAL,
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      'Intento de inyección SQL detectado',
      request,
      { payload: payload.substring(0, 100) } // Limitar longitud
    );
  },
  
  xssAttempt: (request: NextRequest, payload: string) => {
    logSecurityEvent(
      SecurityLevel.CRITICAL,
      SecurityEventType.XSS_ATTEMPT,
      'Intento de XSS detectado',
      request,
      { payload: payload.substring(0, 100) } // Limitar longitud
    );
  },
  
  // Sistema
  systemStartup: () => {
    logSecurityEvent(
      SecurityLevel.INFO,
      SecurityEventType.SYSTEM_STARTUP,
      'Sistema de logging de seguridad iniciado'
    );
  },
  
  configurationChange: (change: string) => {
    logSecurityEvent(
      SecurityLevel.INFO,
      SecurityEventType.CONFIGURATION_CHANGE,
      `Cambio de configuración: ${change}`
    );
  }
};

// Inicializar el sistema de logging
SecurityLogger.systemStartup(); 