import { z } from 'zod';

// Employee status enum (previously from Prisma)
enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

// ========================================
// ESQUEMAS DE VALIDACIÓN ZOD
// ========================================

// Esquemas de validación para empleados
export const employeeCreateSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido').max(50, 'El nombre es muy largo'),
  lastName: z.string().min(1, 'El apellido es requerido').max(50, 'El apellido es muy largo'),
  idNumber: z.string().min(1, 'El número de identificación es requerido').max(20, 'El número de identificación es muy largo'),
  email: z.string().email('Email inválido').max(100, 'El email es muy largo'),
  phone: z.string().max(20, 'El teléfono es muy largo').optional(),
  address: z.string().max(200, 'La dirección es muy larga').optional(),
  position: z.string().min(1, 'La posición es requerida').max(100, 'La posición es muy larga'),
  department: z.string().min(1, 'El departamento es requerido').max(100, 'El departamento es muy largo'),
  birthDate: z.string().datetime().optional(),
  dateJoined: z.string().datetime().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

// Esquemas de validación para autenticación
export const loginSchema = z.object({
  email: z.string().email('Email inválido').max(100, 'Email demasiado largo'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres').max(128, 'Contraseña demasiado larga'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido').max(100, 'Email demasiado largo'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'Contraseña demasiado larga')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .regex(/\d/, 'La contraseña debe contener al menos un número'),
  companyName: z.string().min(2, 'Nombre de empresa requerido').max(100, 'Nombre de empresa muy largo'),
  firstName: z.string().min(2, 'Nombre requerido').max(50, 'Nombre muy largo'),
  lastName: z.string().min(2, 'Apellido requerido').max(50, 'Apellido muy largo'),
});

// Esquemas de validación para time entries
export const timeEntryCreateSchema = z.object({
  employeeId: z.string().uuid('ID de empleado inválido'),
  date: z.string().datetime('Fecha inválida'),
  clockIn: z.string().datetime().optional(),
  clockOut: z.string().datetime().optional(),
  totalHours: z.number().min(0).max(24).optional(),
  breakTime: z.number().min(0).max(8).optional(),
  overtime: z.number().min(0).max(12).optional(),
  notes: z.string().max(500, 'Las notas son muy largas').optional(),
  source: z.enum(['MANUAL', 'BIOMETRIC', 'IMPORT']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CORRECTED']).optional(),
});

export const timeEntryUpdateSchema = timeEntryCreateSchema.partial().omit({ employeeId: true });

// Esquemas de validación para roles
export const roleCreateSchema = z.object({
  name: z.string().min(1, 'El nombre del rol es requerido').max(100, 'El nombre del rol es muy largo'),
  description: z.string().max(500, 'La descripción es muy larga').optional(),
  isActive: z.boolean().optional(),
  paymentType: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'PROJECT', 'COMMISSION']).optional(),
  currency: z.string().max(3, 'Moneda inválida').optional(),
  baseSalary: z.number().min(0).optional(),
  hourlyRate: z.number().min(0).optional(),
  dailyRate: z.number().min(0).optional(),
  overtimeRate: z.number().min(1).max(5).optional(),
  nightShiftRate: z.number().min(1).max(5).optional(),
  holidayRate: z.number().min(1).max(5).optional(),
  weekendRate: z.number().min(1).max(5).optional(),
  guardRate: z.number().min(1).max(5).optional(),
  standardHoursPerDay: z.number().min(1).max(24).optional(),
  standardHoursPerWeek: z.number().min(1).max(168).optional(),
  standardDaysPerWeek: z.number().min(1).max(7).optional(),
  hasHealthInsurance: z.boolean().optional(),
  hasRetirementPlan: z.boolean().optional(),
  hasVacationDays: z.boolean().optional(),
  vacationDaysPerYear: z.number().min(0).max(365).optional(),
  hasSickDays: z.boolean().optional(),
  sickDaysPerYear: z.number().min(0).max(365).optional(),
});

export const roleUpdateSchema = roleCreateSchema.partial();

// Esquemas de validación para holidays
export const holidayCreateSchema = z.object({
  name: z.string().min(1, 'El nombre del feriado es requerido').max(100, 'El nombre es muy largo'),
  date: z.string().datetime('Fecha inválida'),
  description: z.string().max(500, 'La descripción es muy larga').optional(),
  isRecurring: z.boolean().optional(),
});

