'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useOffline } from '@/hooks/useOffline'

export interface UseLazyComponentOptions {
  threshold?: number // IntersectionObserver threshold
  rootMargin?: string // IntersectionObserver rootMargin
  triggerDistance?: number // Distance from viewport to trigger load (in pixels)
  preloadWhenOffline?: boolean // Whether to preload when offline
}

export function useLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: UseLazyComponentOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerDistance = 200,
    preloadWhenOffline = true,
  } = options

  const { isOffline } = useOffline()
  const [Component, setComponent] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const elementRef = useRef<HTMLElement>(null)

  // Load component
  const loadComponent = async () => {
    if (Component || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const module = await importFn()
      setComponent(() => module.default)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load component'))
    } finally {
      setIsLoading(false)
    }
  }

  // Intersection Observer for lazy loading
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          loadComponent()
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold, rootMargin])

  // Preload when offline if configured
  useEffect(() => {
    if (isOffline && preloadWhenOffline && !Component && !isLoading) {
      // Small delay to avoid loading too many components at once
      const timer = setTimeout(() => {
        loadComponent()
      }, Math.random() * 1000) // Random delay up to 1 second

      return () => clearTimeout(timer)
    }
    return undefined
  }, [isOffline, preloadWhenOffline, Component, isLoading])

  // Distance-based loading (alternative to intersection observer)
  useEffect(() => {
    if (!triggerDistance || Component || isLoading) return undefined

    const checkDistance = () => {
      const element = elementRef.current
      if (!element) return

      const rect = element.getBoundingClientRect()
      const distanceFromViewport = Math.min(
        Math.abs(rect.top),
        Math.abs(rect.bottom - window.innerHeight),
        Math.abs(rect.left),
        Math.abs(rect.right - window.innerWidth)
      )

      if (distanceFromViewport < triggerDistance) {
        loadComponent()
      }
    }

    const handleScroll = () => checkDistance()
    const handleResize = () => checkDistance()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    // Initial check
    checkDistance()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [triggerDistance, Component, isLoading])

  // Ref callback for setting the element ref
  const setRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element
  }, [])

  return {
    Component,
    isLoading,
    error,
    setRef,
    loadComponent,
  }
}