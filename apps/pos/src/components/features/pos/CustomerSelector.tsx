'use client'

import { useState, useEffect, useRef } from 'react'
import { useCustomers } from '@/hooks/useCustomers'
import { useCartStore } from '@/store/cartStore'
import { useCustomer } from '@/hooks/useCustomers'
import { Input } from '@hubilee/ui'
import { Button } from '@hubilee/ui'
import { User, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 300

export function CustomerSelector() {
  const customerId = useCartStore((state) => state.customerId)
  const setCustomer = useCartStore((state) => state.setCustomer)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [search])

  const { data: customersResponse, isLoading } = useCustomers(
    debouncedSearch.length >= 2 ? { search: debouncedSearch } : undefined
  )
  const { data: selectedCustomer } = useCustomer(customerId || '')

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const list = (customersResponse?.customers ?? []) as Array<{
    id: string
    name: string
    email?: string | null
    phone?: string | null
  }>
  const showList = open && (search.length >= 2 || list.length > 0)

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        Cliente
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar cliente por nombre o identificación..."
            value={customerId && selectedCustomer ? selectedCustomer.name : search}
            onChange={(e) => {
              if (customerId && selectedCustomer) {
                setCustomer(null)
                setSearch('')
              }
              setSearch(e.target.value)
              if (!e.target.value) setCustomer(null)
              setOpen(true)
            }}
            onFocus={() => {
              if (customerId && selectedCustomer) {
                setCustomer(null)
                setSearch('')
              }
              setOpen(true)
            }}
            onClick={() => {
              if (customerId && selectedCustomer) {
                setCustomer(null)
                setSearch('')
              }
              setOpen(true)
            }}
            className="pl-9"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            data-form-type="other"
          />
          {showList && (
            <ul
              className={cn(
                'absolute z-50 mt-1 w-full rounded-md border bg-popover py-1 shadow-md',
                'max-h-48 overflow-auto'
              )}
            >
              {!customerId && (
                <li>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setCustomer(null)
                      setSearch('')
                      setOpen(false)
                    }}
                  >
                    <span className="text-muted-foreground">Sin cliente</span>
                  </button>
                </li>
              )}
              {isLoading && search.length >= 2 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">Buscando...</li>
              )}
              {!isLoading && list.length === 0 && debouncedSearch.length >= 2 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
              )}
              {list.slice(0, 8).map((c: { id: string; name: string; email?: string | null; phone?: string | null }) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent truncate"
                    onClick={() => {
                      setCustomer(c.id)
                      setSearch('')
                      setOpen(false)
                    }}
                  >
                    <span className="font-medium">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {customerId && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => {
              setCustomer(null)
              setSearch('')
              setOpen(false)
            }}
            title="Quitar cliente"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
