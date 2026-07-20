'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@hubilee/ui'
import {
  generateReceiptCommands,
  printReceiptViaSerial,
  printReceiptViaBrowser,
  type ReceiptData,
} from '@/lib/services/printerService'

interface PrintReceiptButtonProps {
  receiptData: ReceiptData
  onPrintComplete?: () => void
}

export function PrintReceiptButton({ receiptData, onPrintComplete }: PrintReceiptButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = async () => {
    setIsPrinting(true)

    try {
      // Generate ESC/POS commands
      const commands = generateReceiptCommands(receiptData, {
        cut: true,
        fontSize: 'medium',
      })

      // Try Web Serial API first (for USB thermal printers)
      if ('serial' in navigator) {
        const success = await printReceiptViaSerial(commands)
        if (success) {
          onPrintComplete?.()
          setIsPrinting(false)
          return
        }
      }

      // Fallback to browser print dialog
      const receiptHtml = generateReceiptHTML(receiptData)
      printReceiptViaBrowser(receiptHtml)
      onPrintComplete?.()
    } catch (error) {
      console.error('Print failed:', error)
      // Fallback to browser print
      const receiptHtml = generateReceiptHTML(receiptData)
      printReceiptViaBrowser(receiptHtml)
      onPrintComplete?.()
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <Button onClick={handlePrint} disabled={isPrinting} variant="outline">
      <Printer className="mr-2 h-4 w-4" />
      {isPrinting ? 'Printing...' : 'Print Receipt'}
    </Button>
  )
}

function generateReceiptHTML(data: ReceiptData): string {
  return `
    <div style="font-family: monospace; font-size: 12px; max-width: 80mm; margin: 0 auto; padding: 10mm;">
      <div style="text-align: center; font-weight: bold; margin-bottom: 10px;">
        ${data.storeName}
      </div>
      ${data.address ? `<div style="text-align: center; margin-bottom: 5px;">${data.address}</div>` : ''}
      ${data.phone ? `<div style="text-align: center; margin-bottom: 10px;">${data.phone}</div>` : ''}
      <hr style="border: none; border-top: 1px solid #000; margin: 10px 0;">
      <div style="margin-bottom: 10px;">
        <div>Invoice: ${data.invoiceNumber}</div>
        <div>Date: ${data.date}</div>
        ${data.customerName ? `<div>Customer: ${data.customerName}</div>` : ''}
      </div>
      <hr style="border: none; border-top: 1px solid #000; margin: 10px 0;">
      <div style="margin-bottom: 10px;">
        ${data.items.map(item => `
          <div style="margin-bottom: 5px;">
            <div>${item.name}</div>
            <div style="text-align: right;">${item.quantity} x ${item.price.toFixed(2)} = ${item.subtotal.toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
      <hr style="border: none; border-top: 1px solid #000; margin: 10px 0;">
      <div style="text-align: right; margin-bottom: 10px;">
        <div>Subtotal: ${data.subtotal.toFixed(2)}</div>
        ${data.tax > 0 ? `<div>Tax: ${data.tax.toFixed(2)}</div>` : ''}
        ${data.discount > 0 ? `<div>Discount: -${data.discount.toFixed(2)}</div>` : ''}
        <div style="font-weight: bold; margin-top: 5px;">TOTAL: ${data.total.toFixed(2)}</div>
      </div>
      <div style="margin-bottom: 10px;">
        Payment: ${data.paymentMethod}
      </div>
      <hr style="border: none; border-top: 1px solid #000; margin: 10px 0;">
      <div style="text-align: center; margin-top: 10px;">
        Thank you for your purchase!
      </div>
    </div>
  `
}

