// Printer service for local printer management
// Uses browser APIs and localStorage (no backend needed)

import type { DetectedPrinter, PrinterType } from '@/lib/utils/printerDetection'
import { detectSerialPorts } from '@/lib/utils/printerDetection'
import { toast } from 'sonner'

export type { DetectedPrinter }

const DEFAULT_PRINTER_KEY = 'defaultPrinter'
const SAVED_PRINTERS_KEY = 'savedPrinters'
const SERIAL_PORTS_KEY = 'serialPorts'

export interface PrinterInfo {
  id: string
  name: string
  type: PrinterType
  connection?: {
    portName?: string
    ip?: string
    port?: number
  }
  description?: string
  isDefault: boolean
  detected: boolean
}

/**
 * Get list of available printers from the browser
 * Combines detected printers (serial ports) with manually saved printers
 */
export async function getAvailablePrinters(): Promise<PrinterInfo[]> {
  const savedPrinters = getSavedPrinters()
  const serialPorts = getSavedSerialPorts()
  
  // Combine saved printers with serial ports
  const allPrinters: PrinterInfo[] = [
    ...savedPrinters,
    ...serialPorts.map((port) => ({
      id: port.id,
      name: port.name,
      type: 'SERIAL' as PrinterType,
      connection: port.connection,
      description: port.description || 'Puerto serie',
      isDefault: false,
      detected: true,
    })),
  ]

  // Mark default printer
  const defaultPrinterName = getDefaultPrinter()
  if (defaultPrinterName) {
    allPrinters.forEach((p) => {
      if (p.name === defaultPrinterName || p.id === defaultPrinterName) {
        p.isDefault = true
      }
    })
  }

  return allPrinters
}

/**
 * Get saved printers from localStorage (manually added)
 */
export function getSavedPrinters(): PrinterInfo[] {
  if (typeof window === 'undefined') return []
  
  const saved = localStorage.getItem(SAVED_PRINTERS_KEY)
  if (!saved) return []
  
  try {
    return JSON.parse(saved) as PrinterInfo[]
  } catch {
    return []
  }
}

/**
 * Get saved serial ports from localStorage
 */
export function getSavedSerialPorts(): DetectedPrinter[] {
  if (typeof window === 'undefined') return []
  
  const saved = localStorage.getItem(SERIAL_PORTS_KEY)
  if (!saved) return []
  
  try {
    return JSON.parse(saved) as DetectedPrinter[]
  } catch {
    return []
  }
}

/**
 * Save a printer to the list (manually added)
 */
export function savePrinter(printer: Omit<PrinterInfo, 'id' | 'isDefault' | 'detected'>): void {
  if (typeof window === 'undefined') return
  
  const printers = getSavedPrinters()
  const newPrinter: PrinterInfo = {
    ...printer,
    id: `manual-${Date.now()}`,
    isDefault: false,
    detected: false,
  }
  
  const exists = printers.find((p) => p.id === newPrinter.id || p.name === newPrinter.name)
  
  if (!exists) {
    printers.push(newPrinter)
    localStorage.setItem(SAVED_PRINTERS_KEY, JSON.stringify(printers))
  }
}

/**
 * Save detected serial port
 */
export function saveSerialPort(port: DetectedPrinter): void {
  if (typeof window === 'undefined') return
  
  const ports = getSavedSerialPorts()
  const exists = ports.find((p) => p.id === port.id || p.name === port.name)
  
  if (!exists) {
    ports.push(port)
    localStorage.setItem(SERIAL_PORTS_KEY, JSON.stringify(ports))
  }
}

/**
 * Remove a printer from the list
 */
export function removePrinter(printerId: string): void {
  if (typeof window === 'undefined') return
  
  // Remove from saved printers
  const printers = getSavedPrinters()
  const filteredPrinters = printers.filter((p) => p.id !== printerId)
  localStorage.setItem(SAVED_PRINTERS_KEY, JSON.stringify(filteredPrinters))
  
  // Remove from serial ports
  const ports = getSavedSerialPorts()
  const filteredPorts = ports.filter((p) => p.id !== printerId)
  localStorage.setItem(SERIAL_PORTS_KEY, JSON.stringify(filteredPorts))
  
  // If it was the default, clear default
  const defaultPrinter = getDefaultPrinter()
  if (defaultPrinter === printerId) {
    clearDefaultPrinter()
  }
}

/**
 * Get default printer ID from localStorage
 */
export function getDefaultPrinter(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(DEFAULT_PRINTER_KEY)
}

/**
 * Set default printer by ID
 */
export function setDefaultPrinter(printerId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEFAULT_PRINTER_KEY, printerId)
  // Also save preference to use configured printer
  localStorage.setItem('useConfiguredPrinter', 'true')
}

/**
 * Get preference to use configured printer
 */
export function getUseConfiguredPrinter(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('useConfiguredPrinter') === 'true'
}

/**
 * Set preference to use configured printer
 */
export function setUseConfiguredPrinter(use: boolean): void {
  if (typeof window === 'undefined') return
  if (use) {
    localStorage.setItem('useConfiguredPrinter', 'true')
  } else {
    localStorage.removeItem('useConfiguredPrinter')
    clearDefaultPrinter()
  }
}

/**
 * Clear default printer
 */
export function clearDefaultPrinter(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DEFAULT_PRINTER_KEY)
}

/**
 * Detect serial ports using Web Serial API
 * Requires user interaction (permission request)
 */
export async function detectAndSaveSerialPorts(): Promise<DetectedPrinter[]> {
  const detectedPorts = await detectSerialPorts()
  
  // Save detected ports
  detectedPorts.forEach((port) => {
    saveSerialPort(port)
  })
  
  return detectedPorts
}

/**
 * Test print (opens browser print dialog)
 */
export function testPrint(content: string): void {
  if (typeof window === 'undefined') return
  
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    toast.error('No se pudo abrir la ventana de impresión. Por favor, permite ventanas emergentes.')
    return
  }
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Test Print</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}
