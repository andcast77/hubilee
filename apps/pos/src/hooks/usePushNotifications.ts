'use client'

import { useEffect, useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useUser } from '@/hooks/useUser'
import { posApi } from '@/lib/api/client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string | undefined;

/**
 * Hook to manage push notification subscriptions
 */
export function usePushNotifications() {
  const { data: user } = useUser()
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(VAPID_PUBLIC_KEY || null)

  // VAPID key from env (no API endpoint; set NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  useEffect(() => {
    if (VAPID_PUBLIC_KEY) {
      setVapidPublicKey(VAPID_PUBLIC_KEY)
    }
  }, [])

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isSupported) {
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }, [isSupported])

  // Subscribe to push notifications (uses user from useUser for API)
  const subscribeMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!isSupported || !vapidPublicKey) {
        throw new Error('Push notifications not supported or VAPID key not available')
      }

      const registration = await registerServiceWorker()
      if (!registration) {
        throw new Error('Service Worker registration failed')
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      })

      const p256dh = arrayBufferToBase64(subscription.getKey('p256dh')!)
      const auth = arrayBufferToBase64(subscription.getKey('auth')!)

      if (!user?.id) {
        throw new Error('Usuario no cargado. Inicia sesión e intenta de nuevo.')
      }

      await posApi.post('/push-subscriptions', {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
      })

      // Update permission state
      setPermission(Notification.permission)
    },
  })

  // Unsubscribe from push notifications
  const unsubscribeMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!isSupported) {
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        await posApi.delete(
          `/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`
        )
      }

      setPermission(Notification.permission)
    },
  })

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false
    }

    if (permission === 'granted') {
      return true
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }, [isSupported, permission])

  // Subscribe with permission request
  const subscribe = useCallback(async (): Promise<void> => {
    const hasPermission = await requestPermission()
    if (!hasPermission) {
      throw new Error('Notification permission denied')
    }

    await subscribeMutation.mutateAsync()
  }, [requestPermission, subscribeMutation])

  return {
    isSupported,
    permission,
    isSubscribed: permission === 'granted',
    subscribe,
    unsubscribe: unsubscribeMutation.mutateAsync,
    isLoading: subscribeMutation.isPending || unsubscribeMutation.isPending,
    error: subscribeMutation.error || unsubscribeMutation.error,
  }
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