export const holidayUpdateSchema = holidayCreateSchema.partial();

// Esquemas de validación para work shifts
export const workShiftCreateSchema = z.object({
  name: z.string().min(1, 'El nombre del turno es requerido').max(100, 'El nombre es muy largo'),
  description: z.string().max(500, 'La descripción es muy larga').optional(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  breakStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)').optional(),
  breakEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)').optional(),
  tolerance: z.number().min(0).max(120).optional(),
  isActive: z.boolean().optional(),
  isNightShift: z.boolean().optional(),
});

export const workShiftUpdateSchema = workShiftCreateSchema.partial();

// Esquemas de validación para special assignments
export const specialAssignmentCreateSchema = z.object({
  employeeId: z.string().uuid('ID de empleado inválido'),
  date: z.string().datetime('Fecha inválida'),
  type: z.enum(['HOLIDAY', 'WEEKEND', 'GUARD', 'OVERTIME', 'EMERGENCY']),
  isMandatory: z.boolean().optional(),
  notes: z.string().max(500, 'Las notas son muy largas').optional(),
});

export const specialAssignmentUpdateSchema = specialAssignmentCreateSchema.partial().omit({ employeeId: true });

// Esquemas de validación para schedules
export const scheduleCreateSchema = z.object({
  dayOfWeek: z.number().min(0).max(6, 'Día de la semana inválido'),
  isWorkDay: z.boolean(),
  workShiftId: z.string().uuid('ID de turno inválido').optional(),
});

// Esquemas de validación para paginación
export const paginationSchema = z.object({
  page: z.coerce.number().min(1, 'Página debe ser mayor a 0').max(1000, 'Página muy alta'),
  limit: z.coerce.number().min(1, 'Límite debe ser mayor a 0').max(100, 'Límite muy alto'),
});

// Esquemas de validación para búsqueda
export const searchSchema = z.object({
  search: z.string().max(100, 'Término de búsqueda muy largo').optional(),
  status: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  employeeId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.string().max(50).optional(),
  isActive: z.coerce.boolean().optional(),
  year: z.coerce.number().min(1900).max(2100).optional(),
});

// ========================================
// FUNCIONES DE VALIDACIÓN ESPECÍFICAS
// ========================================

