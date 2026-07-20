'use client'

import { Download, FileText, FileCode } from 'lucide-react'
import { Button } from '@hubilee/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hubilee/ui'
import { API_URL } from '@/lib/api/client'

interface InvoiceActionsProps {
  saleId: string
  invoiceNumber?: string
}

export function InvoiceActions({ saleId }: InvoiceActionsProps) {
  const handleDownload = (format: 'pdf' | 'xml' | 'receipt') => {
    const url = `${API_URL.replace(/\/$/, '')}/v1/pos/sales/${saleId}/invoice/${format}`
    window.open(url, '_blank')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download Invoice
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          PDF Invoice
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('xml')}>
          <FileCode className="mr-2 h-4 w-4" />
          XML (Electronic)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('receipt')}>
          <FileText className="mr-2 h-4 w-4" />
          Text Receipt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

