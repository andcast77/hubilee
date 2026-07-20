import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSelectedRegisterId } from '@/hooks/useSelectedRegister'

// FIX 1 (pos-cash-session): the operator's register selection must persist per store
// (localStorage) so a reload of the POS/caja screen doesn't lose which caja they're on.

afterEach(() => {
  window.localStorage.clear()
})

describe('useSelectedRegisterId', () => {
  it('starts with no selection and persists a selection to localStorage, scoped to the store', () => {
    const { result } = renderHook(() => useSelectedRegisterId('store-1'))
    expect(result.current[0]).toBeNull()

    act(() => {
      result.current[1]('register-A')
    })

    expect(result.current[0]).toBe('register-A')
    expect(window.localStorage.getItem('pos.selectedRegisterId.store-1')).toBe('register-A')
  })

  it('reads a previously persisted selection for the store on mount', () => {
    window.localStorage.setItem('pos.selectedRegisterId.store-2', 'register-B')

    const { result } = renderHook(() => useSelectedRegisterId('store-2'))

    expect(result.current[0]).toBe('register-B')
  })

  it('does not leak a selection from one store into another', () => {
    window.localStorage.setItem('pos.selectedRegisterId.store-1', 'register-A')

    const { result } = renderHook(() => useSelectedRegisterId('store-2'))

    expect(result.current[0]).toBeNull()
  })
})
