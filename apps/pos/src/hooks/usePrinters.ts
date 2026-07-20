'use client'

import { useState, useEffect } from 'react'
import {
  getAvailablePrinters,
  getDefaultPrinter,
  setDefaultPrinter as saveDefaultPrinter,
  savePrinter,
  removePrinter as deletePrinter,
  detectAndSaveSerialPorts,
  testPrint,
  getUseConfiguredPrinter,
  setUseConfiguredPrinter,
  type PrinterInfo,
} from '@/lib/services/printers'
import { isWebSerialAvailable } from '@/lib/utils/printerDetection'

export function usePrinters() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [defaultPrinter, setDefaultPrinter] = useState<string | null>(null)
  const [useConfiguredPrinter, setUseConfiguredPrinterState] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionError, setDetectionError] = useState<string | null>(null)

  useEffect(() => {
    loadPrinters()
    setUseConfiguredPrinterState(getUseConfiguredPrinter())
  }, [])

  const loadPrinters = async () => {
    setIsLoading(true)
    setDetectionError(null)
    try {
      const availablePrinters = await getAvailablePrinters()
      setPrinters(availablePrinters)
      const defaultPrinterId = getDefaultPrinter()
      setDefaultPrinter(defaultPrinterId)
      return availablePrinters
    } catch (error) {
      console.error('Error loading printers:', error)
      setDetectionError('Error al cargar impresoras')
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const detectPrinters = async () => {
    setIsDetecting(true)
    setDetectionError(null)
    
    try {
      if (!isWebSerialAvailable()) {
        setDetectionError('Web Serial API no está disponible en este navegador. Solo funciona en Chrome/Edge con HTTPS.')
        return
      }

      const detectedPorts = await detectAndSaveSerialPorts()
      
      if (detectedPorts.length === 0) {
        setDetectionError('No se detectaron puertos serie. Asegúrate de seleccionar un puerto en el diálogo.')
        return
      }

      // Reload printers to show newly detected ones
      await loadPrinters()
    } catch (error) {
      console.error('Error detecting printers:', error)
      if (error instanceof Error) {
        if (error.name === 'NotFoundError' || error.message.includes('No port selected')) {
          setDetectionError('No se seleccionó ningún puerto. Por favor, intenta de nuevo.')
        } else {
          setDetectionError(error.message || 'Error al detectar impresoras')
        }
      } else {
        setDetectionError('Error desconocido al detectar impresoras')
      }
    } finally {
      setIsDetecting(false)
    }
  }

  const addPrinter = (printer: Omit<PrinterInfo, 'id' | 'isDefault' | 'detected'>) => {
    savePrinter(printer)
    loadPrinters()
  }

  const removePrinter = (printerId: string) => {
    deletePrinter(printerId)
    setPrinters((prev) => prev.filter((p) => p.id !== printerId))
    if (defaultPrinter === printerId) {
      setDefaultPrinter(null)
    }
  }

  const setDefault = (printerId: string) => {
    saveDefaultPrinter(printerId)
    setDefaultPrinter(printerId)
    setUseConfiguredPrinter(true)
    // Update printers to reflect default status
    setPrinters((prev) =>
      prev.map((p) => ({
        ...p,
        isDefault: p.id === printerId,
      }))
    )
  }

  const clearDefault = () => {
    saveDefaultPrinter('')
    setDefaultPrinter(null)
    setUseConfiguredPrinter(false)
    setPrinters((prev) => prev.map((p) => ({ ...p, isDefault: false })))
  }

  const setUseConfigured = (use: boolean) => {
    setUseConfiguredPrinter(use)
    setUseConfiguredPrinterState(use)
    if (!use) {
      clearDefault()
    }
  }

  return {
    printers,
    defaultPrinter,
    useConfiguredPrinter,
    isLoading,
    isDetecting,
    detectionError,
    canDetectSerial: isWebSerialAvailable(),
    addPrinter,
    removePrinter,
    setDefault,
    clearDefault,
    setUseConfigured,
    detectPrinters,
    testPrint,
    refresh: loadPrinters,
  }
}