// Validación de archivo de importación
export function validateEmployeeImport(file: File) {
  if (!file) throw new Error('No se proporcionó archivo');
  if (file.size === 0) throw new Error('El archivo está vacío');
  if (file.size > 5 * 1024 * 1024) throw new Error('El archivo es demasiado grande (máximo 5MB)');
  if (file.name.length > 255) throw new Error('El nombre del archivo es demasiado largo');
  
  // Sanitizar nombre
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const ext = safeName.toLowerCase().substring(safeName.lastIndexOf('.'));
  if (!allowedExtensions.includes(ext)) throw new Error('Tipo de archivo no permitido');
  
  const dangerousChars = /[<>:"/\\|?*]/;
  if (dangerousChars.test(safeName)) throw new Error('Nombre de archivo contiene caracteres no permitidos');
  
  // Validación de contenido básica para CSV en desarrollo
  if (process.env.NODE_ENV !== 'production' && ext === '.csv') {
    return file.text().then((text: string) => {
      if (!text.includes(',')) throw new Error('El archivo CSV no parece válido');
      return true;
    });
  }
  return Promise.resolve(true);
}

// Validación de datos de empleado para creación
export function validateCreateEmployee(data: Record<string, unknown>) {
  const errors: string[] = [];

  // Validar campos requeridos
  if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length < 2) {
    errors.push('Nombre debe tener al menos 2 caracteres');
  }
  if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length < 2) {
    errors.push('Apellido debe tener al menos 2 caracteres');
  }
  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    errors.push('Email es requerido');
  } else if (!isValidEmail(data.email)) {
    errors.push('Formato de email inválido');
  }
  if (!data.idNumber || typeof data.idNumber !== 'string' || data.idNumber.trim().length < 3) {
    errors.push('Número de identificación debe tener al menos 3 caracteres');
  }
  if (!data.positionId || typeof data.positionId !== 'string' || data.positionId.trim().length === 0) {
    errors.push('Posición es requerida');
  }
  if (!data.departmentId || typeof data.departmentId !== 'string' || data.departmentId.trim().length === 0) {
    errors.push('Departamento es requerido');
  }

  // Validar campos opcionales
  if (typeof data.phone === 'string' && data.phone.length > 20) {
    errors.push('Teléfono demasiado largo');
  }
  if (typeof data.address === 'string' && data.address.length > 200) {
    errors.push('Dirección demasiado larga');
  }
  if (typeof data.birthDate === 'string' && !isValidDate(data.birthDate)) {
    errors.push('Fecha de nacimiento inválida');
  }
  if (typeof data.dateJoined === 'string' && !isValidDate(data.dateJoined)) {
    errors.push('Fecha de ingreso inválida');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    firstName: (data.firstName as string).trim(),
    lastName: (data.lastName as string).trim(),
    email: (data.email as string).toLowerCase().trim(),
    idNumber: (data.idNumber as string).trim(),
    phone: typeof data.phone === 'string' && data.phone.trim().length > 0 ? data.phone.trim() : undefined,
    address: typeof data.address === 'string' && data.address.trim().length > 0 ? data.address.trim() : undefined,
    positionId: (data.positionId as string).trim(),
    departmentId: (data.departmentId as string).trim(),
    birthDate: typeof data.birthDate === 'string' && data.birthDate.trim().length > 0 ? data.birthDate : undefined,
    dateJoined: typeof data.dateJoined === 'string' && data.dateJoined.trim().length > 0 ? data.dateJoined : undefined,
    status: typeof data.status === 'string' && ['ACTIVE','INACTIVE','SUSPENDED'].includes(data.status) ? data.status as EmployeeStatus : 'ACTIVE',
  };
}

// Validación de actualización de empleado
export function validateUpdateEmployee(data: Record<string, unknown>) {
  const errors: string[] = [];

  // Validar campos opcionales
  if (data.firstName !== undefined && (typeof data.firstName !== 'string' || data.firstName.trim().length < 2)) {
    errors.push('Nombre debe tener al menos 2 caracteres');
  }
  if (data.lastName !== undefined && (typeof data.lastName !== 'string' || data.lastName.trim().length < 2)) {
    errors.push('Apellido debe tener al menos 2 caracteres');
  }
  if (data.email !== undefined) {
    if (typeof data.email !== 'string' || data.email.trim().length === 0) {
      errors.push('Email es requerido');
    } else if (!isValidEmail(data.email)) {
      errors.push('Formato de email inválido');
    }
  }
  if (data.idNumber !== undefined && (typeof data.idNumber !== 'string' || data.idNumber.trim().length < 3)) {
    errors.push('Número de identificación debe tener al menos 3 caracteres');
  }
  if (data.positionId !== undefined && (typeof data.positionId !== 'string' || data.positionId.trim().length === 0)) {
    errors.push('Posición es requerida');
  }
  if (data.departmentId !== undefined && (typeof data.departmentId !== 'string' || data.departmentId.trim().length === 0)) {
    errors.push('Departamento es requerido');
  }

  // Validar campos opcionales
  if (typeof data.phone === 'string' && data.phone.length > 20) {
    errors.push('Teléfono demasiado largo');
  }
  if (typeof data.address === 'string' && data.address.length > 200) {
    errors.push('Dirección demasiado larga');
  }
  if (typeof data.birthDate === 'string' && !isValidDate(data.birthDate)) {
    errors.push('Fecha de nacimiento inválida');
  }
  if (typeof data.dateJoined === 'string' && !isValidDate(data.dateJoined)) {
    errors.push('Fecha de ingreso inválida');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    firstName: typeof data.firstName === 'string' ? data.firstName.trim() : undefined,
    lastName: typeof data.lastName === 'string' ? data.lastName.trim() : undefined,
    email: typeof data.email === 'string' ? data.email.toLowerCase().trim() : undefined,
    idNumber: typeof data.idNumber === 'string' ? data.idNumber.trim() : undefined,
    phone: typeof data.phone === 'string' && data.phone.trim().length > 0 ? data.phone.trim() : undefined,
    address: typeof data.address === 'string' && data.address.trim().length > 0 ? data.address.trim() : undefined,
    positionId: typeof data.positionId === 'string' ? data.positionId.trim() : undefined,
    departmentId: typeof data.departmentId === 'string' ? data.departmentId.trim() : undefined,
    birthDate: typeof data.birthDate === 'string' && data.birthDate.trim().length > 0 ? data.birthDate : undefined,
    dateJoined: typeof data.dateJoined === 'string' && data.dateJoined.trim().length > 0 ? data.dateJoined : undefined,
    status: typeof data.status === 'string' && ['ACTIVE','INACTIVE','SUSPENDED'].includes(data.status) ? data.status as EmployeeStatus : undefined,
  };
}

