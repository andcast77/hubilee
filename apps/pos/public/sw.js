/**
 * Pos service worker — Web Push only.
 * Push payload JSON matches apps/api push-sender.service (title, body, url, data).
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let title = 'Notificación'
  let body = ''
  let url = '/'
  /** @type {Record<string, unknown> | undefined} */
  let extra

  if (event.data) {
    try {
      const parsed = event.data.json()
      if (typeof parsed.title === 'string') title = parsed.title
      if (typeof parsed.body === 'string') body = parsed.body
      if (typeof parsed.url === 'string') url = parsed.url
      if (parsed.data != null && typeof parsed.data === 'object') {
        extra = /** @type {Record<string, unknown>} */ (parsed.data)
      }
    } catch {
      try {
        const text = event.data.text()
        if (text) body = text
      } catch {
        /* ignore */
      }
    }
  }

  const options = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url, extra },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = event.notification.data && event.notification.data.url
  const pathOrUrl = typeof raw === 'string' ? raw : '/'
  let target
  try {
    target = new URL(pathOrUrl, self.location.origin).href
  } catch {
    target = new URL('/', self.location.origin).href
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === target && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target)
      }
    }),
  )
})
