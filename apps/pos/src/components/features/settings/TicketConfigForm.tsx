'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  updateTicketConfigSchema,
  type UpdateTicketConfigInput,
} from '@/lib/validations/ticketConfig'
import { Button } from '@hubilee/ui'
import { Input } from '@hubilee/ui'
import { Label } from '@hubilee/ui'
import { Textarea } from '@hubilee/ui'
import { Switch } from '@hubilee/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hubilee/ui'
import { TicketType } from '@/types'
import type { TicketConfig } from '@/types'
import { X, Printer } from 'lucide-react'
import { useRef } from 'react'
import { TicketPrintTemplate } from '@/components/features/pos/TicketPrintTemplate'
import { SheetPrintTemplate } from '@/components/features/pos/SheetPrintTemplate'
import { toast } from 'sonner'

interface TicketConfigFormProps {
  initialData: TicketConfig
  onSubmit: (data: UpdateTicketConfigInput) => Promise<void>
  isLoading?: boolean
}

const TICKET_TYPES: { value: TicketType; label: string }[] = [
  { value: TicketType.TICKET, label: 'Ticket (Impresora Térmica)' },
  { value: TicketType.SHEET, label: 'Hoja (Impresora Estándar)' },
]

// Datos de prueba para la venta
const mockSale: {
  id: string
  invoiceNumber: string
  customerId: string
  userId: string
  storeId: null
  status: 'COMPLETED'
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'CASH'
  paidAmount: number
  change: number
  notes: null
  createdAt: Date
  updatedAt: Date
  items: Array<{
    id: string
    saleId: string
    productId: string
    quantity: number
    price: number
    discount: number
    subtotal: number
    product: {
      id: string
      name: string
      sku: string
    }
  }>
  customer: {
    id: string
    name: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    postalCode: string
    country: string
  } | null
} = {
  id: 'test-sale-001',
  invoiceNumber: 'FAC-2026-0001',
  customerId: 'test-customer-001',
  userId: 'test-user-001',
  storeId: null,
  status: 'COMPLETED',
  subtotal: 150.00,
  tax: 18.00,
  discount: 10.00,
  total: 158.00,
  paymentMethod: 'CASH',
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
      product: {
        id: 'prod-001',
        name: 'Producto de Prueba 1',
        sku: 'SKU-001',
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
      product: {
        id: 'prod-002',
        name: 'Producto de Prueba 2',
        sku: 'SKU-002',
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
  },
}

export function TicketConfigForm({
  initialData,
  onSubmit,
  isLoading,
}: TicketConfigFormProps) {
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialData.logoUrl || null
  )
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UpdateTicketConfigInput>({
    resolver: zodResolver(updateTicketConfigSchema),
    defaultValues: {
      ticketType: initialData.ticketType || 'TICKET',
      header: initialData.header || '',
      description: initialData.description || '',
      logoUrl: initialData.logoUrl || '',
      footer: initialData.footer || '',
      thermalWidth: (initialData as any).thermalWidth || (initialData as any).paperWidth || null,
      fontSize: initialData.fontSize || 12,
      copies: initialData.copies || 1,
      autoPrint: initialData.autoPrint ?? true,
    },
  })

  const ticketType = watch('ticketType')
  const autoPrint = watch('autoPrint')
  const formValues = watch()

  // Detectar cambios no guardados (optimizado con debounce)
  useEffect(() => {
    // Usar timeout para evitar múltiples renderizados innecesarios
    const timeoutId = setTimeout(() => {
      const defaultValues = {
        ticketType: initialData.ticketType || 'TICKET',
        header: initialData.header || '',
        description: initialData.description || '',
        logoUrl: initialData.logoUrl || '',
        footer: initialData.footer || '',
        thermalWidth: (initialData as any).thermalWidth || (initialData as any).paperWidth || null,
        fontSize: initialData.fontSize || 12,
        copies: initialData.copies || 1,
        autoPrint: initialData.autoPrint ?? true,
      }

      // Comparación optimizada - solo verificar campos relevantes
      const hasChanges = 
        formValues.ticketType !== defaultValues.ticketType ||
        formValues.header !== defaultValues.header ||
        formValues.description !== defaultValues.description ||
        formValues.logoUrl !== defaultValues.logoUrl ||
        formValues.footer !== defaultValues.footer ||
        formValues.thermalWidth !== defaultValues.thermalWidth ||
        formValues.fontSize !== defaultValues.fontSize ||
        formValues.copies !== defaultValues.copies ||
        formValues.autoPrint !== defaultValues.autoPrint

      setHasUnsavedChanges(hasChanges)
    }, 300) // Debounce de 300ms para mejorar performance

    return () => clearTimeout(timeoutId)
  }, [formValues, initialData])

  // Crear configuración temporal con los valores actuales del formulario
  const currentConfig: TicketConfig = {
    ...initialData,
    ticketType: (formValues.ticketType || initialData.ticketType) as TicketType,
    header: formValues.header ?? initialData.header,
    description: formValues.description ?? initialData.description,
    logoUrl: formValues.logoUrl ?? initialData.logoUrl,
    footer: formValues.footer ?? initialData.footer,
    thermalWidth: formValues.thermalWidth ?? (initialData as any).thermalWidth ?? null,
    fontSize: formValues.fontSize ?? initialData.fontSize,
    copies: formValues.copies ?? initialData.copies,
    autoPrint: formValues.autoPrint ?? initialData.autoPrint,
  }

  const handlePrint = () => {
    try {
      // Verificar que la referencia al contenido existe
      if (!printRef.current) {
        throw new Error('El contenido de impresión no está disponible. Por favor, recarga la página e intenta nuevamente.')
      }

      // Intentar abrir ventana de impresión
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (!printWindow) {
        throw new Error('No se pudo abrir la ventana de impresión. Por favor, permite ventanas emergentes en la configuración de tu navegador.')
      }

      // Obtener el contenido del ticket
      const ticketElement = printRef.current
      const content = ticketElement.innerHTML

      if (!content || content.trim().length === 0) {
        printWindow.close()
        throw new Error('El contenido de impresión está vacío. Por favor, verifica la configuración del comprobante.')
      }

      // Copiar estilos críticos (solo los necesarios para la impresión)
      const criticalStyles = `
        @media print {
          @page {
            size: ${currentConfig.ticketType === 'TICKET' ? 'auto' : 'auto'};
            margin: 0;
          }
          body {
            margin: 0;
            padding: ${currentConfig.ticketType === 'TICKET' ? '10mm' : '20mm'};
            font-family: ${currentConfig.ticketType === 'TICKET' ? 'monospace' : 'system-ui, sans-serif'};
            font-size: ${currentConfig.fontSize || 12}px;
          }
          .no-print {
            display: none !important;
          }
        }
        @media screen {
          body {
            font-family: ${currentConfig.ticketType === 'TICKET' ? 'monospace' : 'system-ui, -apple-system, sans-serif'};
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
        }
      `

      // Escribir el documento con manejo de errores
      try {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Prueba-${currentConfig.ticketType}-${mockSale.invoiceNumber}</title>
              <meta charset="utf-8">
              <style>
                ${criticalStyles}
              </style>
            </head>
            <body>
              ${content}
              <div class="no-print" style="margin-top: 20px; text-align: center; padding: 20px;">
                <button onclick="window.print()" style="padding: 12px 24px; background: #3B82F6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
                  🖨️ Imprimir
                </button>
                <button onclick="window.close()" style="padding: 12px 24px; background: #6B7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; margin-left: 10px;">
                  Cerrar
                </button>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()

        // Esperar a que la ventana cargue antes de intentar imprimir
        printWindow.onload = () => {
          // Opcional: auto-focus para que el usuario vea la ventana
          printWindow.focus()
        }

      } catch (writeError) {
        printWindow.close()
        throw new Error('Error al escribir el contenido de impresión. Por favor, intenta nuevamente.')
      }

    } catch (error) {
      // Mostrar error de forma amigable
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Ocurrió un error al intentar imprimir. Por favor, intenta nuevamente.'
      
      console.error('Error en handlePrint:', error)
      
      // Usar alert temporalmente (se puede mejorar con un toast notification)
      if (typeof window !== 'undefined') {
        toast.error(errorMessage)
      }
    }
  }

  const onPrintClick = () => {
    handlePrint()
  }

  const handleSubmitWithFeedback = async (data: UpdateTicketConfigInput) => {
    try {
      await onSubmit(data)
      setHasUnsavedChanges(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving configuration:', error)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen válido (JPG, PNG, etc.)')
      return
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Por favor, selecciona una imagen menor a 5MB.')
      return
    }

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const { API_URL, getAuthHeaders } = await import('@/lib/api/client')
      const url = `${API_URL.replace(/\/$/, '')}/v1/pos/ticket-config/logo`
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || 'Error al subir el logo. Por favor, intenta nuevamente.')
      }

      const data = await response.json()
      if (!data.url) {
        throw new Error('No se recibió una URL válida del servidor.')
      }

      setValue('logoUrl', data.url)
      setLogoPreview(data.url)
      
      // Mostrar mensaje de éxito temporal
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Error uploading logo:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al subir el logo. Por favor, verifica que el archivo sea válido e intenta nuevamente.'
      toast.error(errorMessage)
    } finally {
      setIsUploadingLogo(false)
      // Resetear el input para permitir subir el mismo archivo nuevamente
      event.target.value = ''
    }
  }

  const handleRemoveLogo = () => {
    setValue('logoUrl', '')
    setLogoPreview(null)
  }

  const handleReset = () => {
    if (confirm('¿Estás seguro de que quieres restaurar todos los valores originales? Se perderán los cambios no guardados.')) {
      setValue('ticketType', initialData.ticketType || 'TICKET')
      setValue('header', initialData.header || '')
      setValue('description', initialData.description || '')
      setValue('logoUrl', initialData.logoUrl || '')
      setValue('footer', initialData.footer || '')
      setValue('thermalWidth', (initialData as any).thermalWidth || null)
      setValue('fontSize', initialData.fontSize || 12)
      setValue('copies', initialData.copies || 1)
      setValue('autoPrint', initialData.autoPrint ?? true)
      setLogoPreview(initialData.logoUrl || null)
      setHasUnsavedChanges(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleSubmitWithFeedback)} className="space-y-8">
      {/* Tipo de Ticket - Sección Principal */}
      <div className="space-y-4 p-6 bg-gray-50 rounded-lg border">
        <div>
          <Label htmlFor="ticketType" className="text-lg font-semibold">
            Tipo de Impresión
          </Label>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            Selecciona el formato de comprobante que usarás para imprimir
          </p>
          <Select
            value={ticketType || 'TICKET'}
            onValueChange={(value) => {
              setValue('ticketType', value as TicketType)
              // Reset thermalWidth when switching to SHEET
              if (value === 'SHEET') {
                setValue('thermalWidth', null)
              } else if (value === 'TICKET' && !watch('thermalWidth')) {
                setValue('thermalWidth', 80)
              }
            }}
          >
            <SelectTrigger id="ticketType" className="h-12 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Configuración de Impresión */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Configuración de Impresión</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {ticketType === 'TICKET' && (
              <div className="space-y-2">
                <Label htmlFor="thermalWidth">Ancho Térmico (mm)</Label>
                <Select
                  value={watch('thermalWidth')?.toString() || ''}
                  onValueChange={(value) =>
                    setValue('thermalWidth', parseInt(value, 10))
                  }
                >
                  <SelectTrigger id="thermalWidth">
                    <SelectValue placeholder="Seleccionar ancho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80">80mm</SelectItem>
                    <SelectItem value="60">60mm</SelectItem>
                    <SelectItem value="40">40mm</SelectItem>
                  </SelectContent>
                </Select>
                {errors.thermalWidth && (
                  <p className="text-sm text-red-500">
                    {errors.thermalWidth.message}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Ancho del rollo de papel térmico (80mm, 60mm o 40mm)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fontSize">Tamaño de Fuente</Label>
              <Input
                id="fontSize"
                type="number"
                {...register('fontSize', { valueAsNumber: true })}
                min="8"
                max="24"
              />
              {errors.fontSize && (
                <p className="text-sm text-red-500">{errors.fontSize.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Tamaño de fuente en puntos (8-24)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copies">Copias</Label>
              <Input
                id="copies"
                type="number"
                {...register('copies', { valueAsNumber: true })}
                min="1"
                max="10"
              />
              {errors.copies && (
                <p className="text-sm text-red-500">{errors.copies.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Número de copias a imprimir (1-10)
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="space-y-0.5">
                  <Label htmlFor="autoPrint" className="text-base font-medium">
                    Imprimir Automáticamente
                  </Label>
                  <p className="text-sm text-gray-600">
                    Imprimir automáticamente al completar una venta
                  </p>
                </div>
                <Switch
                  id="autoPrint"
                  checked={autoPrint ?? true}
                  onCheckedChange={(checked) => setValue('autoPrint', checked)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview en Tiempo Real */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Vista Previa del Comprobante</h3>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className={`bg-white border rounded shadow-sm p-4 mx-auto ${
              currentConfig.ticketType === 'TICKET'
                ? 'max-w-xs' // Más estrecho para tickets térmicos
                : 'max-w-lg' // Más ancho para hojas
            }`}>
              {/* Preview Header */}
              {currentConfig.logoUrl && (
                <div className="text-center mb-3">
                  <img
                    src={currentConfig.logoUrl}
                    alt="Logo"
                    className="h-12 mx-auto object-contain"
                  />
                </div>
              )}
              {currentConfig.header && (
                <div className="text-center text-sm font-semibold mb-3 whitespace-pre-line">
                  {currentConfig.header}
                </div>
              )}

              {/* Preview Sale Info */}
              <div className="border-t border-b border-gray-300 py-2 my-3">
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Factura:</span>
                    <span className="font-semibold">FAC-2026-0001</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span>{new Date().toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
              </div>

              {/* Preview Items */}
              <div className="my-3">
                <div className="text-xs font-semibold mb-2">
                  <div className="grid grid-cols-12 gap-1">
                    <div className="col-span-6">Producto</div>
                    <div className="col-span-3 text-right">Cant</div>
                    <div className="col-span-3 text-right">Total</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="grid grid-cols-12 gap-1 border-b border-gray-200 pb-1">
                    <div className="col-span-6 truncate">Producto de Prueba</div>
                    <div className="col-span-3 text-right">2</div>
                    <div className="col-span-3 text-right font-semibold">$100.00</div>
                  </div>
                </div>
              </div>

              {/* Preview Totals */}
              <div className="border-t border-gray-300 pt-2 mt-3 text-xs">
                <div className="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>$158.00</span>
                </div>
              </div>

              {/* Preview Footer */}
              {currentConfig.footer && (
                <div className="text-center text-xs mt-3 pt-3 border-t border-gray-200 whitespace-pre-line">
                  {currentConfig.footer}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Vista previa simplificada - El diseño real varía según el tipo de comprobante seleccionado
            </p>
          </div>
        </div>
      </div>

      {/* Contenido del Ticket */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Configuración del Contenido</h3>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="logo">Logo del Comprobante</Label>
              <div className="flex items-start gap-4">
                {logoPreview && (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-24 w-auto object-contain border rounded-lg p-2 bg-white"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 bg-white border shadow-sm"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploadingLogo}
                    className="cursor-pointer"
                  />
                  {isUploadingLogo && (
                    <p className="text-xs text-gray-500 mt-1">Subiendo...</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Sube una imagen para el logo del comprobante (recomendado: PNG con fondo transparente)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="header" className="flex items-center gap-2">
                Encabezado
                {watch('header') && watch('header') !== (initialData.header || '') && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Modificado
                  </span>
                )}
              </Label>
              <Textarea
                id="header"
                {...register('header')}
                placeholder="Ejemplo:&#10;MI TIENDA&#10;Dirección: Calle Principal 123&#10;Teléfono: (555) 123-4567"
                rows={4}
                className={`font-mono text-sm ${errors.header ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.header && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span>⚠️</span> {errors.header.message}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Texto que aparecerá en la parte superior del comprobante
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                Descripción
                {watch('description') && watch('description') !== (initialData.description || '') && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Modificado
                  </span>
                )}
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Ejemplo:&#10;Gracias por su compra&#10;Horario: Lunes a Viernes 9:00 - 18:00"
                rows={3}
                className={`font-mono text-sm ${errors.description ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.description && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span>⚠️</span> {errors.description.message}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Texto descriptivo adicional (opcional)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer" className="flex items-center gap-2">
                Pie de Comprobante
                {watch('footer') && watch('footer') !== (initialData.footer || '') && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Modificado
                  </span>
                )}
              </Label>
              <Textarea
                id="footer"
                {...register('footer')}
                placeholder="Ejemplo:&#10;¡Vuelva pronto!&#10;Síguenos en redes sociales"
                rows={3}
                className={`font-mono text-sm ${errors.footer ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.footer && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span>⚠️</span> {errors.footer.message}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Texto que aparecerá en la parte inferior del comprobante
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores de Estado */}
      {(hasUnsavedChanges || saveSuccess) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            {saveSuccess ? (
              <>
                <div className="text-green-600 text-xl">✅</div>
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Configuración guardada exitosamente
                  </p>
                  <p className="text-xs text-green-600">
                    Los cambios se aplicarán en las próximas impresiones
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="text-amber-600 text-xl">⚠️</div>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Tienes cambios sin guardar
                  </p>
                  <p className="text-xs text-amber-600">
                    Recuerda guardar antes de salir para que los cambios surtan efecto
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Botón de Guardar */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <div className="flex gap-4">
          {hasUnsavedChanges && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={isLoading || isUploadingLogo}
              size="lg"
              className="text-gray-600 hover:text-gray-800"
            >
              Restaurar Valores
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onPrintClick}
            disabled={isLoading || isUploadingLogo}
            size="lg"
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Probar Impresión
          </Button>
          <Button
            type="submit"
            disabled={isLoading || isUploadingLogo || !hasUnsavedChanges}
            size="lg"
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                Guardar Configuración
                {hasUnsavedChanges && <span className="ml-2 text-xs bg-amber-500 text-white px-2 py-1 rounded-full">Nuevo</span>}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Componente oculto para impresión - siempre renderizado para evitar errores de ref */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
        <div ref={printRef}>
          {currentConfig.ticketType === 'TICKET' ? (
            <TicketPrintTemplate sale={mockSale as any} config={currentConfig} />
          ) : (
            <SheetPrintTemplate sale={mockSale as any} config={currentConfig} />
          )}
        </div>
      </div>
    </form>
  )
}
