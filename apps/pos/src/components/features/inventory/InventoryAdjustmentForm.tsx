'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adjustInventorySchema, type AdjustInventoryInput } from '@/lib/validations/inventory'
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

interface InventoryAdjustmentFormProps {
  productId: string
  currentStock: number
  onSubmit: (data: AdjustInventoryInput) => Promise<void>
  isLoading?: boolean
}

export function InventoryAdjustmentForm({
  productId: _productId,
  currentStock,
  onSubmit,
  isLoading,
}: InventoryAdjustmentFormProps) {
  const [adjustmentType, setAdjustmentType] = useState<'ADJUST' | 'ADD' | 'REMOVE'>('ADJUST')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AdjustInventoryInput>({
    resolver: zodResolver(adjustInventorySchema),
    defaultValues: {
      quantity: 0,
      type: 'ADJUST',
      reason: '',
    },
  })

  const quantity = watch('quantity')

  const calculateNewStock = () => {
    if (!quantity) return currentStock
    const qty = Number(quantity)
    if (adjustmentType === 'ADJUST') return qty
    if (adjustmentType === 'ADD') return currentStock + qty
    return Math.max(0, currentStock - qty)
  }

  const onFormSubmit = async (data: AdjustInventoryInput) => {
    await onSubmit({ ...data, type: adjustmentType })
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="text-sm text-gray-600">Stock Actual</div>
        <div className="text-2xl font-bold">{currentStock}</div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Ajuste</Label>
        <Select
          value={adjustmentType}
          onValueChange={(value: 'ADJUST' | 'ADD' | 'REMOVE') => {
            setAdjustmentType(value)
            setValue('type', value)
          }}
        >
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADJUST">Ajustar a cantidad específica</SelectItem>
            <SelectItem value="ADD">Agregar cantidad</SelectItem>
            <SelectItem value="REMOVE">Quitar cantidad</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quantity">
          Cantidad{' '}
          {adjustmentType === 'ADJUST'
            ? '(nueva cantidad)'
            : adjustmentType === 'ADD'
              ? '(a agregar)'
              : '(a quitar)'}
        </Label>
        <Input
          id="quantity"
          type="number"
          {...register('quantity', { valueAsNumber: true })}
          className={errors.quantity ? 'border-red-500' : ''}
          min={adjustmentType === 'REMOVE' ? 0 : undefined}
        />
        {errors.quantity && (
          <p className="text-sm text-red-500">{errors.quantity.message}</p>
        )}
      </div>

      {quantity && (
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="text-sm text-gray-600">Nuevo Stock</div>
          <div className="text-2xl font-bold text-blue-600">
            {calculateNewStock()}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Razón (opcional)</Label>
        <Textarea
          id="reason"
          {...register('reason')}
          placeholder="Ej: Ajuste por inventario físico, devolución, etc."
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Ajustando...' : 'Ajustar Inventario'}
      </Button>
    </form>
  )
}
