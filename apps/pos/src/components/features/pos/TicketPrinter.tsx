'use client'

import { useRef, useEffect, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { usePrinters } from '@/hooks/usePrinters'
import { useTicketConfig } from '@/hooks/useTicketConfig'
import { TicketPrintTemplate } from './TicketPrintTemplate'
import { SheetPrintTemplate } from './SheetPrintTemplate'
import type { Sale, SaleItem, Product, Customer } from '@/types'

interface SaleWithRelations extends Sale {
  items: Array<SaleItem & { product: Product }>
  customer: Customer | null
}

interface TicketPrinterProps {
  sale: SaleWithRelations
  onPrintComplete?: () => void
}

export function TicketPrinter({
  sale,
  onPrintComplete,
}: TicketPrinterProps) {
  const componentRef = useRef<HTMLDivElement>(null)
  const { data: ticketConfig } = useTicketConfig()
  const { printers, defaultPrinter } = usePrinters()
  const [isPrinting, setIsPrinting] = useState(false)

  const defaultPrinterObj = printers.find((p) => p.id === defaultPrinter)

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    onAfterPrint: onPrintComplete,
    documentTitle: `Ticket-${sale.invoiceNumber || sale.id}`,
  })

  const handleAdvancedPrint = async () => {
    if (!ticketConfig) return

    setIsPrinting(true)
    try {
      // For advanced printing, we'll use the standard print dialog
      // The actual ESC/POS or network printing will be handled by the printing service
      handlePrint()
    } catch (error) {
      console.error('Error printing ticket:', error)
      // Fallback to standard print
      handlePrint()
    } finally {
      setIsPrinting(false)
    }
  }

  // Auto print if configured
  useEffect(() => {
    if (ticketConfig?.autoPrint && !isPrinting && sale) {
      const timer = setTimeout(() => {
        // If no configured printer or preference is to use dialog, just open print dialog
        if (!defaultPrinter || !defaultPrinterObj) {
          handlePrint()
        } else if (defaultPrinterObj.type !== 'STANDARD') {
          handleAdvancedPrint()
        } else {
          handlePrint()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [ticketConfig?.autoPrint, sale.id, defaultPrinter])

  if (!ticketConfig) {
    return null
  }

  // Render the appropriate template based on ticket type
  const renderTemplate = () => {
    if (ticketConfig.ticketType === 'TICKET') {
      return <TicketPrintTemplate sale={sale} config={ticketConfig} />
    } else {
      return <SheetPrintTemplate sale={sale} config={ticketConfig} />
    }
  }

  return (
    <div className="hidden">
      <div ref={componentRef}>{renderTemplate()}</div>
    </div>
  )
}
