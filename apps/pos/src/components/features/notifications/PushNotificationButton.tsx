'use client'

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Button } from '@hubilee/ui'
import { Bell, BellOff } from 'lucide-react'

export function PushNotificationButton() {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe, isLoading } =
    usePushNotifications()
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // Only show button if supported and permission is not denied
    if (isSupported && permission !== 'denied') {
      setShowButton(true)
    }
  }, [isSupported, permission])

  if (!showButton) {
    return null
  }

  const handleClick = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe()
      } else {
        await subscribe()
      }
    } catch (error) {
      console.error('Failed to toggle push notifications:', error)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          <span>Desactivar Notificaciones</span>
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          <span>Activar Notificaciones</span>
        </>
      )}
    </Button>
  )
}

