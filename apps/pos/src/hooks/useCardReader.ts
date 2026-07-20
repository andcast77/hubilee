'use client'

import { useEffect, useRef, useCallback } from 'react'
import { CardReader, type CardData } from '@/lib/services/cardReaderService'

export function useCardReader(
  onCardRead: (data: CardData) => void,
  enabled: boolean = true
) {
  const readerRef = useRef<CardReader | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)

  const handleCardRead = useCallback(
    (data: CardData) => {
      onCardRead(data)
    },
    [onCardRead]
  )

  useEffect(() => {
    if (!enabled || !elementRef.current) {
      return
    }

    readerRef.current = new CardReader(handleCardRead)
    readerRef.current.start(elementRef.current)

    return () => {
      if (readerRef.current && elementRef.current) {
        readerRef.current.stop(elementRef.current)
      }
    }
  }, [enabled, handleCardRead])

  return {
    ref: elementRef,
    reader: readerRef.current,
  }
}

