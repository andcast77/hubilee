import { posApi } from '@/lib/api/client'
import { getStoreConfig, getNextInvoiceNumber } from './storeConfigService'
import { format } from 'date-fns'

export interface InvoiceData {
  invoiceNumber: string
  date: string
  store: {
    name: string
    address?: string
    phone?: string
    email?: string
    taxId?: string
  }
  customer?: {
    name: string
    address?: string
    phone?: string
    email?: string
    taxId?: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    subtotal: number
    tax?: number
  }>
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: string
  notes?: string
}

/**
 * Generate invoice number automatically via API
 * Format: {prefix}{number} (e.g., INV-0001)
 */
export async function generateInvoiceNumber(): Promise<string> {
  return getNextInvoiceNumber()
}

/**
 * Generate invoice data from sale (via API)
 */
export async function generateInvoiceFromSale(saleId: string): Promise<InvoiceData> {
  const response = await posApi.get<{ success: boolean; data: SaleWithItems; error?: string }>(
    `/sales/${saleId}`
  )

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Sale not found')
  }

  const sale = response.data
  const storeConfig = await getStoreConfig()

  const invoiceData: InvoiceData = {
    invoiceNumber: sale.invoiceNumber || await generateInvoiceNumber(),
    date: format(new Date(sale.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    store: {
      name: storeConfig.name,
      address: storeConfig.address || undefined,
      phone: storeConfig.phone || undefined,
      email: storeConfig.email || undefined,
      taxId: storeConfig.taxId || undefined,
    },
    items: sale.items.map((item: SaleItemResponse) => ({
      description: item.product?.name ?? 'Product',
      quantity: item.quantity,
      unitPrice: item.price,
      subtotal: item.subtotal,
    })),
    subtotal: sale.subtotal,
    tax: sale.tax,
    discount: sale.discount ?? 0,
    total: sale.total,
    paymentMethod: sale.paymentMethod ?? 'CASH',
    notes: sale.notes ?? undefined,
  }

  if (sale.customer) {
    invoiceData.customer = {
      name: sale.customer.name,
      address: sale.customer.address ?? undefined,
      phone: sale.customer.phone ?? undefined,
      email: sale.customer.email ?? undefined,
    }
  }

  return invoiceData
}

interface SaleWithItems {
  id: string
  invoiceNumber: string | null
  subtotal: number
  tax: number
  discount: number | null
  total: number
  paymentMethod: string | null
  notes: string | null
  createdAt: string
  customer?: { name: string; address?: string; phone?: string; email?: string }
  items: SaleItemResponse[]
}

interface SaleItemResponse {
  quantity: number
  price: number
  subtotal: number
  product?: { name: string }
}

/**
 * Generate PDF invoice (using jsPDF)
 */
export async function generatePDFInvoice(invoiceData: InvoiceData): Promise<Blob> {
  // Dynamic import to avoid bundling in server
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPos = margin

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth - margin, yPos, { align: 'right' })
  yPos += 10

  // Store info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(invoiceData.store.name, margin, yPos)
  yPos += 5
  if (invoiceData.store.address) {
    doc.setFontSize(10)
    doc.text(invoiceData.store.address, margin, yPos)
    yPos += 5
  }
  if (invoiceData.store.phone) {
    doc.text(`Phone: ${invoiceData.store.phone}`, margin, yPos)
    yPos += 5
  }
  if (invoiceData.store.email) {
    doc.text(`Email: ${invoiceData.store.email}`, margin, yPos)
    yPos += 5
  }
  if (invoiceData.store.taxId) {
    doc.text(`Tax ID: ${invoiceData.store.taxId}`, margin, yPos)
    yPos += 5
  }

  yPos += 5

  // Invoice details (right side)
  doc.setFontSize(10)
  doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, pageWidth - margin, margin + 5, { align: 'right' })
  doc.text(`Date: ${invoiceData.date}`, pageWidth - margin, margin + 10, { align: 'right' })

  yPos = Math.max(yPos, margin + 15)

  // Customer info
  if (invoiceData.customer) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', margin, yPos)
    yPos += 5
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(invoiceData.customer.name, margin, yPos)
    yPos += 5
    if (invoiceData.customer.address) {
      doc.text(invoiceData.customer.address, margin, yPos)
      yPos += 5
    }
    if (invoiceData.customer.phone) {
      doc.text(`Phone: ${invoiceData.customer.phone}`, margin, yPos)
      yPos += 5
    }
    if (invoiceData.customer.email) {
      doc.text(`Email: ${invoiceData.customer.email}`, margin, yPos)
      yPos += 5
    }
  }

  yPos += 10

  // Items table
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Description', margin, yPos)
  doc.text('Qty', margin + 80, yPos)
  doc.text('Price', margin + 100, yPos)
  doc.text('Total', pageWidth - margin, yPos, { align: 'right' })
  yPos += 5

  doc.setDrawColor(200, 200, 200)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 5

  doc.setFont('helvetica', 'normal')
  for (const item of invoiceData.items) {
    const descriptionLines = doc.splitTextToSize(item.description, 60)
    doc.text(descriptionLines, margin, yPos)
    doc.text(item.quantity.toString(), margin + 80, yPos)
    doc.text(item.unitPrice.toFixed(2), margin + 100, yPos)
    doc.text(item.subtotal.toFixed(2), pageWidth - margin, yPos, { align: 'right' })
    yPos += descriptionLines.length * 5 + 2
  }

  yPos += 5
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Totals
  doc.setFont('helvetica', 'normal')
  doc.text(`Subtotal:`, pageWidth - margin - 40, yPos, { align: 'right' })
  doc.text(invoiceData.subtotal.toFixed(2), pageWidth - margin, yPos, { align: 'right' })
  yPos += 5

  if (invoiceData.discount > 0) {
    doc.text(`Discount:`, pageWidth - margin - 40, yPos, { align: 'right' })
    doc.text(`-${invoiceData.discount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 5
  }

  if (invoiceData.tax > 0) {
    doc.text(`Tax:`, pageWidth - margin - 40, yPos, { align: 'right' })
    doc.text(invoiceData.tax.toFixed(2), pageWidth - margin, yPos, { align: 'right' })
    yPos += 5
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`TOTAL:`, pageWidth - margin - 40, yPos, { align: 'right' })
  doc.text(invoiceData.total.toFixed(2), pageWidth - margin, yPos, { align: 'right' })
  yPos += 10

  // Payment method
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Payment Method: ${invoiceData.paymentMethod}`, margin, yPos)
  yPos += 5

  // Notes
  if (invoiceData.notes) {
    yPos += 5
    doc.text('Notes:', margin, yPos)
    yPos += 5
    const notesLines = doc.splitTextToSize(invoiceData.notes, pageWidth - 2 * margin)
    doc.text(notesLines, margin, yPos)
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 10, { align: 'center' })

  // Generate blob
  const pdfBlob = doc.output('blob')
  return pdfBlob
}

