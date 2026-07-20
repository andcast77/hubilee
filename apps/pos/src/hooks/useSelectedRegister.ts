import { useEffect, useState } from 'react'

const STORAGE_KEY_PREFIX = 'pos.selectedRegisterId.'

function readStoredRegisterId(storeId: string | null | undefined): string | null {
  if (!storeId || typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${storeId}`)
  } catch {
    return null
  }
}

/**
 * Persists the operator's selected register (caja) per store (FIX 1 — a store can have
 * multiple registers; checkout/settlement must bind to the register the operator is
 * physically standing at, not "the first/most-recent one"). Persisted in localStorage so
 * the choice survives a reload of the POS/caja screen.
 */
export function useSelectedRegisterId(storeId: string | null | undefined): [string | null, (id: string | null) => void] {
  const [registerId, setRegisterIdState] = useState<string | null>(() => readStoredRegisterId(storeId))

  // Re-read from storage whenever the active store changes (switching stores must not keep
  // a register selection that belongs to a different store).
  useEffect(() => {
    setRegisterIdState(readStoredRegisterId(storeId))
  }, [storeId])

  const setRegisterId = (id: string | null) => {
    setRegisterIdState(id)
    if (!storeId || typeof window === 'undefined') return
    try {
      if (id) window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${storeId}`, id)
      else window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${storeId}`)
    } catch {
      // Best-effort persistence; selection still works in-memory for this session.
    }
  }

  return [registerId, setRegisterId]
}
