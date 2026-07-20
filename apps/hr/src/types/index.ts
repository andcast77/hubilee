import { UserRole } from '@/interfaces';
import type { Employee as InterfaceEmployee, User as InterfaceUser, Role as InterfaceRole } from '@/interfaces';

// ========================================
// TIPOS BASE (Exported from interfaces)
// ========================================

export type Employee = InterfaceEmployee;
export type User = InterfaceUser;
export type Role = InterfaceRole;
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

// ========================================
// TIPOS DE SALARIO Y HORAS EXTRA
// ========================================

export type SalaryType = 'hour' | 'day' | 'week' | 'biweek' | 'month';
export type OvertimeType = 'multiplier' | 'fixed';

// ========================================
// TIPOS DE USUARIO CON RELACIONES
// ========================================

export type UserWithRelations = {
  id: string;
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  roles: UserRole[];  
  createdAt: Date;
  updatedAt: Date;
};

// ========================================
// INTERFACES DE POSICIÓN
// ========================================

export interface PositionData {
  name: string;
  description?: string;
  salaryAmount: number;
  salaryType: SalaryType;
  overtimeEligible?: boolean;
  overtimeType?: OvertimeType;
  overtimeValue?: number;
  annualVacationDays?: number;
  hasAguinaldo?: boolean;
  monthlyBonus?: number;
  level?: string;
  isActive?: boolean;
  notes?: string;
}

export interface Position {
  id: string;
  name: string;
  description?: string;
  salaryAmount: number;
  salaryType: SalaryType;
  overtimeEligible: boolean;
  overtimeType?: OvertimeType;
  overtimeValue?: number;
  annualVacationDays?: number;
  hasAguinaldo: boolean;
  monthlyBonus?: number;
  level?: string;
  isActive: boolean;
  notes?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}
