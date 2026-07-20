'use client'

import { useEffect, useRef, useCallback } from 'react'
import { BarcodeScanner, type BarcodeScanResult } from '@/lib/services/barcodeService'

export function useBarcodeScanner(
  onScan: (result: BarcodeScanResult) => void,
  enabled: boolean = true
) {
  const scannerRef = useRef<BarcodeScanner | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)

  const handleScan = useCallback(
    (result: BarcodeScanResult) => {
      onScan(result)
    },
    [onScan]
  )

  useEffect(() => {
    if (!enabled || !elementRef.current) {
      return
    }

    scannerRef.current = new BarcodeScanner(handleScan)
    scannerRef.current.start(elementRef.current)

    return () => {
      if (scannerRef.current && elementRef.current) {
        scannerRef.current.stop(elementRef.current)
      }
    }
  }, [enabled, handleScan])

  return {
    ref: elementRef,
    scanner: scannerRef.current,
  }
}

