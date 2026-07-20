'use client'

import { useState, useRef } from 'react'
import { useTicketConfig } from '@/hooks/useTicketConfig'
import { usePrinters } from '@/hooks/usePrinters'
import { TicketPrintTemplate } from '@/components/features/pos/TicketPrintTemplate'
import { SheetPrintTemplate } from '@/components/features/pos/SheetPrintTemplate'
import { Button } from '@hubilee/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hubilee/ui'
import { Label } from '@hubilee/ui'
import { useReactToPrint } from 'react-to-print'
import { Printer, FileText } from 'lucide-react'
import { SaleStatus, PaymentMethod, TicketType } from '@/types'
import type { Sale, SaleItem, Product, Customer } from '@/types'

// Datos de prueba para la venta
const mockSale: Sale & {
  items: Array<SaleItem & { product: Product }>
  customer: Customer | null
} = {
  id: 'test-sale-001',
  invoiceNumber: 'FAC-2026-0001',
  customerId: 'test-customer-001',
  userId: 'test-user-001',
  status: SaleStatus.COMPLETED,
  subtotal: 150.00,
  tax: 18.00,
  discount: 10.00,
  total: 158.00,
  paymentMethod: PaymentMethod.CASH,
  paidAmount: 200.00,
  change: 42.00,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'item-001',
      saleId: 'test-sale-001',
      productId: 'prod-001',
      quantity: 2,
      price: 50.00,
      discount: 0,
      subtotal: 100.00,
      createdAt: new Date(),
      updatedAt: new Date(),
      product: {
        id: 'prod-001',
        name: 'Producto de Prueba 1',
        description: 'Descripción del producto de prueba',
        sku: 'SKU-001',
        barcode: '1234567890123',
        price: 50.00,
        cost: 30.00,
        stock: 100,
        minStock: 10,
        categoryId: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'item-002',
      saleId: 'test-sale-001',
      productId: 'prod-002',
      quantity: 1,
      price: 50.00,
      discount: 10.00,
      subtotal: 40.00,
      createdAt: new Date(),
      updatedAt: new Date(),
      product: {
        id: 'prod-002',
        name: 'Producto de Prueba 2',
        description: 'Otro producto de prueba',
        sku: 'SKU-002',
        barcode: '1234567890124',
        price: 50.00,
        cost: 35.00,
        stock: 50,
        minStock: 5,
        categoryId: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
  customer: {
    id: 'test-customer-001',
    name: 'Cliente de Prueba',
    email: 'cliente@prueba.com',
    phone: '+1234567890',
    address: 'Calle Principal 123',
    city: 'Ciudad de Prueba',
    state: 'Estado de Prueba',
    postalCode: '12345',
    country: 'País de Prueba',
    loyaltyPoints: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

export function PrintTestSection() {
  const { data: ticketConfig } = useTicketConfig()
  const { printers, defaultPrinter } = usePrinters()
  const [selectedType, setSelectedType] = useState<TicketType>(TicketType.TICKET)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Prueba-${selectedType}-${mockSale.invoiceNumber}`,
  })

  if (!ticketConfig) {
    return null
  }

  // Crear una configuración temporal basada en la selección
  const testConfig: typeof ticketConfig = {
    ...ticketConfig,
    ticketType: selectedType,
  }

  return (
    <div className="border-t pt-8 mt-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Prueba de Impresión</h3>
        <p className="text-sm text-gray-600">
          Prueba los diferentes formatos de impresión con datos de ejemplo
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="printType">Tipo de Impresión</Label>
          <Select
            value={selectedType}
            onValueChange={(value) => setSelectedType(value as TicketType)}
          >
            <SelectTrigger id="printType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TicketType.TICKET}>Ticket (Impresora Térmica)</SelectItem>
              <SelectItem value={TicketType.SHEET}>Hoja (Impresora Estándar)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4">
          <Button onClick={handlePrint} size="lg" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            size="lg"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Vista Previa del Sistema
          </Button>
        </div>

        {defaultPrinter && (
          <div className="text-sm text-gray-600">
            <strong>Impresora por defecto:</strong>{' '}
            {printers.find((p) => p.id === defaultPrinter)?.name || 'No configurada'}
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <div ref={printRef} className="print:bg-white">
          {selectedType === TicketType.TICKET ? (
            <TicketPrintTemplate sale={mockSale} config={testConfig} />
          ) : (
            <SheetPrintTemplate sale={mockSale} config={testConfig} />
          )}
        </div>
      </div>
    </div>
  )
}