// Validación de autenticación
export function validateLoginInput(email: string, password: string) {
  if (!email || typeof email !== 'string') throw { status: 400, message: 'Email requerido' };
  if (!isValidEmail(email)) throw { status: 400, message: 'Formato de email inválido' };
  if (email.length > 100) throw { status: 400, message: 'Email demasiado largo' };
  if (!password || typeof password !== 'string') throw { status: 400, message: 'Contraseña requerida' };
  if (password.length < 6) throw { status: 400, message: 'Contraseña debe tener al menos 6 caracteres' };
  if (password.length > 128) throw { status: 400, message: 'Contraseña demasiado larga' };
  return { email: email.toLowerCase().trim(), password };
}

export function validateRegisterInput(data: {
  email: string;
  password: string;
  companyName: string;
  firstName: string;
  lastName: string;
}) {
  const { email, password, companyName, firstName, lastName } = data;
  if (!email || typeof email !== 'string') throw { status: 400, message: 'Email requerido' };
  if (!isValidEmail(email)) throw { status: 400, message: 'Formato de email inválido' };
  if (email.length > 100) throw { status: 400, message: 'Email demasiado largo' };
  if (!password || typeof password !== 'string') throw { status: 400, message: 'Contraseña requerida' };
  if (password.length < 8) throw { status: 400, message: 'La contraseña debe tener al menos 8 caracteres' };
  if (password.length > 128) throw { status: 400, message: 'Contraseña demasiado larga' };
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) throw { status: 400, message: 'La contraseña debe contener mayúsculas, minúsculas y números' };
  if (!companyName || companyName.length < 2) throw { status: 400, message: 'Nombre de empresa requerido' };
  if (!firstName || firstName.length < 2) throw { status: 400, message: 'Nombre requerido' };
  if (!lastName || lastName.length < 2) throw { status: 400, message: 'Apellido requerido' };
  return {
    email: email.toLowerCase().trim(),
    password,
    companyName: companyName.trim(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
  };
}

// Validación de asignaciones especiales
export function validateCreateSpecialAssignment(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (!data.employeeId || typeof data.employeeId !== 'string') {
    errors.push('ID de empleado requerido');
  }
  if (!data.date || typeof data.date !== 'string') {
    errors.push('Fecha requerida');
  }
  if (!data.type || typeof data.type !== 'string') {
    errors.push('Tipo de asignación requerido');
  }
  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length < 3) {
    errors.push('Razón debe tener al menos 3 caracteres');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    employeeId: (data.employeeId as string).trim(),
    date: (data.date as string).trim(),
    type: (data.type as string).trim(),
    reason: (data.reason as string).trim(),
    notes: typeof data.notes === 'string' ? data.notes.trim() : undefined,
  };
}

export function validateUpdateSpecialAssignment(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (data.employeeId !== undefined && (typeof data.employeeId !== 'string' || data.employeeId.trim().length === 0)) {
    errors.push('ID de empleado inválido');
  }
  if (data.date !== undefined && (typeof data.date !== 'string' || data.date.trim().length === 0)) {
    errors.push('Fecha inválida');
  }
  if (data.reason !== undefined && (typeof data.reason !== 'string' || data.reason.trim().length < 3)) {
    errors.push('Razón debe tener al menos 3 caracteres');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    employeeId: typeof data.employeeId === 'string' ? data.employeeId.trim() : undefined,
    date: typeof data.date === 'string' ? data.date.trim() : undefined,
    reason: typeof data.reason === 'string' ? data.reason.trim() : undefined,
    notes: typeof data.notes === 'string' ? data.notes.trim() : undefined,
  };
}

