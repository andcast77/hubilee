import jsPDF from 'jspdf'

export interface PDFExportOptions {
  title?: string
  storeName?: string
  storeAddress?: string
  fileName?: string
}

/**
 * Export sales data to PDF
 */
export function exportSalesToPDF(
  sales: Array<{
    id: string
    invoiceNumber: string | null
    customer: { name: string } | null
    createdAt: Date
    total: number
    paymentMethod: string
  }>,
  options: PDFExportOptions = {}
): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // Header
  if (options.storeName) {
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(options.storeName, pageWidth / 2, yPos, { align: 'center' })
    yPos += 10
  }

  if (options.title) {
    doc.setFontSize(16)
    doc.setFont('helvetica', 'normal')
    doc.text(options.title, pageWidth / 2, yPos, { align: 'center' })
    yPos += 15
  }

  if (options.storeAddress) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(options.storeAddress, pageWidth / 2, yPos, { align: 'center' })
    yPos += 10
  }

  yPos += 5

  // Table header
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Fecha', margin, yPos)
  doc.text('Factura', margin + 35, yPos)
  doc.text('Cliente', margin + 70, yPos)
  doc.text('Total', margin + 135, yPos)
  doc.text('Pago', margin + 165, yPos)
  yPos += 8

  // Draw line
  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 5

  // Table rows
  doc.setFont('helvetica', 'normal')
  sales.forEach((sale) => {
    if (yPos > pageHeight - 30) {
      doc.addPage()
      yPos = margin
    }

    const date = new Date(sale.createdAt).toLocaleDateString()
    const invoice = sale.invoiceNumber || '-'
    const customer = sale.customer?.name || 'Sin cliente'
    const total = sale.total.toFixed(2)
    const payment = sale.paymentMethod

    doc.setFontSize(9)
    doc.text(date, margin, yPos)
    doc.text(invoice, margin + 35, yPos)
    doc.text(customer.substring(0, 20), margin + 70, yPos)
    doc.text(total, margin + 135, yPos)
    doc.text(payment, margin + 165, yPos)

    yPos += 7
  })

  // Footer with totals
  yPos += 5
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  const grandTotal = sales.reduce((sum, sale) => sum + sale.total, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total: ${grandTotal.toFixed(2)}`, margin + 135, yPos)

  // Save PDF
  const fileName = options.fileName || `sales-report-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

/**
 * Export report data to PDF
 */
export function exportReportToPDF(
  data: {
    title: string
    headers: string[]
    rows: Array<string[]>
    summary?: Array<{ label: string; value: string }>
  },
  options: PDFExportOptions = {}
): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // Header
  if (options.storeName) {
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(options.storeName, pageWidth / 2, yPos, { align: 'center' })
    yPos += 10
  }

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(data.title, pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Generado: ${new Date().toLocaleString()}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  )
  yPos += 15

  // Table headers
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const colWidths = (pageWidth - 2 * margin) / data.headers.length
  data.headers.forEach((header, index) => {
    doc.text(header, margin + index * colWidths, yPos)
  })
  yPos += 8

  // Draw line
  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 5

  // Table rows
  doc.setFont('helvetica', 'normal')
  data.rows.forEach((row) => {
    if (yPos > pageHeight - 30) {
      doc.addPage()
      yPos = margin
    }

    doc.setFontSize(9)
    row.forEach((cell, index) => {
      doc.text(
        String(cell).substring(0, 25),
        margin + index * colWidths,
        yPos
      )
    })

    yPos += 7
  })

  // Summary if provided
  if (data.summary && data.summary.length > 0) {
    yPos += 10
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    data.summary.forEach((item) => {
      doc.text(item.label, margin, yPos)
      doc.text(item.value, pageWidth - margin - 50, yPos, { align: 'right' })
      yPos += 7
    })
  }

  // Save PDF
  const fileName = options.fileName || `report-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

