'use client'

import type { Sale, SaleItem, Product, Customer, TicketConfig } from '@/types'

interface SaleWithRelations extends Sale {
  items: Array<SaleItem & { product: Product }>
  customer: Customer | null
}

interface SheetPrintTemplateProps {
  sale: SaleWithRelations
  config: TicketConfig
}

export function SheetPrintTemplate({ sale, config }: SheetPrintTemplateProps) {
  const fontSize = config.fontSize || 12

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: `${fontSize}px`,
        padding: '40px',
        maxWidth: '210mm',
        margin: '0 auto',
        backgroundColor: 'white',
      }}
      className="bg-white"
    >
      {/* Logo */}
      {config.logoUrl && (
        <div className="mb-6 text-center">
          <img
            src={config.logoUrl}
            alt="Logo"
            style={{ maxHeight: '100px', maxWidth: '200px' }}
          />
        </div>
      )}

      {/* Header */}
      {config.header && (
        <div className="mb-6 text-center whitespace-pre-line text-lg font-bold">
          {config.header}
        </div>
      )}

      {/* Separator */}
      <div className="border-t-2 border-b-2 border-gray-800 py-4 my-6">
        {/* Sale Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-semibold">Factura:</span>
            <span className="font-bold text-lg">{sale.invoiceNumber || sale.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Fecha:</span>
            <span>{new Date(sale.createdAt).toLocaleString('es-ES', { 
              dateStyle: 'long', 
              timeStyle: 'short' 
            })}</span>
          </div>
          {sale.customer && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <div className="font-semibold mb-2">Cliente:</div>
              <div className="space-y-1 text-sm">
                <div>{sale.customer.name}</div>
                {sale.customer.email && <div className="text-gray-600">{sale.customer.email}</div>}
                {sale.customer.phone && <div className="text-gray-600">{sale.customer.phone}</div>}
                {sale.customer.address && (
                  <div className="text-gray-600">
                    {sale.customer.address}
                    {sale.customer.city && `, ${sale.customer.city}`}
                    {sale.customer.state && `, ${sale.customer.state}`}
                    {sale.customer.postalCode && ` ${sale.customer.postalCode}`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="my-6">
        <div className="border-b-2 border-gray-800 pb-2 mb-3 text-sm font-bold">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4">Producto</div>
            <div className="col-span-2">SKU</div>
            <div className="col-span-1 text-right">Cant</div>
            <div className="col-span-2 text-right">Precio Unit.</div>
            <div className="col-span-1 text-right">Desc.</div>
            <div className="col-span-2 text-right">Subtotal</div>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {sale.items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-2 border-b border-gray-200 pb-2"
            >
              <div className="col-span-4">{item.product.name}</div>
              <div className="col-span-2 text-gray-600">{item.product.sku}</div>
              <div className="col-span-1 text-right">{item.quantity}</div>
              <div className="col-span-2 text-right">${item.price.toFixed(2)}</div>
              <div className="col-span-1 text-right">
                {item.discount > 0 ? `-${item.discount.toFixed(2)}` : '-'}
              </div>
              <div className="col-span-2 text-right font-semibold">
                ${item.subtotal.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="border-t-2 border-gray-800 pt-4 mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="font-semibold">Subtotal:</span>
          <span>${sale.subtotal.toFixed(2)}</span>
        </div>
        {sale.tax > 0 && (
          <div className="flex justify-between">
            <span className="font-semibold">Impuesto:</span>
            <span>${sale.tax.toFixed(2)}</span>
          </div>
        )}
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <span className="font-semibold">Descuento:</span>
            <span>-${sale.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-xl border-t-2 border-gray-800 pt-3 mt-3">
          <span>TOTAL:</span>
          <span>${sale.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Method */}
      <div className="mt-6 pt-4 border-t border-gray-300">
        <div className="flex justify-between text-sm">
          <span className="font-semibold">Método de pago:</span>
          <span className="uppercase">{sale.paymentMethod}</span>
        </div>
        {sale.change !== null && sale.change > 0 && (
          <div className="flex justify-between text-sm mt-2">
            <span className="font-semibold">Cambio:</span>
            <span>${sale.change.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {config.description && (
        <div className="mt-6 text-center text-sm whitespace-pre-line bg-gray-50 p-4 rounded">
          {config.description}
        </div>
      )}

      {/* Footer */}
      {config.footer && (
        <div className="mt-6 text-center text-xs text-gray-600 whitespace-pre-line">
          {config.footer}
        </div>
      )}

      {/* Thank you message */}
      <div className="mt-8 text-center text-sm font-semibold text-gray-700">
        Gracias por su compra
      </div>
    </div>
  )
}
