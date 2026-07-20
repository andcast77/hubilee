// Printing service for different printer types
import type { PrinterInfo } from './printers'
import type { TicketConfig } from '@/types'
import { getSavedSerialPorts } from './printers'
import { posApi } from '@/lib/api/client'
// openSerialPort, writeToSerialPort, closeSerialPort from printerDetection reserved for future serial write

/**
 * Generate ESC/POS commands for thermal printers
 */
export function generateESCPOSCommands(
  content: string,
  config: TicketConfig
): Uint8Array {
  const commands: number[] = []

  // Initialize printer
  commands.push(0x1B, 0x40) // ESC @ - Initialize

  // Set character size (if fontSize is configured)
  if (config.fontSize) {
    const size = Math.min(Math.max(config.fontSize, 8), 24)
    // ESC ! n - Select character size
    // n = 0x00 (normal) to 0x77 (double width and height)
    const sizeByte = size > 12 ? 0x11 : 0x00 // Simple size mapping
    commands.push(0x1B, 0x21, sizeByte)
  }

  // Center align
  commands.push(0x1B, 0x61, 0x01) // ESC a 1 - Center align

  // Add content (convert string to bytes)
  const contentBytes = new TextEncoder().encode(content)
  commands.push(...Array.from(contentBytes))

  // Line feed
  commands.push(0x0A) // LF

  // Cut paper
  commands.push(0x1D, 0x56, 0x41, 0x03) // GS V A 3 - Partial cut

  return new Uint8Array(commands)
}

/**
 * Print to standard printer using window.print()
 */
export async function printToStandardPrinter(
  content: string,
  ticketConfig: TicketConfig
): Promise<void> {
  return new Promise((resolve, reject) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      reject(new Error('No se pudo abrir la ventana de impresión'))
      return
    }

    const styles = `
      <style>
        @media print {
          @page {
            size: ${ticketConfig.ticketType === 'SHEET' ? 'auto' : 'auto'};
            margin: 0;
          }
          body {
            margin: 0;
            padding: 10mm;
            font-family: monospace;
            font-size: ${ticketConfig.fontSize || 12}px;
          }
        }
        body {
          font-family: monospace;
          font-size: ${ticketConfig.fontSize || 12}px;
          padding: 20px;
          max-width: ${getPaperWidth(ticketConfig)};
          margin: 0 auto;
        }
      </style>
    `

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket</title>
          ${styles}
        </head>
        <body>
          ${content}
        </body>
      </html>
    `)
    printWindow.document.close()

    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      
      // Close window after printing
      setTimeout(() => {
        printWindow.close()
        resolve()
      }, 250)
    }
  })
}

/**
 * Print to serial thermal printer
 */
export async function printToSerialPrinter(
  content: string,
  ticketConfig: TicketConfig,
  printer: PrinterInfo
): Promise<void> {
  if (!printer.connection?.portName) {
    throw new Error('Puerto serie no configurado para esta impresora')
  }

  // Get serial port from saved ports
  const savedPorts = getSavedSerialPorts()
  const portInfo = savedPorts.find((p) => p.name === printer.name)

  if (!portInfo) {
    throw new Error('Puerto serie no encontrado. Por favor, detecta la impresora nuevamente.')
  }

  // Note: Web Serial API requires user interaction to get port
  // We can't store the port object directly, so we need to request it again
  // For now, we'll use a simplified approach with window.print() for thermal too
  // In a full implementation, you'd need to request the port again or use a different approach

  // Generate ESC/POS commands (reserved for future serial write)
  generateESCPOSCommands(content, ticketConfig)

  // For now, fallback to standard print
  // In production, you'd open the serial port and write commands
  console.warn('Impresión serie requiere interacción del usuario. Usando impresión estándar.')
  return printToStandardPrinter(content, ticketConfig)
}

/**
 * Print to network printer
 */
export async function printToNetworkPrinter(
  content: string,
  ticketConfig: TicketConfig,
  printer: PrinterInfo
): Promise<void> {
  if (!printer.connection?.ip) {
    throw new Error('IP no configurada para esta impresora de red')
  }

  const ip = printer.connection.ip
  const port = printer.connection.port || 9100

  // Generate ESC/POS commands for network printer
  const commands = generateESCPOSCommands(content, ticketConfig)

  try {
    await posApi.post('/printers/network-print', {
        ip,
        port,
        data: Array.from(commands),
    })
  } catch (error) {
    console.error('Error printing to network printer:', error)
    throw error
  }
}

/**
 * Get paper width in CSS units based on ticket type
 */
function getPaperWidth(config: TicketConfig): string {
  if (config.ticketType === 'TICKET') {
    // Use thermalWidth for thermal tickets
    const thermalWidth = (config as any).thermalWidth || 80
    return `${thermalWidth}mm`
  } else if (config.ticketType === 'SHEET') {
    // For sheet printers, let the printer decide the size
    return 'auto'
  }
  return 'auto'
}

/**
 * Main print function that routes to appropriate printer type
 */
export async function printTicket(
  content: string,
  ticketConfig: TicketConfig,
  printer?: PrinterInfo
): Promise<void> {
  // If no printer specified, use standard print
  if (!printer) {
    return printToStandardPrinter(content, ticketConfig)
  }

  switch (printer.type) {
    case 'STANDARD':
      return printToStandardPrinter(content, ticketConfig)
    case 'SERIAL':
      return printToSerialPrinter(content, ticketConfig, printer)
    case 'NETWORK':
      return printToNetworkPrinter(content, ticketConfig, printer)
    case 'USB':
      // USB printers typically work as standard printers
      return printToStandardPrinter(content, ticketConfig)
    default:
      return printToStandardPrinter(content, ticketConfig)
  }
}
