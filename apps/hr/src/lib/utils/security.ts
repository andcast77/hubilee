import { NextRequest } from 'next/server';

// Constantes de seguridad
export const SECURITY_CONSTANTS = {
  MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
  MAX_RESPONSE_SIZE: 1000,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: 100,
  SESSION_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 días
} as const;

// Headers de seguridad recomendados
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

// Función para validar el tamaño de la request
export function validateRequestSize(request: NextRequest): void {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > SECURITY_CONSTANTS.MAX_REQUEST_SIZE) {
    throw { status: 413, message: 'Request demasiado grande' };
  }
}

// Función para sanitizar parámetros de búsqueda
export function sanitizeSearchParams(params: Record<string, string | null | undefined>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      // Sanitizar el valor
      const sanitizedValue = value
        .trim()
        .replace(/[<>]/g, '') // Remover caracteres peligrosos
        .substring(0, 100); // Limitar longitud
      
      if (sanitizedValue.length > 0) {
        sanitized[key] = sanitizedValue;
      }
    }
  }
  
  return sanitized;
}

// Función para validar y sanitizar paginación
export function validatePagination(page: string | null | undefined, limit: string | null | undefined): { page: number; limit: number; skip: number } {
  const pageNum = Math.max(1, Math.min(1000, parseInt(page || '1') || 1));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit || '10') || 10));
  const skip = (pageNum - 1) * limitNum;
  
  return { page: pageNum, limit: limitNum, skip };
}

// Función para validar fechas
export function validateDateRange(startDate: string | null | undefined, endDate: string | null | undefined): { start: Date | null; end: Date | null } {
  let start: Date | null = null;
  let end: Date | null = null;
  
  if (startDate) {
    const startDateObj = new Date(startDate);
    if (!isNaN(startDateObj.getTime())) {
      start = startDateObj;
    }
  }
  
  if (endDate) {
    const endDateObj = new Date(endDate);
    if (!isNaN(endDateObj.getTime())) {
      end = endDateObj;
    }
  }
  
  // Validar que la fecha de inicio no sea posterior a la de fin
  if (start && end && start > end) {
    throw { status: 400, message: 'La fecha de inicio no puede ser posterior a la fecha de fin' };
  }
  
  return { start, end };
}

// Función para validar UUIDs
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Función para validar emails
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 100;
}

// Función para validar números de teléfono
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,20}$/;
  return phoneRegex.test(phone);
}

// Función para validar formato de hora (HH:MM)
export function validateTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

// Función para validar que un número esté en un rango
export function validateNumberRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Función para limitar el tamaño de respuesta
export function limitResponseSize<T>(data: T, maxSize: number = SECURITY_CONSTANTS.MAX_RESPONSE_SIZE): T {
  if (Array.isArray(data) && data.length > maxSize) {
    return data.slice(0, maxSize) as T;
  }
  return data;
}

// Función para validar permisos de empresa
export function validateCompanyAccess(userCompanyId: string, targetCompanyId: string): void {
  if (!userCompanyId || !targetCompanyId || userCompanyId !== targetCompanyId) {
    throw { status: 403, message: 'No tienes permisos para acceder a esta empresa' };
  }
}

// Función para validar que un recurso pertenece a la empresa
export function validateResourceOwnership(userCompanyId: string, resourceCompanyId: string): void {
  if (!userCompanyId || !resourceCompanyId || userCompanyId !== resourceCompanyId) {
    throw { status: 403, message: 'No tienes permisos para acceder a este recurso' };
  }
}

// Función para validar que un usuario puede acceder a un empleado
export function validateEmployeeAccess(userCompanyId: string, employeeCompanyId: string): void {
  validateResourceOwnership(userCompanyId, employeeCompanyId);
}

// Función para validar roles de usuario
export function validateUserRoles(userRoles: string[], requiredRoles: string[]): boolean {
  return userRoles.some(role => requiredRoles.includes(role));
}

// Función para sanitizar strings
export function sanitizeString(str: string, maxLength: number = 500): string {
  return str
    .trim()
    .replace(/[<>]/g, '') // Remover caracteres peligrosos
    .substring(0, maxLength); // Limitar longitud
}

// Función para validar archivos
export function validateFile(file: File, maxSize: number = 5 * 1024 * 1024, allowedTypes: string[] = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']): void {
  if (file.size > maxSize) {
    throw { status: 400, message: 'El archivo es demasiado grande' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw { status: 400, message: 'Tipo de archivo no permitido' };
  }
}

// Función para generar headers de seguridad
export function getSecurityHeaders(): Record<string, string> {
  const isDev = process.env.NODE_ENV !== 'production';

  // Content Security Policy
  const csp = isDev
    ? [
        "default-src 'self' http://localhost:3000 ws://localhost:3000;",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000;",
        "style-src 'self' 'unsafe-inline' http://localhost:3000;",
        "img-src 'self' data: http://localhost:3000;",
        "connect-src 'self' ws://localhost:3000 http://localhost:3000;",
        "font-src 'self' data:;",
        "object-src 'none';",
        "frame-ancestors 'none';"
      ].join(' ')
    : [
        "default-src 'self';",
        "script-src 'self';",
        "style-src 'self';",
        "img-src 'self' data:;",
        "connect-src 'self';",
        "font-src 'self' data:;",
        "object-src 'none';",
        "frame-ancestors 'none';"
      ].join(' ');

  return {
    ...SECURITY_HEADERS,
    'Cache-Control': 'no-store, max-age=0',
    'Pragma': 'no-cache',
    'Content-Security-Policy': csp,
  };
}

// Función para validar que un ID existe y pertenece a la empresa
export async function validateResourceExists<T>(
  prismaModel: { findFirst: (args: { where: { id: string; companyId: string } }) => Promise<T | null> },
  id: string,
  companyId: string,
  errorMessage: string = 'Recurso no encontrado'
): Promise<T> {
  if (!validateUUID(id)) {
    throw { status: 400, message: 'ID inválido' };
  }
  
  const resource = await prismaModel.findFirst({
    where: { id, companyId }
  });
  
  if (!resource) {
    throw { status: 404, message: errorMessage };
  }
  
  return resource;
} 