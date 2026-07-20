'use client'

import { useState, useEffect, useMemo } from 'react'
import { useOffline } from '@/hooks/useOffline'

export interface UseDebouncedSearchOptions {
  debounceMs?: number
  minQueryLength?: number
  caseSensitive?: boolean
}

export function useDebouncedSearch<T>(
  items: T[],
  searchFn: (item: T, query: string) => boolean,
  options: UseDebouncedSearchOptions = {}
) {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    caseSensitive = false,
  } = options

  const { isOffline } = useOffline()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  // Perform search
  const results = useMemo(() => {
    if (debouncedQuery.length < minQueryLength) {
      return items
    }

    setIsSearching(true)

    const searchQuery = caseSensitive ? debouncedQuery : debouncedQuery.toLowerCase()

    const filtered = items.filter(item => {
      try {
        return searchFn(item, searchQuery)
      } catch (error) {
        console.warn('Search function error:', error)
        return false
      }
    })

    setIsSearching(false)
    return filtered
  }, [items, debouncedQuery, minQueryLength, searchFn, caseSensitive])

  // Offline optimization: reduce debounce time for better responsiveness
  const effectiveDebounceMs = isOffline ? Math.max(debounceMs * 0.5, 100) : debounceMs

  const searchStats = useMemo(() => ({
    totalItems: items.length,
    filteredItems: results.length,
    hasQuery: debouncedQuery.length >= minQueryLength,
    isSearching,
  }), [items.length, results.length, debouncedQuery.length, minQueryLength, isSearching])

  return {
    query,
    setQuery,
    results,
    isSearching,
    searchStats,
    effectiveDebounceMs,
  }
}