export function validateSpecialAssignmentFilters(data: Record<string, unknown>) {
  return {
    employeeId: typeof data.employeeId === 'string' ? data.employeeId.trim() : undefined,
    date: typeof data.date === 'string' ? data.date.trim() : undefined,
    reason: typeof data.reason === 'string' ? data.reason.trim() : undefined,
  };
}

// Validación de holidays
export function validateCreateHoliday(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 1) {
    errors.push('Nombre del feriado es requerido');
  }
  if (!data.date || typeof data.date !== 'string') {
    errors.push('Fecha es requerida');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    name: (data.name as string).trim(),
    date: (data.date as string).trim(),
    description: typeof data.description === 'string' ? data.description.trim() : undefined,
    isRecurring: typeof data.isRecurring === 'boolean' ? data.isRecurring : false,
  };
}

export function validateUpdateHoliday(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim().length < 1)) {
    errors.push('Nombre del feriado es requerido');
  }
  if (data.date !== undefined && (typeof data.date !== 'string' || data.date.trim().length === 0)) {
    errors.push('Fecha es requerida');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    name: typeof data.name === 'string' ? data.name.trim() : undefined,
    date: typeof data.date === 'string' ? data.date.trim() : undefined,
    description: typeof data.description === 'string' ? data.description.trim() : undefined,
    isRecurring: typeof data.isRecurring === 'boolean' ? data.isRecurring : undefined,
  };
}

// Validación de positions
export function validateCreatePosition(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 1) {
    errors.push('Nombre de la posición es requerido');
  }
  if (!data.salaryAmount || typeof data.salaryAmount !== 'number' || data.salaryAmount <= 0) {
    errors.push('Salario debe ser mayor a 0');
  }
  if (!data.salaryType || typeof data.salaryType !== 'string' || !['hour', 'day', 'week', 'biweek', 'month'].includes(data.salaryType)) {
    errors.push('Tipo de salario inválido');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    name: (data.name as string).trim(),
    description: typeof data.description === 'string' ? data.description.trim() : undefined,
    salaryAmount: data.salaryAmount as number,
    salaryType: data.salaryType as 'hour' | 'day' | 'week' | 'biweek' | 'month',
    overtimeEligible: typeof data.overtimeEligible === 'boolean' ? data.overtimeEligible : false,
    overtimeType: typeof data.overtimeType === 'string' && ['multiplier', 'fixed'].includes(data.overtimeType) ? data.overtimeType as 'multiplier' | 'fixed' : undefined,
    overtimeValue: typeof data.overtimeValue === 'number' ? data.overtimeValue : undefined,
    annualVacationDays: typeof data.annualVacationDays === 'number' ? data.annualVacationDays : undefined,
    hasAguinaldo: typeof data.hasAguinaldo === 'boolean' ? data.hasAguinaldo : false,
    monthlyBonus: typeof data.monthlyBonus === 'number' ? data.monthlyBonus : undefined,
    level: typeof data.level === 'string' ? data.level.trim() : undefined,
    isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
    notes: typeof data.notes === 'string' ? data.notes.trim() : undefined,
  };
}

