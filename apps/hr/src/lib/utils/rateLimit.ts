import { NextRequest } from 'next/server';
import { RATE_LIMIT_CONFIG } from '@/lib/config';

// Almacén en memoria para rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Función para obtener la clave del rate limit
function getRateLimitKey(request: NextRequest, type: 'general' | 'login' | 'import' = 'general'): string {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.headers.get('cf-connecting-ip') || 
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const path = request.nextUrl.pathname;
  
  if (type === 'login') {
    return `login:${ip}:${userAgent}`;
  }
  if (type === 'import') {
    return `import:${ip}:${path}`;
  }
  return `general:${ip}:${path}`;
}

// Función para limpiar entradas expiradas
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Función principal de rate limiting (compatibilidad)
export function rateLimit(
  request: NextRequest, 
  type: 'general' | 'login' | 'import' = 'general'
): { success: boolean; remaining: number; resetTime: number; message?: string } {
  // Limpiar entradas expiradas cada 100 requests
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  const key = getRateLimitKey(request, type);
  const now = Date.now();
  
  // Configuración según el tipo
  const config = type === 'login' 
    ? { window: RATE_LIMIT_CONFIG.LOGIN_WINDOW_MS, max: RATE_LIMIT_CONFIG.LOGIN_MAX_ATTEMPTS }
    : type === 'import'
    ? { window: RATE_LIMIT_CONFIG.IMPORT_WINDOW_MS, max: RATE_LIMIT_CONFIG.IMPORT_MAX_ATTEMPTS }
    : { window: RATE_LIMIT_CONFIG.WINDOW_MS, max: RATE_LIMIT_CONFIG.MAX_REQUESTS };

  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Primera request o ventana expirada
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.window
    });
    
    return {
      success: true,
      remaining: config.max - 1,
      resetTime: now + config.window
    };
  }

  if (entry.count >= config.max) {
    // Rate limit excedido
    const message = type === 'login' 
      ? 'Demasiados intentos de login. Intenta de nuevo en 5 minutos.'
      : type === 'import'
      ? 'Demasiadas importaciones. Intenta de nuevo en 1 hora.'
      : 'Demasiadas requests. Intenta de nuevo en 15 minutos.';
    
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      message
    };
  }

  // Incrementar contador
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    success: true,
    remaining: config.max - entry.count,
    resetTime: entry.resetTime
  };
}

// Función para aplicar rate limiting en endpoints
export async function applyRateLimit(
  request: NextRequest, 
  type: 'general' | 'login' | 'import' = 'general'
): Promise<void> {
  const result = rateLimit(request, type);
  
  if (!result.success) {
    const limit = type === 'login' ? RATE_LIMIT_CONFIG.LOGIN_MAX_ATTEMPTS :
                 type === 'import' ? RATE_LIMIT_CONFIG.IMPORT_MAX_ATTEMPTS :
                 RATE_LIMIT_CONFIG.MAX_REQUESTS;
    
    throw { 
      status: 429, 
      message: result.message || 'Rate limit excedido',
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
      }
    };
  }
}

// Función para obtener headers de rate limit
export async function getRateLimitHeaders(
  request: NextRequest, 
  type: 'general' | 'login' | 'import' = 'general'
): Promise<Record<string, string>> {
  const result = rateLimit(request, type);
  const limit = type === 'login' ? RATE_LIMIT_CONFIG.LOGIN_MAX_ATTEMPTS :
               type === 'import' ? RATE_LIMIT_CONFIG.IMPORT_MAX_ATTEMPTS :
               RATE_LIMIT_CONFIG.MAX_REQUESTS;
  
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
  };
}

// Función para validar IP
export function validateIP(ip: string): boolean {
  // En desarrollo, permitir IPs locales
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // Validar formato de IP
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'unknown';
}

// Función para detectar patrones sospechosos
export function detectSuspiciousActivity(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.headers.get('cf-connecting-ip') || 
             '';
  const path = request.nextUrl.pathname;
  
  // Detectar user agents sospechosos
  const suspiciousUserAgents = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java'
  ];
  
  const hasSuspiciousUserAgent = suspiciousUserAgents.some(agent => 
    userAgent.toLowerCase().includes(agent)
  );
  
  // Detectar IPs privadas o locales (puede ser sospechoso en producción)
  const isPrivateIP = ip.startsWith('10.') || 
                     ip.startsWith('192.168.') || 
                     ip.startsWith('172.') ||
                     ip === '127.0.0.1' ||
                     ip === 'localhost';
  
  // Detectar rutas sensibles
  const sensitivePaths = ['/v1/auth/login', '/v1/auth/register', '/v1/hr/employees/import'];
  const isSensitivePath = sensitivePaths.includes(path);
  
  return hasSuspiciousUserAgent || (isPrivateIP && isSensitivePath);
} 