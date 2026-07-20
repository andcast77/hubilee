/**
 * Centralized Sync Notification Store
 * Manages sync status notifications in a single location
 */

import { create } from 'zustand'

export type SyncNotificationType = 'syncing' | 'success' | 'error' | 'offline' | null

export interface SyncNotification {
  type: SyncNotificationType
  message?: string
  details?: string
  progress?: {
    stage: string
    progress: number
    total: number
  }
  timestamp?: number
  priority?: 'low' | 'normal' | 'high' // Prioridad: high para errores críticos
}

interface SyncNotificationStore {
  notification: SyncNotification | null
  setNotification: (notification: SyncNotification | null, force?: boolean) => void
  clearNotification: () => void
}

// Función para determinar la prioridad basada en el tipo
function getNotificationPriority(type: SyncNotificationType): 'low' | 'normal' | 'high' {
  switch (type) {
    case 'error':
      return 'high'
    case 'syncing':
      return 'normal'
    case 'success':
      return 'low'
    case 'offline':
      return 'normal'
    default:
      return 'normal'
  }
}

export const useSyncNotificationStore = create<SyncNotificationStore>((set, get) => ({
  notification: null,
  setNotification: (notification, force = false) => {
    if (!notification) {
      set({ notification: null })
      return
    }

    const current = get().notification
    
    // Si no hay notificación actual, establecer la nueva
    if (!current) {
      set({ 
        notification: { 
          ...notification, 
          priority: notification.priority || getNotificationPriority(notification.type) 
        } 
      })
      return
    }

    // Si se fuerza, establecer sin importar la prioridad
    if (force) {
      set({ 
        notification: { 
          ...notification, 
          priority: notification.priority || getNotificationPriority(notification.type) 
        } 
      })
      return
    }

    // Comparar prioridades: high > normal > low
    const currentPriority = current.priority || getNotificationPriority(current.type)
    const newPriority = notification.priority || getNotificationPriority(notification.type)
    
    const priorityOrder: Record<string, number> = { low: 1, normal: 2, high: 3 }
    
    // Solo reemplazar si la nueva notificación tiene mayor o igual prioridad
    if (priorityOrder[newPriority] >= priorityOrder[currentPriority]) {
      set({ 
        notification: { 
          ...notification, 
          priority: newPriority 
        } 
      })
    }
  },
  clearNotification: () => set({ notification: null }),
}))
