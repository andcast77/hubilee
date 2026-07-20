'use client'

import type { Sale, SaleItem, Product, Customer, TicketConfig } from '@/types'

interface SaleWithRelations extends Sale {
  items: Array<SaleItem & { product: Product }>
  customer: Customer | null
}

interface TicketPrintTemplateProps {
  sale: SaleWithRelations
  config: TicketConfig
}

export function TicketPrintTemplate({ sale, config }: TicketPrintTemplateProps) {
  const thermalWidth = config.thermalWidth || 80
  const widthStyle: React.CSSProperties = {
    width: `${thermalWidth}mm`,
    maxWidth: `${thermalWidth}mm`,
    fontFamily: 'monospace',
    fontSize: `${config.fontSize || 12}px`,
    padding: '10px',
    margin: '0 auto',
  }

  return (
    <div style={widthStyle} className="bg-white">
      {/* Logo */}
      {config.logoUrl && (
        <div className="mb-3 text-center">
          <img
            src={config.logoUrl}
            alt="Logo"
            style={{ maxHeight: '60px', maxWidth: '100%' }}
          />
        </div>
      )}

      {/* Header */}
      {config.header && (
        <div className="mb-3 text-center whitespace-pre-line text-sm font-semibold">
          {config.header}
        </div>
      )}

      {/* Separator */}
      <div className="border-t border-b border-black py-2 my-3">
        {/* Sale Details */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Factura:</span>
            <span className="font-semibold">{sale.invoiceNumber || sale.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{new Date(sale.createdAt).toLocaleString('es-ES')}</span>
          </div>
          {sale.customer && (
            <div className="flex justify-between">
              <span>Cliente:</span>
              <span>{sale.customer.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="my-3">
        <div className="border-b border-black pb-1 mb-2 text-xs font-semibold">
          <div className="grid grid-cols-12 gap-1">
            <div className="col-span-5">Producto</div>
            <div className="col-span-2 text-right">Cant</div>
            <div className="col-span-2 text-right">Precio</div>
            <div className="col-span-3 text-right">Subtotal</div>
          </div>
        </div>
        <div className="space-y-1 text-xs">
          {sale.items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-1 border-b border-dashed border-gray-300 pb-1">
              <div className="col-span-5 truncate">{item.product.name}</div>
              <div className="col-span-2 text-right">{item.quantity}</div>
              <div className="col-span-2 text-right">${item.price.toFixed(2)}</div>
              <div className="col-span-3 text-right font-semibold">${item.subtotal.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-black pt-2 mt-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>${sale.subtotal.toFixed(2)}</span>
        </div>
        {sale.tax > 0 && (
          <div className="flex justify-between">
            <span>Impuesto:</span>
            <span>${sale.tax.toFixed(2)}</span>
          </div>
        )}
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <span>Descuento:</span>
            <span>-${sale.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
          <span>TOTAL:</span>
          <span>${sale.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Description */}
      {config.description && (
        <div className="mt-3 text-center text-xs whitespace-pre-line">
          {config.description}
        </div>
      )}

      {/* Footer */}
      {config.footer && (
        <div className="mt-3 text-center text-xs whitespace-pre-line">
          {config.footer}
        </div>
      )}

      {/* Thank you message */}
      <div className="mt-4 text-center text-xs text-gray-600">
        Gracias por su compra
      </div>
    </div>
  )
}
