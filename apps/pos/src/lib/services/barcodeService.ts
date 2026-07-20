/**
 * Barcode scanning service
 * Supports keyboard input (USB scanners act as keyboards)
 * and camera-based scanning
 */

export interface BarcodeScanResult {
  code: string
  format?: string
  timestamp: Date
}

/**
 * Listen for barcode input from USB/Bluetooth scanners
 * Scanners typically send barcode followed by Enter key
 */
export class BarcodeScanner {
  private buffer: string = ''
  private timeout: NodeJS.Timeout | null = null
  private readonly TIMEOUT_MS = 100 // Timeout between keystrokes

  constructor(
    private onScan: (result: BarcodeScanResult) => void
  ) {}

  start(element: HTMLElement): void {
    element.addEventListener('keydown', this.handleKeyDown)
    element.setAttribute('tabindex', '0')
    element.focus()
  }

  stop(element: HTMLElement): void {
    element.removeEventListener('keydown', this.handleKeyDown)
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Clear timeout if exists
    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    // If Enter key, process barcode
    if (event.key === 'Enter' && this.buffer.length > 0) {
      event.preventDefault()
      this.processBarcode(this.buffer)
      this.buffer = ''
      return
    }

    // Ignore special keys
    if (event.key.length > 1 && event.key !== 'Enter') {
      return
    }

    // Add character to buffer
    this.buffer += event.key

    // Set timeout to clear buffer if no more input
    this.timeout = setTimeout(() => {
      this.buffer = ''
    }, this.TIMEOUT_MS)
  }

  private processBarcode(code: string): void {
    const result: BarcodeScanResult = {
      code: code.trim(),
      timestamp: new Date(),
    }

    // Detect barcode format (basic detection)
    if (/^\d{8,14}$/.test(code)) {
      result.format = 'EAN/UPC'
    } else if (/^[0-9A-Z]{8,}$/.test(code)) {
      result.format = 'CODE128'
    }

    this.onScan(result)
  }
}

/**
 * Camera-based barcode scanning using browser APIs
 * Requires user permission for camera access
 */
export async function scanBarcodeWithCamera(): Promise<BarcodeScanResult | null> {
  try {
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, // Use back camera on mobile
    })

    // Note: Full camera barcode scanning requires a library like:
    // - @zxing/library (Zebra Crossing)
    // - html5-qrcode
    // This is a placeholder for the implementation
    
    // For now, return null - full implementation would use a barcode library
    stream.getTracks().forEach(track => track.stop())
    
    return null
  } catch (error) {
    console.error('Camera access denied or failed:', error)
    return null
  }
}

