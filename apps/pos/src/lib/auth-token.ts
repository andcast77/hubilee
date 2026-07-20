// Funciones de autenticación que NO usan Prisma
// Este archivo puede usarse en middleware (Edge Runtime)
// Usa Web Crypto API para compatibilidad con Edge Runtime
import type { UserRole } from '@/types'

// Helper para decodificar base64url (compatible con Edge Runtime)
function base64UrlDecode(str: string): string {
  // Reemplazar caracteres de base64url a base64 estándar
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  
  // Agregar padding si es necesario
  while (str.length % 4) {
    str += '='
  }
  
  // Usar atob (disponible en Edge Runtime)
  try {
    return atob(str)
  } catch {
    // Fallback para Node.js (si no está en Edge Runtime)
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString()
    }
    throw new Error('No se puede decodificar base64')
  }
}

// Verificación simple de JWT para middleware (Edge Runtime compatible)
// Solo verifica el formato básico, no la firma completa
export function verifyToken(token: string): {
  id: string
  email: string
  role: UserRole
} | null {
  try {
    // Verificar formato básico de JWT (header.payload.signature)
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decodificar payload (base64url)
    const decoded = base64UrlDecode(parts[1])
    const payload = JSON.parse(decoded)

    // Verificar expiración
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null
    }

    // Retornar datos del token (backend puede usar sub en vez de id)
    const id = payload.sub ?? payload.id
    const email = payload.email ?? ''
    const role = payload.role as UserRole | undefined
    if (!id || typeof id !== 'string') return null
    return {
      id: String(id),
      email: typeof email === 'string' ? email : '',
      role: (role && typeof role === 'string' ? role : 'CASHIER') as UserRole,
    }
  } catch {
    return null
  }
}

// generateToken se movió a auth.ts para evitar que se analice en middleware
