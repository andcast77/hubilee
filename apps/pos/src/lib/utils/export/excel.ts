import { API_URL } from '@/lib/api/client'

export interface ExcelExportOptions {
  title?: string
  storeName?: string
  fileName?: string
  sheetName?: string
}

type SalesExportPayload = {
  type: 'sales'
  sales: Array<{
    id: string
    invoiceNumber: string | null
    customer: { name: string } | null
    createdAt: string
    total: number
    paymentMethod: string
    subtotal: number
    tax: number
    discount: number
  }>
  options?: ExcelExportOptions
}

type ReportExportPayload = {
  type: 'report'
  data: {
    title: string
    headers: string[]
    rows: Array<Array<string | number>>
    summary?: Array<{ label: string; value: string | number }>
  }
  options?: ExcelExportOptions
}

function getFileNameFromHeader(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null
  const match = contentDisposition.match(/filename="?([^";]+)"?/i)
  return match?.[1] ?? null
}

async function downloadExcelFile(
  payload: SalesExportPayload | ReportExportPayload,
  defaultFileName: string
): Promise<void> {
  const response = await fetch(`${API_URL.replace(/\/$/, '')}/v1/pos/export/excel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('No se pudo generar el archivo de Excel.')
  }

  const blob = await response.blob()
  const headerName = getFileNameFromHeader(response.headers.get('content-disposition'))
  const fileName = headerName || defaultFileName

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.URL.revokeObjectURL(url)
}

/**
 * Export sales data to Excel
 */
export async function exportSalesToExcel(
  sales: Array<{
    id: string
    invoiceNumber: string | null
    customer: { name: string } | null
    createdAt: Date
    total: number
    paymentMethod: string
    subtotal: number
    tax: number
    discount: number
  }>,
  options: ExcelExportOptions = {}
): Promise<void> {
  const payload: SalesExportPayload = {
    type: 'sales',
    sales: sales.map((sale) => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customer: sale.customer ? { name: sale.customer.name } : null,
      createdAt: sale.createdAt.toISOString(),
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: sale.discount,
    })),
    options,
  }

  const defaultName = `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`
  await downloadExcelFile(payload, options.fileName || defaultName)
}

/**
 * Export report data to Excel
 */
export async function exportReportToExcel(
  data: {
    title: string
    headers: string[]
    rows: Array<Array<string | number>>
    summary?: Array<{ label: string; value: string | number }>
  },
  options: ExcelExportOptions = {}
): Promise<void> {
  const payload: ReportExportPayload = {
    type: 'report',
    data,
    options,
  }

  const defaultName = `report-${new Date().toISOString().split('T')[0]}.xlsx`
  await downloadExcelFile(payload, options.fileName || defaultName)
}

/**
 * Export data to CSV
 */
export function exportToCSV(
  headers: string[],
  rows: Array<Array<string | number>>,
  fileName?: string
): void {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const value = String(cell)
          // Escape commas and quotes
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || `export-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  window.URL.revokeObjectURL(url)
}

