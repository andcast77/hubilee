/**
 * Connectivity utilities for better online/offline detection
 */

export interface ConnectivityStatus {
  isOnline: boolean
  latency?: number
  lastChecked: number
  error?: string
}

export class ConnectivityChecker {
  private static instance: ConnectivityChecker
  private checkInterval: number | null = null
  private listeners: Array<(status: ConnectivityStatus) => void> = []
  private currentStatus: ConnectivityStatus = {
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    lastChecked: Date.now(),
  }

  private constructor() {}

  static getInstance(): ConnectivityChecker {
    if (!ConnectivityChecker.instance) {
      ConnectivityChecker.instance = new ConnectivityChecker()
    }
    return ConnectivityChecker.instance
  }

  /**
   * Start periodic connectivity checks
   */
  startChecking(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = window.setInterval(async () => {
      await this.checkConnectivity()
    }, intervalMs)

    // Initial check
    this.checkConnectivity()
  }

  /**
   * Stop periodic connectivity checks
   */
  stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Check connectivity by pinging the server
   */
  async checkConnectivity(): Promise<ConnectivityStatus> {
    const startTime = Date.now()
    const isDevelopment = process.env.NODE_ENV === "development"

    // Primero verificar navigator.onLine - si dice offline, no hacer fetch
    if (typeof window !== 'undefined' && !navigator.onLine) {
      this.currentStatus = {
        isOnline: false,
        lastChecked: Date.now(),
        error: 'Navigator reports offline',
      }
      this.listeners.forEach(listener => listener(this.currentStatus))
      return this.currentStatus
    }

    // En modo desarrollo, confiar principalmente en navigator.onLine
    // Solo hacer un check ligero si es necesario
    if (isDevelopment) {
      // En desarrollo, confiar en navigator.onLine y solo verificar si hay respuesta básica
      try {
        // Intentar un fetch muy rápido solo para confirmar que hay conexión
        const response = await fetch('/', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(2000), // Timeout más corto en dev
        })
        
        const latency = Date.now() - startTime
        // En desarrollo, cualquier respuesta (incluso errores) indica que hay servidor corriendo
        const isOnline = (typeof window !== 'undefined' ? navigator.onLine : true) && (response.status < 500 || response.status === 0)

        this.currentStatus = {
          isOnline,
          latency,
          lastChecked: Date.now(),
        }
      } catch (error) {
        // En desarrollo, si navigator.onLine dice online, confiar en eso
        // El servidor podría no estar corriendo pero eso no significa que estemos offline
        this.currentStatus = {
          isOnline: typeof window !== 'undefined' ? navigator.onLine : true, // Confiar en navigator.onLine en desarrollo
          lastChecked: Date.now(),
          error: error instanceof Error ? error.message : 'Network error',
        }
      }
    } else {
      // En producción, hacer ping a la API real (NEXT_PUBLIC_API_URL)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      try {
        const url = apiUrl ? `${apiUrl.replace(/\/$/, '')}/v1/auth/me` : '/v1/auth/me'
        const response = await fetch(url, {
          method: 'HEAD',
          cache: 'no-cache',
          credentials: 'include',
          signal: AbortSignal.timeout(3000),
        }).catch(() => {
          return fetch(typeof window !== 'undefined' ? window.location.origin + '/' : '/', {
            method: 'HEAD',
            cache: 'no-cache',
            signal: AbortSignal.timeout(3000),
          })
        })

        const latency = Date.now() - startTime
        const isOnline = response.status < 500

        this.currentStatus = {
          isOnline,
          latency,
          lastChecked: Date.now(),
        }
      } catch (error) {
        const isLikelyOnline = typeof window !== 'undefined' ? navigator.onLine : true
        this.currentStatus = {
          isOnline: isLikelyOnline,
          lastChecked: Date.now(),
          error: error instanceof Error ? error.message : 'Network error',
        }
      }
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(this.currentStatus))

    return this.currentStatus
  }

  /**
   * Get current connectivity status
   */
  getStatus(): ConnectivityStatus {
    return this.currentStatus
  }

  /**
   * Add connectivity status listener
   */
  onStatusChange(listener: (status: ConnectivityStatus) => void): () => void {
    this.listeners.push(listener)

    // Return cleanup function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  /**
   * Quick connectivity check (synchronous)
   */
  isLikelyOnline(): boolean {
    const isDevelopment = process.env.NODE_ENV === "development"
    
    // Primero verificar navigator.onLine - es la fuente más confiable
    if (typeof window !== 'undefined' && navigator.onLine === false) {
      return false
    }

    // En desarrollo, confiar principalmente en navigator.onLine
    if (isDevelopment) {
      return typeof window !== 'undefined' ? navigator.onLine : true
    }

    // En producción, usar el resultado del check si es reciente
    const timeSinceLastCheck = Date.now() - this.currentStatus.lastChecked
    if (timeSinceLastCheck < 120000) {
      return this.currentStatus.isOnline
    }

    // Si no hay check reciente, confiar en navigator.onLine
    return typeof window !== 'undefined' ? navigator.onLine : true
  }

  /**
   * Check if connection is slow (> 1 second latency)
   */
  isSlowConnection(): boolean {
    return (this.currentStatus.latency || 0) > 1000
  }

  /**
   * Check if connection is very slow (> 3 second latency)
   */
  isVerySlowConnection(): boolean {
    return (this.currentStatus.latency || 0) > 3000
  }
}

// Export singleton instance
export const connectivityChecker = ConnectivityChecker.getInstance()

/**
 * Hook for connectivity monitoring
 */
export function useConnectivity() {
  const [status, setStatus] = React.useState<ConnectivityStatus>(
    connectivityChecker.getStatus()
  )

  React.useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = connectivityChecker.onStatusChange(setStatus)

    // Start periodic checking
    connectivityChecker.startChecking()

    return () => {
      unsubscribe()
      connectivityChecker.stopChecking()
    }
  }, [])

  return {
    ...status,
    isLikelyOnline: connectivityChecker.isLikelyOnline(),
    isSlowConnection: connectivityChecker.isSlowConnection(),
    isVerySlowConnection: connectivityChecker.isVerySlowConnection(),
    checkNow: () => connectivityChecker.checkConnectivity(),
  }
}

// Import React for the hook (will be tree-shaken if not used)
import React from 'react'