import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ========================================
// UTILIDADES DE CSS Y CLASES
// ========================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ========================================
// UTILIDADES DE FECHAS Y TIEMPO
// ========================================

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ========================================
// UTILIDADES DE FORMATO Y MONEDA
// ========================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// ========================================
// UTILIDADES DE IDENTIFICACIÓN
// ========================================

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// ========================================
// UTILIDADES DE FUNCIONES
// ========================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
} 