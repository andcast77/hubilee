/**
 * Caché de vista previa en IndexedDB + revalidación con If-None-Match.
 * Solo ejecutar desde el navegador (p. ej. `useEffect` en componentes cliente).
 */

const DB_NAME = 'baro-expediente-preview'
const DB_VERSION = 1
const STORE = 'preview-blobs'

export type ExpedientePreviewCacheEntry = {
  etag: string
  contentType: string
  body: ArrayBuffer
  savedAt: number
}

function canUseIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB.open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

async function idbGet(key: string): Promise<ExpedientePreviewCacheEntry | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result as ExpedientePreviewCacheEntry | undefined)
    req.onerror = () => reject(req.error ?? new Error('idb get failed'))
  })
}

async function idbPut(key: string, entry: ExpedientePreviewCacheEntry): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb tx failed'))
    tx.objectStore(STORE).put(entry, key)
  })
}

export type FetchExpedientePreviewWithCacheResult = {
  arrayBuffer: ArrayBuffer
  contentType: string | null
  etag: string | null
  /** true si el cuerpo salió de IndexedDB tras un 304 */
  fromClientCache: boolean
}

/**
 * GET con `If-None-Match` si hay entrada en IDB; persiste 200 + ETag.
 */
export async function fetchExpedientePreviewWithCache(
  url: string,
  init?: Omit<RequestInit, 'headers'> & {
    headers?: HeadersInit
    /** Si se define, se envía como Accept */
    accept?: string
  }
): Promise<FetchExpedientePreviewWithCacheResult> {
  const { accept, ...rest } = init ?? {}
  const headers = new Headers(rest.headers)
  if (accept) headers.set('Accept', accept)

  const useIdb = canUseIndexedDB()
  const cached = useIdb ? await idbGet(url).catch(() => undefined) : undefined
  if (cached?.etag) {
    headers.set('If-None-Match', cached.etag)
  }

  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: rest.credentials ?? 'include',
  })

  if (res.status === 304) {
    if (!cached?.body?.byteLength) {
      throw new Error('304 sin representación en caché local.')
    }
    return {
      arrayBuffer: cached.body.slice(0),
      contentType: cached.contentType || res.headers.get('Content-Type'),
      etag: cached.etag,
      fromClientCache: true,
    }
  }

  if (!res.ok) {
    const msg = res.status === 404 ? 'Documento no disponible.' : `Error ${res.status}`
    throw new Error(msg)
  }

  const arrayBuffer = await res.arrayBuffer()
  const etag = res.headers.get('ETag')
  const contentType = res.headers.get('Content-Type')

  if (useIdb && etag && arrayBuffer.byteLength > 0) {
    await idbPut(url, {
      etag,
      contentType: contentType ?? '',
      body: arrayBuffer.slice(0),
      savedAt: Date.now(),
    }).catch(() => {
      /* ignore quota / private mode */
    })
  }

  return {
    arrayBuffer,
    contentType,
    etag,
    fromClientCache: false,
  }
}