export function validateUpdatePosition(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim().length < 1)) {
    errors.push('Nombre de la posición es requerido');
  }
  if (data.salaryAmount !== undefined && (typeof data.salaryAmount !== 'number' || data.salaryAmount <= 0)) {
    errors.push('Salario debe ser mayor a 0');
  }
  if (data.salaryType !== undefined && (typeof data.salaryType !== 'string' || !['hour', 'day', 'week', 'biweek', 'month'].includes(data.salaryType))) {
    errors.push('Tipo de salario inválido');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    name: typeof data.name === 'string' ? data.name.trim() : undefined,
    description: typeof data.description === 'string' ? data.description.trim() : undefined,
    salaryAmount: typeof data.salaryAmount === 'number' ? data.salaryAmount : undefined,
    salaryType: typeof data.salaryType === 'string' && ['hour', 'day', 'week', 'biweek', 'month'].includes(data.salaryType) ? data.salaryType as 'hour' | 'day' | 'week' | 'biweek' | 'month' : undefined,
    overtimeEligible: typeof data.overtimeEligible === 'boolean' ? data.overtimeEligible : undefined,
    overtimeType: typeof data.overtimeType === 'string' && ['multiplier', 'fixed'].includes(data.overtimeType) ? data.overtimeType as 'multiplier' | 'fixed' : undefined,
    overtimeValue: typeof data.overtimeValue === 'number' ? data.overtimeValue : undefined,
    annualVacationDays: typeof data.annualVacationDays === 'number' ? data.annualVacationDays : undefined,
    hasAguinaldo: typeof data.hasAguinaldo === 'boolean' ? data.hasAguinaldo : undefined,
    monthlyBonus: typeof data.monthlyBonus === 'number' ? data.monthlyBonus : undefined,
    level: typeof data.level === 'string' ? data.level.trim() : undefined,
    isActive: typeof data.isActive === 'boolean' ? data.isActive : undefined,
    notes: typeof data.notes === 'string' ? data.notes.trim() : undefined,
  };
}

// Validación de roles
export function validateCreateRole(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 1) {
    errors.push('Nombre del rol es requerido');
  }
  if (!data.permissions || !Array.isArray(data.permissions)) {
    errors.push('Permisos son requeridos y deben ser un array');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    name: (data.name as string).trim(),
    permissions: (data.permissions as string[]).filter(p => typeof p === 'string'),
  };
}

export function validateUpdateRole(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim().length < 1)) {
    errors.push('Nombre del rol es requerido');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    name: typeof data.name === 'string' ? data.name.trim() : undefined,
    description: typeof data.description === 'string' ? data.description.trim() : undefined,
    isActive: typeof data.isActive === 'boolean' ? data.isActive : undefined,
    paymentType: typeof data.paymentType === 'string' && ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'PROJECT', 'COMMISSION'].includes(data.paymentType) ? data.paymentType as 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'PROJECT' | 'COMMISSION' : undefined,
    currency: typeof data.currency === 'string' ? data.currency.trim() : undefined,
    baseSalary: typeof data.baseSalary === 'number' ? data.baseSalary : undefined,
    hourlyRate: typeof data.hourlyRate === 'number' ? data.hourlyRate : undefined,
    dailyRate: typeof data.dailyRate === 'number' ? data.dailyRate : undefined,
    overtimeRate: typeof data.overtimeRate === 'number' ? data.overtimeRate : undefined,
    nightShiftRate: typeof data.nightShiftRate === 'number' ? data.nightShiftRate : undefined,
    holidayRate: typeof data.holidayRate === 'number' ? data.holidayRate : undefined,
    weekendRate: typeof data.weekendRate === 'number' ? data.weekendRate : undefined,
    guardRate: typeof data.guardRate === 'number' ? data.guardRate : undefined,
    standardHoursPerDay: typeof data.standardHoursPerDay === 'number' ? data.standardHoursPerDay : undefined,
    standardHoursPerWeek: typeof data.standardHoursPerWeek === 'number' ? data.standardHoursPerWeek : undefined,
    standardDaysPerWeek: typeof data.standardDaysPerWeek === 'number' ? data.standardDaysPerWeek : undefined,
    hasHealthInsurance: typeof data.hasHealthInsurance === 'boolean' ? data.hasHealthInsurance : undefined,
    hasRetirementPlan: typeof data.hasRetirementPlan === 'boolean' ? data.hasRetirementPlan : undefined,
    hasVacationDays: typeof data.hasVacationDays === 'boolean' ? data.hasVacationDays : undefined,
    vacationDaysPerYear: typeof data.vacationDaysPerYear === 'number' ? data.vacationDaysPerYear : undefined,
    hasSickDays: typeof data.hasSickDays === 'boolean' ? data.hasSickDays : undefined,
    sickDaysPerYear: typeof data.sickDaysPerYear === 'number' ? data.sickDaysPerYear : undefined,
  };
}

// Funciones de validación adicionales
export function validateHolidayId(id: string): boolean {
  return isValidUUID(id);
}

