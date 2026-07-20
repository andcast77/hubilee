'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createSupplierSchema, type CreateSupplierInput, type UpdateSupplierInput } from '@/lib/validations/supplier'
import { Button } from '@hubilee/ui'
import { Input } from '@hubilee/ui'
import { Label } from '@hubilee/ui'
import { Textarea } from '@hubilee/ui'
import { Checkbox } from '@hubilee/ui'

interface SupplierFormProps {
  initialData?: Partial<CreateSupplierInput>
  onSubmit: (data: CreateSupplierInput | UpdateSupplierInput) => Promise<void>
  isLoading?: boolean
}

export function SupplierForm({ initialData, onSubmit, isLoading }: SupplierFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      postalCode: initialData?.postalCode || '',
      country: initialData?.country || '',
      taxId: initialData?.taxId || '',
      notes: initialData?.notes || '',
      active: initialData?.active ?? true,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
          <Input id="name" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" {...register('phone')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxId">RFC/NIT</Label>
          <Input id="taxId" {...register('taxId')} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" {...register('address')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" {...register('city')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Input id="state" {...register('state')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Código Postal</Label>
          <Input id="postalCode" {...register('postalCode')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">País</Label>
          <Input id="country" {...register('country')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" {...register('notes')} rows={4} />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="active" {...register('active')} />
        <Label htmlFor="active" className="font-normal">Proveedor activo</Label>
      </div>
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar Proveedor'}</Button>
      </div>
    </form>
  )
}