/**
 * Generate XML invoice (for electronic invoicing systems)
 * Format: Basic XML structure compatible with common fiscal systems
 */
export function generateXMLInvoice(invoiceData: InvoiceData): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice>
  <InvoiceNumber>${invoiceData.invoiceNumber}</InvoiceNumber>
  <Date>${invoiceData.date}</Date>
  <Store>
    <Name>${escapeXML(invoiceData.store.name)}</Name>
    ${invoiceData.store.address ? `<Address>${escapeXML(invoiceData.store.address)}</Address>` : ''}
    ${invoiceData.store.phone ? `<Phone>${escapeXML(invoiceData.store.phone)}</Phone>` : ''}
    ${invoiceData.store.email ? `<Email>${escapeXML(invoiceData.store.email)}</Email>` : ''}
    ${invoiceData.store.taxId ? `<TaxId>${escapeXML(invoiceData.store.taxId)}</TaxId>` : ''}
  </Store>
  ${invoiceData.customer ? `
  <Customer>
    <Name>${escapeXML(invoiceData.customer.name)}</Name>
    ${invoiceData.customer.address ? `<Address>${escapeXML(invoiceData.customer.address)}</Address>` : ''}
    ${invoiceData.customer.phone ? `<Phone>${escapeXML(invoiceData.customer.phone)}</Phone>` : ''}
    ${invoiceData.customer.email ? `<Email>${escapeXML(invoiceData.customer.email)}</Email>` : ''}
    ${invoiceData.customer.taxId ? `<TaxId>${escapeXML(invoiceData.customer.taxId)}</TaxId>` : ''}
  </Customer>
  ` : ''}
  <Items>
    ${invoiceData.items.map(item => `
    <Item>
      <Description>${escapeXML(item.description)}</Description>
      <Quantity>${item.quantity}</Quantity>
      <UnitPrice>${item.unitPrice.toFixed(2)}</UnitPrice>
      <Subtotal>${item.subtotal.toFixed(2)}</Subtotal>
    </Item>
    `).join('')}
  </Items>
  <Totals>
    <Subtotal>${invoiceData.subtotal.toFixed(2)}</Subtotal>
    <Discount>${invoiceData.discount.toFixed(2)}</Discount>
    <Tax>${invoiceData.tax.toFixed(2)}</Tax>
    <Total>${invoiceData.total.toFixed(2)}</Total>
  </Totals>
  <PaymentMethod>${escapeXML(invoiceData.paymentMethod)}</PaymentMethod>
  ${invoiceData.notes ? `<Notes>${escapeXML(invoiceData.notes)}</Notes>` : ''}
</Invoice>`

  return xml
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generate receipt (simpler format than invoice)
 */
export function generateReceipt(invoiceData: InvoiceData): string {
  let receipt = `
${invoiceData.store.name}
${invoiceData.store.address || ''}
${invoiceData.store.phone || ''}
${invoiceData.store.email || ''}
${'='.repeat(40)}

Invoice #: ${invoiceData.invoiceNumber}
Date: ${invoiceData.date}
${invoiceData.customer ? `Customer: ${invoiceData.customer.name}` : ''}
${'='.repeat(40)}

`

  for (const item of invoiceData.items) {
    receipt += `${item.description.padEnd(25)} ${item.quantity}x ${item.unitPrice.toFixed(2)}\n`
    receipt += `${' '.repeat(25)} ${item.subtotal.toFixed(2)}\n`
  }

  receipt += `${'='.repeat(40)}\n`
  receipt += `Subtotal: ${invoiceData.subtotal.toFixed(2).padStart(27)}\n`
  if (invoiceData.discount > 0) {
    receipt += `Discount: -${invoiceData.discount.toFixed(2).padStart(25)}\n`
  }
  if (invoiceData.tax > 0) {
    receipt += `Tax: ${invoiceData.tax.toFixed(2).padStart(30)}\n`
  }
  receipt += `TOTAL: ${invoiceData.total.toFixed(2).padStart(28)}\n`
  receipt += `${'='.repeat(40)}\n`
  receipt += `Payment: ${invoiceData.paymentMethod}\n`
  receipt += `\nThank you for your purchase!\n`

  return receipt
}