export function validateHolidayFilters(data: Record<string, unknown>) {
  return {
    page: typeof data.page === 'string' ? data.page.trim() : undefined,
    limit: typeof data.limit === 'string' ? data.limit.trim() : undefined,
    year: typeof data.year === 'string' ? data.year.trim() : undefined,
    isRecurring: typeof data.isRecurring === 'string' ? data.isRecurring === 'true' : undefined,
  };
}

export function validateRoleId(id: string): boolean {
  return isValidUUID(id);
}

export function validateRoleFilters(data: Record<string, unknown>) {
  return {
    page: typeof data.page === 'string' ? data.page.trim() : undefined,
    limit: typeof data.limit === 'string' ? data.limit.trim() : undefined,
    isActive: typeof data.isActive === 'string' ? data.isActive === 'true' : undefined,
  };
}

// Validación de time entries
export function validateCreateTimeEntry(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (!data.employeeId || typeof data.employeeId !== 'string') {
    errors.push('ID de empleado requerido');
  }
  if (!data.date || typeof data.date !== 'string') {
    errors.push('Fecha requerida');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    employeeId: (data.employeeId as string).trim(),
    date: (data.date as string).trim(),
    clockIn: typeof data.clockIn === 'string' ? data.clockIn.trim() : undefined,
    clockOut: typeof data.clockOut === 'string' ? data.clockOut.trim() : undefined,
    totalHours: typeof data.totalHours === 'number' ? data.totalHours : undefined,
    breakTime: typeof data.breakTime === 'number' ? data.breakTime : undefined,
    overtime: typeof data.overtime === 'number' ? data.overtime : undefined,
    notes: typeof data.notes === 'string' ? data.notes.trim() : undefined,
    source: typeof data.source === 'string' && ['MANUAL', 'BIOMETRIC', 'IMPORT'].includes(data.source) ? data.source as 'MANUAL' | 'BIOMETRIC' | 'IMPORT' : 'MANUAL',
    status: typeof data.status === 'string' && ['PENDING', 'APPROVED', 'REJECTED', 'CORRECTED'].includes(data.status) ? data.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED' : 'PENDING',
  };
}

export function validateUpdateTimeEntry(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (data.employeeId !== undefined && (typeof data.employeeId !== 'string' || data.employeeId.trim().length === 0)) {
    errors.push('ID de empleado inválido');
  }
  if (data.date !== undefined && (typeof data.date !== 'string' || data.date.trim().length === 0)) {
    errors.push('Fecha inválida');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    employeeId: typeof data.employeeId === 'string' ? data.employeeId.trim() : undefined,
    date: typeof data.date === 'string' ? data.date.trim() : undefined,
    clockIn: typeof data.clockIn === 'string' ? data.clockIn.trim() : undefined,
    clockOut: typeof data.clockOut === 'string' ? data.clockOut.trim() : undefined,
    totalHours: typeof data.totalHours === 'number' ? data.totalHours : undefined,
    breakTime: typeof data.breakTime === 'number' ? data.breakTime : undefined,
    overtime: typeof data.overtime === 'number' ? data.overtime : undefined,
    notes: typeof data.notes === 'string' ? data.notes.trim() : undefined,
    source: typeof data.source === 'string' && ['MANUAL', 'BIOMETRIC', 'IMPORT'].includes(data.source) ? data.source as 'MANUAL' | 'BIOMETRIC' | 'IMPORT' : undefined,
    status: typeof data.status === 'string' && ['PENDING', 'APPROVED', 'REJECTED', 'CORRECTED'].includes(data.status) ? data.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED' : undefined,
  };
}

