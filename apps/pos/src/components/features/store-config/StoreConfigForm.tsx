'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateStoreConfigSchema, type UpdateStoreConfigInput } from '@/lib/validations/storeConfig'
import { Button } from '@hubilee/ui'
import { Input } from '@hubilee/ui'
import { Label } from '@hubilee/ui'
import { Textarea } from '@hubilee/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hubilee/ui'
import { Switch } from '@hubilee/ui'
import type { StoreConfig } from '@/types'

interface StoreConfigFormProps {
  initialData: StoreConfig
  onSubmit: (data: UpdateStoreConfigInput) => Promise<void>
  isLoading?: boolean
}

const CURRENCIES = [
  { value: 'USD', label: 'USD - Dólar Estadounidense' },
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - Libra Esterlina' },
  { value: 'CAD', label: 'CAD - Dólar Canadiense' },
  { value: 'ARS', label: 'ARS - Peso Argentino' },
  { value: 'CLP', label: 'CLP - Peso Chileno' },
  { value: 'COP', label: 'COP - Peso Colombiano' },
]

export function StoreConfigForm({ initialData, onSubmit, isLoading }: StoreConfigFormProps) {
  // Convert taxRate from decimal to percentage for display
  const [taxRatePercent, setTaxRatePercent] = useState<string>(
    initialData.taxRate ? (initialData.taxRate * 100).toFixed(2) : '0'
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UpdateStoreConfigInput>({
    resolver: zodResolver(updateStoreConfigSchema),
    defaultValues: {
      name: initialData.name || '',
      address: initialData.address || '',
      phone: initialData.phone || '',
      email: initialData.email || '',
      taxId: initialData.taxId || '',
      currency: initialData.currency || 'USD',
      taxRate: initialData.taxRate || 0,
      lowStockAlert: initialData.lowStockAlert || 10,
      invoicePrefix: initialData.invoicePrefix || 'INV-',
      allowSalesWithoutStock: initialData.allowSalesWithoutStock ?? false,
    },
  })

  const currency = watch('currency')
  const invoicePrefix = watch('invoicePrefix')
  const allowSalesWithoutStock = watch('allowSalesWithoutStock')

  const formatInvoiceNumber = () => {
    if (!initialData.invoiceNumber) return 'N/A'
    return `${invoicePrefix || initialData.invoicePrefix}${initialData.invoiceNumber.toString().padStart(6, '0')}`
  }

  const onFormSubmit = async (data: UpdateStoreConfigInput) => {
    // Convert taxRate percentage to decimal before submitting
    const taxRateDecimal = taxRatePercent ? parseFloat(taxRatePercent) / 100 : 0
    await onSubmit({
      ...data,
      taxRate: taxRateDecimal,
    })
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
      {/* Información de la Tienda */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Información de la Tienda</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">
                Nombre de la Tienda <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ej: Mi Tienda"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                {...register('address')}
                placeholder="Ej: Calle Principal 123, Colonia Centro"
                rows={3}
                className={errors.address ? 'border-red-500' : ''}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Ej: +52 55 1234 5678"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Ej: contacto@mitienda.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">RFC/NIT</Label>
              <Input
                id="taxId"
                {...register('taxId')}
                placeholder="Ej: ABC123456789"
                className={errors.taxId ? 'border-red-500' : ''}
              />
              {errors.taxId && (
                <p className="text-sm text-red-500">{errors.taxId.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de Negocio */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Configuración de Negocio</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">
                Moneda <span className="text-red-500">*</span>
              </Label>
              <Select
                value={currency || 'USD'}
                onValueChange={(value) => setValue('currency', value)}
              >
                <SelectTrigger id="currency" className={errors.currency ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.currency && (
                <p className="text-sm text-red-500">{errors.currency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">
                Tasa de Impuesto (%)
              </Label>
              <div className="relative">
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxRatePercent}
                  onChange={(e) => {
                    const value = e.target.value
                    setTaxRatePercent(value)
                    // Also update form value for validation
                    const decimalValue = value === '' ? 0 : parseFloat(value) / 100
                    if (!isNaN(decimalValue) && decimalValue >= 0 && decimalValue <= 1) {
                      setValue('taxRate', decimalValue, { shouldValidate: true })
                    }
                  }}
                  placeholder="0.00"
                  className={errors.taxRate ? 'border-red-500' : ''}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  %
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Ingresa el porcentaje (ej: 16 para 16%). Se almacenará como decimal (0.16)
              </p>
              {errors.taxRate && (
                <p className="text-sm text-red-500">{errors.taxRate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowStockAlert">Alerta de Stock Bajo</Label>
              <Input
                id="lowStockAlert"
                type="number"
                {...register('lowStockAlert', { valueAsNumber: true })}
                placeholder="10"
                min="0"
                className={errors.lowStockAlert ? 'border-red-500' : ''}
              />
              <p className="text-xs text-gray-500">
                Se mostrará una alerta cuando el stock sea igual o menor a este valor
              </p>
              {errors.lowStockAlert && (
                <p className="text-sm text-red-500">{errors.lowStockAlert.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Prefijo de Factura</Label>
              <Input
                id="invoicePrefix"
                {...register('invoicePrefix')}
                placeholder="INV-"
                maxLength={10}
                className={errors.invoicePrefix ? 'border-red-500' : ''}
              />
              {errors.invoicePrefix && (
                <p className="text-sm text-red-500">{errors.invoicePrefix.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="invoiceNumber">Número de Factura Actual (Solo Lectura)</Label>
              <Input
                id="invoiceNumber"
                value={formatInvoiceNumber()}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                Este número se incrementa automáticamente con cada nueva venta
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowSalesWithoutStock">Permitir Vender Sin Stock</Label>
                  <p className="text-xs text-gray-500">
                    Permite completar ventas aunque el producto no tenga stock disponible
                  </p>
                </div>
                <Switch
                  id="allowSalesWithoutStock"
                  checked={allowSalesWithoutStock ?? false}
                  onCheckedChange={(checked) => setValue('allowSalesWithoutStock', checked)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </form>
  )
}
