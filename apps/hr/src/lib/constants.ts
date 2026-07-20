// ========================================
// CONSTANTES DEL SISTEMA
// ========================================

// Roles del sistema
export const ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee'
} as const;

// Estados de empleado
export const EMPLOYEE_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
} as const;

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100
} as const;

// Configuración de la aplicación
export const APP_CONFIG = {
  NAME: 'Hr',
  DESCRIPTION: 'Sistema de gestión de recursos humanos',
  VERSION: '1.0.0'
} as const;

// Mensajes de error
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'No tienes permisos para acceder a este recurso',
  NOT_FOUND: 'Recurso no encontrado',
  VALIDATION_ERROR: 'Error de validación',
  SERVER_ERROR: 'Error del servidor',
  NETWORK_ERROR: 'Error de conexión'
} as const;

// Mensajes de éxito
export const SUCCESS_MESSAGES = {
  CREATED: 'Registro creado exitosamente',
  UPDATED: 'Registro actualizado exitosamente',
  DELETED: 'Registro eliminado exitosamente',
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Sesión cerrada exitosamente'
} as const; 