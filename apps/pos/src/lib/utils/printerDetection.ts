// Printer detection utilities using browser APIs
// Web Serial API type (optional; not available in all environments)
export interface SerialPort {
  getInfo(): { path?: string; usbVendorId?: number; usbProductId?: number }
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable?: ReadableStream
  writable?: WritableStream
}

export type PrinterType = 'STANDARD' | 'SERIAL' | 'USB' | 'NETWORK'

export interface DetectedPrinter {
  id: string
  name: string
  type: PrinterType
  connection?: {
    // For SERIAL
    portName?: string
    // For NETWORK
    ip?: string
    port?: number
  }
  description?: string
  detected: boolean
}

/**
 * Check if Web Serial API is available
 */
export function isWebSerialAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return 'serial' in navigator
}

/**
 * Check if WebUSB API is available
 */
export function isWebUSBAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return 'usb' in navigator
}

/**
 * Check if Print API is available (always true in modern browsers)
 */
export function isPrintAPIAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return typeof window.print === 'function'
}

/**
 * Request permission and list available serial ports
 */
export async function detectSerialPorts(): Promise<DetectedPrinter[]> {
  if (!isWebSerialAvailable()) {
    return []
  }

  try {
    // Request port access
    const port = await (navigator as any).serial.requestPort()
    
    if (!port) {
      return []
    }

    // Get port info
    const portInfo = port.getInfo()
    const portName = portInfo.usbVendorId && portInfo.usbProductId
      ? `USB Serial (Vendor: ${portInfo.usbVendorId}, Product: ${portInfo.usbProductId})`
      : portInfo.path || 'Serial Port'

    return [
      {
        id: `serial-${Date.now()}`,
        name: portName,
        type: 'SERIAL',
        connection: {
          portName: portInfo.path || portName,
        },
        description: 'Puerto serie detectado',
        detected: true,
      },
    ]
  } catch (error) {
    // User cancelled or permission denied
    if (error instanceof Error && error.name === 'NotFoundError') {
      return []
    }
    console.error('Error detecting serial ports:', error)
    return []
  }
}

/**
 * Get list of previously granted serial ports
 * Note: Web Serial API doesn't provide a way to list ports without user interaction
 * This function returns empty array - ports must be selected via requestPort()
 */
export async function getGrantedSerialPorts(): Promise<DetectedPrinter[]> {
  // Web Serial API doesn't support listing ports without user interaction
  // We can only request a port when user clicks
  return []
}

/**
 * Detect printers using available browser APIs
 */
export async function detectPrinters(): Promise<DetectedPrinter[]> {
  const printers: DetectedPrinter[] = []

  // Try to detect serial ports if available
  if (isWebSerialAvailable()) {
    // Note: We can't auto-detect without user interaction
    // This will be triggered by user clicking "Detectar Impresoras"
  }

  // Print API is always available but doesn't allow enumeration
  // We'll use it when printing, not for detection

  return printers
}

/**
 * Get printer info from serial port
 */
export async function getSerialPortInfo(port: SerialPort): Promise<{
  name: string
  vendorId?: number
  productId?: number
}> {
  const info = port.getInfo()
  const name = info.path || `Serial Port (Vendor: ${info.usbVendorId}, Product: ${info.usbProductId})`
  
  return {
    name,
    vendorId: info.usbVendorId,
    productId: info.usbProductId,
  }
}

/**
 * Open and configure serial port for printing
 */
export async function openSerialPort(
  port: SerialPort,
  baudRate = 9600
): Promise<void> {
  await port.open({ baudRate })
}

/**
 * Write data to serial port
 */
export async function writeToSerialPort(
  port: SerialPort,
  data: Uint8Array
): Promise<void> {
  const writer = port.writable?.getWriter()
  if (!writer) {
    throw new Error('Port is not writable')
  }

  try {
    await writer.write(data)
  } finally {
    writer.releaseLock()
  }
}

/**
 * Close serial port
 */
export async function closeSerialPort(port: SerialPort): Promise<void> {
  if (port.readable || port.writable) {
    await port.close()
  }
}