export function validateTimeEntryImport(file: File) {
  if (!file) throw new Error('No se proporcionó archivo');
  if (file.size === 0) throw new Error('El archivo está vacío');
  if (file.size > 5 * 1024 * 1024) throw new Error('El archivo es demasiado grande (máximo 5MB)');
  if (file.name.length > 255) throw new Error('El nombre del archivo es demasiado largo');
  
  // Sanitizar nombre
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const ext = safeName.toLowerCase().substring(safeName.lastIndexOf('.'));
  if (!allowedExtensions.includes(ext)) throw new Error('Tipo de archivo no permitido');
  
  const dangerousChars = /[<>:"/\\|?*]/;
  if (dangerousChars.test(safeName)) throw new Error('Nombre de archivo contiene caracteres no permitidos');
  
  // Validación de contenido básica para CSV en desarrollo
  if (process.env.NODE_ENV !== 'production' && ext === '.csv') {
    return file.text().then((text: string) => {
      if (!text.includes(',')) throw new Error('El archivo CSV no parece válido');
      return true;
    });
  }
  return Promise.resolve(true);
}

// Validación de work shifts
export function validateCreateWorkShift(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 1) {
    errors.push('Nombre del turno es requerido');
  }
  if (!data.startTime || typeof data.startTime !== 'string' || !isValidTime(data.startTime)) {
    errors.push('Hora de inicio inválida');
  }
  if (!data.endTime || typeof data.endTime !== 'string' || !isValidTime(data.endTime)) {
    errors.push('Hora de fin inválida');
  }

  if (errors.length > 0) {
    throw new Error(`Errores de validación: ${errors.join(', ')}`);
  }

  return {
    name: (data.name as string).trim(),
    description: typeof data.description === 'string' ? data.description.trim() : undefined,
    startTime: (data.startTime as string).trim(),
    endTime: (data.endTime as string).trim(),
    breakStart: typeof data.breakStart === 'string' && isValidTime(data.breakStart) ? data.breakStart.trim() : undefined,
    breakEnd: typeof data.breakEnd === 'string' && isValidTime(data.breakEnd) ? data.breakEnd.trim() : undefined,
    tolerance: typeof data.tolerance === 'number' ? data.tolerance : undefined,
    isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
    isNightShift: typeof data.isNightShift === 'boolean' ? data.isNightShift : false,
  };
}

export function validateWorkShiftFilters(data: Record<string, unknown>) {
  return {
    page: typeof data.page === 'string' ? data.page.trim() : undefined,
    limit: typeof data.limit === 'string' ? data.limit.trim() : undefined,
    isActive: typeof data.isActive === 'string' ? data.isActive === 'true' : undefined,
    isNightShift: typeof data.isNightShift === 'string' ? data.isNightShift === 'true' : undefined,
  };
}

// ========================================
// FUNCIONES DE VALIDACIÓN GENERALES
// ========================================

// Función para validar y sanitizar datos
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const messages = 'Error de validación en los datos proporcionados';
      throw { status: 400, message: messages };
    }
    throw { status: 400, message: 'Error de validación' };
  }
}

// Función para validar UUIDs de forma más estricta
export function isValidUUID(uuid: string): boolean {
  // Validación más estricta de UUID v4
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // Validación adicional de longitud y formato
  if (!uuid || typeof uuid !== 'string' || uuid.length !== 36) {
    return false;
  }
  
  // Validar que no contenga caracteres peligrosos
  if (/[<>'"&]/.test(uuid)) {
    return false;
  }
  
  return uuidV4Regex.test(uuid);
}

// Función para sanitizar strings de forma más segura
export function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  return str
    .trim()
    .replace(/[<>'"&]/g, '') // Remover caracteres peligrosos
    .replace(/javascript:/gi, '') // Remover javascript: protocol
    .replace(/data:/gi, '') // Remover data: protocol
    .replace(/vbscript:/gi, '') // Remover vbscript: protocol
    .replace(/on\w+=/gi, '') // Remover event handlers
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remover iframes
    .substring(0, 500); // Limitar longitud
}

// Función para validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Función para validar fecha
export function isValidDate(date: string): boolean {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

// Función para validar hora (HH:MM)
export function isValidTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

// Función para limitar el tamaño de respuesta
export function limitResponseSize<T>(data: T, maxSize: number = 1000): T {
  if (Array.isArray(data) && data.length > maxSize) {
    return data.slice(0, maxSize) as T;
  }
  return data;
}

// Función para validar permisos de empresa
export function validateCompanyAccess(userCompanyId: string, targetCompanyId: string): void {
  if (userCompanyId !== targetCompanyId) {
    throw { status: 403, message: 'No tienes permisos para acceder a esta empresa' };
  }
}

// Función para validar que un recurso pertenece a la empresa
export function validateResourceOwnership(userCompanyId: string, resourceCompanyId: string): void {
  if (userCompanyId !== resourceCompanyId) {
    throw { status: 403, message: 'No tienes permisos para acceder a este recurso' };
  }
} 