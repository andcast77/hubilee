/**
 * Thermal printer service
 * Supports ESC/POS commands for thermal printers
 */

export interface PrintOptions {
  width?: number // Paper width in mm (default: 80mm)
  fontSize?: 'small' | 'medium' | 'large'
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  cut?: boolean // Auto-cut after printing
}

export interface ReceiptData {
  storeName: string
  address?: string
  phone?: string
  invoiceNumber: string
  date: string
  items: Array<{
    name: string
    quantity: number
    price: number
    subtotal: number
  }>
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: string
  customerName?: string
}

/**
 * ESC/POS command constants
 */
const ESC = '\x1B'
const GS = '\x1D'

const ESCPOS_COMMANDS = {
  INIT: ESC + '@',
  CUT: GS + 'V' + '\x41' + '\x03', // Full cut
  FEED: '\n',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  FONT_SMALL: ESC + '!' + '\x00',
  FONT_MEDIUM: ESC + '!' + '\x10',
  FONT_LARGE: ESC + '!' + '\x20',
}

/**
 * Generate ESC/POS commands for receipt
 */
export function generateReceiptCommands(data: ReceiptData, options: PrintOptions = {}): string {
  const {
    fontSize = 'medium',
    align = 'center',
    bold = false,
    cut = true,
  } = options

  let commands = ESCPOS_COMMANDS.INIT

  // Set font size
  if (fontSize === 'small') {
    commands += ESCPOS_COMMANDS.FONT_SMALL
  } else if (fontSize === 'large') {
    commands += ESCPOS_COMMANDS.FONT_LARGE
  } else {
    commands += ESCPOS_COMMANDS.FONT_MEDIUM
  }

  // Header
  if (align === 'left') {
    commands += ESCPOS_COMMANDS.ALIGN_LEFT
  } else if (align === 'right') {
    commands += ESCPOS_COMMANDS.ALIGN_RIGHT
  } else {
    commands += ESCPOS_COMMANDS.ALIGN_CENTER
  }
  if (bold) commands += ESCPOS_COMMANDS.BOLD_ON
  commands += data.storeName + ESCPOS_COMMANDS.FEED
  
  if (data.address) {
    commands += data.address + ESCPOS_COMMANDS.FEED
  }
  if (data.phone) {
    commands += data.phone + ESCPOS_COMMANDS.FEED
  }
  
  commands += ESCPOS_COMMANDS.FEED
  if (bold) commands += ESCPOS_COMMANDS.BOLD_OFF

  // Invoice info
  commands += ESCPOS_COMMANDS.ALIGN_LEFT
  commands += `Invoice: ${data.invoiceNumber}` + ESCPOS_COMMANDS.FEED
  commands += `Date: ${data.date}` + ESCPOS_COMMANDS.FEED
  if (data.customerName) {
    commands += `Customer: ${data.customerName}` + ESCPOS_COMMANDS.FEED
  }
  commands += ESCPOS_COMMANDS.FEED
  commands += '--------------------------------' + ESCPOS_COMMANDS.FEED

  // Items
  commands += ESCPOS_COMMANDS.ALIGN_LEFT
  for (const item of data.items) {
    const name = item.name.substring(0, 30) // Truncate long names
    const qty = item.quantity.toString()
    const price = item.price.toFixed(2)
    const subtotal = item.subtotal.toFixed(2)
    
    commands += `${name}` + ESCPOS_COMMANDS.FEED
    commands += `  ${qty} x ${price} = ${subtotal}` + ESCPOS_COMMANDS.FEED
  }

  commands += ESCPOS_COMMANDS.FEED
  commands += '--------------------------------' + ESCPOS_COMMANDS.FEED

  // Totals
  if (align === 'left') {
    commands += ESCPOS_COMMANDS.ALIGN_LEFT
  } else if (align === 'right') {
    commands += ESCPOS_COMMANDS.ALIGN_RIGHT
  } else {
    commands += ESCPOS_COMMANDS.ALIGN_RIGHT
  }
  commands += `Subtotal: ${data.subtotal.toFixed(2)}` + ESCPOS_COMMANDS.FEED
  if (data.tax > 0) {
    commands += `Tax: ${data.tax.toFixed(2)}` + ESCPOS_COMMANDS.FEED
  }
  if (data.discount > 0) {
    commands += `Discount: -${data.discount.toFixed(2)}` + ESCPOS_COMMANDS.FEED
  }
  commands += ESCPOS_COMMANDS.BOLD_ON
  commands += `TOTAL: ${data.total.toFixed(2)}` + ESCPOS_COMMANDS.FEED
  commands += ESCPOS_COMMANDS.BOLD_OFF

  commands += ESCPOS_COMMANDS.FEED
  commands += `Payment: ${data.paymentMethod}` + ESCPOS_COMMANDS.FEED
  commands += ESCPOS_COMMANDS.FEED
  commands += ESCPOS_COMMANDS.FEED

  // Footer
  if (align === 'left') {
    commands += ESCPOS_COMMANDS.ALIGN_LEFT
  } else if (align === 'right') {
    commands += ESCPOS_COMMANDS.ALIGN_RIGHT
  } else {
    commands += ESCPOS_COMMANDS.ALIGN_CENTER
  }
  commands += 'Thank you for your purchase!' + ESCPOS_COMMANDS.FEED
  commands += ESCPOS_COMMANDS.FEED

  if (cut) {
    commands += ESCPOS_COMMANDS.CUT
  }

  return commands
}

/**
 * Print receipt using Web Serial API (for USB thermal printers)
 */
export async function printReceiptViaSerial(
  commands: string
): Promise<boolean> {
  try {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported')
    }

    // Request port access
    const serial = (navigator as unknown as { serial?: { requestPort: () => Promise<{ open: (options: { baudRate: number }) => Promise<void>, writable: WritableStream<Uint8Array> | null, close: () => Promise<void> }> } }).serial
    if (!serial) {
      throw new Error('Web Serial API not available')
    }
    
    const port = await serial.requestPort()
    
    // Open port with baud rate 9600 (common for thermal printers)
    await port.open({ baudRate: 9600 })

    const writer = port.writable?.getWriter()
    if (!writer) {
      throw new Error('Could not get writer')
    }

    // Send commands
    const encoder = new TextEncoder()
    await writer.write(encoder.encode(commands))

    // Close writer and port
    writer.releaseLock()
    await port.close()

    return true
  } catch (error) {
    console.error('Failed to print via serial:', error)
    return false
  }
}

/**
 * Print receipt using WebUSB API (alternative for USB printers)
 */
export async function printReceiptViaUSB(
  _commands: string
): Promise<boolean> {
  try {
    if (!('usb' in navigator)) {
      throw new Error('WebUSB API not supported')
    }

    // Note: WebUSB requires vendor/product IDs and specific protocol
    // This is a placeholder - actual implementation depends on printer model
    // The commands parameter would be used to send ESC/POS commands via USB
    console.warn('WebUSB printing not fully implemented')
    return false
  } catch (error) {
    console.error('Failed to print via USB:', error)
    return false
  }
}

/**
 * Print receipt to browser print dialog (fallback)
 */
export function printReceiptViaBrowser(receiptHtml: string): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Could not open print window')
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt</title>
        <style>
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; padding: 10mm; font-family: monospace; font-size: 12px; }
          }
        </style>
      </head>
      <body>
        ${receiptHtml}
      </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}

