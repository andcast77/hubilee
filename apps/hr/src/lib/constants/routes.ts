// ========================================
// RUTAS DE LA APLICACIÓN
// ========================================

export const ROUTES = {
  // Rutas principales
  DASHBOARD: '/dashboard',
  EMPLOYEES: '/employees',
  USERS: '/users',
  ROLES: '/roles',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  TIME_TRACKING: '/time-tracking',
  
  // Rutas de autenticación
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
  },
  
  // Rutas de empleados
  EMPLOYEE: {
    NEW: '/employees/new',
    EDIT: (id: string) => `/employees/${id}/edit`,
    DETAILS: (id: string) => `/employees/${id}`,
    ATTENDANCE: (id: string) => `/employees/${id}/attendance`,
    SCHEDULE: (id: string) => `/employees/${id}/schedule`,
  },
  
  // Rutas de reportes
  REPORTS_TYPES: {
    ATTENDANCE: '/reports/attendance',
    TIME_ENTRIES: '/reports/time-entries',
    EMPLOYEES: '/reports/employees',
  },
  
  // Rutas de configuración
  SETTINGS_SECTIONS: {
    COMPANY: '/settings/company',
    HOLIDAYS: '/settings/holidays',
    PROFILE: '/settings/profile',
  },
} as const;
