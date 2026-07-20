'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProductSchema, updateProductSchema, type CreateProductInput, type UpdateProductInput } from '@/lib/validations/product'
import { Button } from '@hubilee/ui'
import { Input } from '@hubilee/ui'
import { Label } from '@hubilee/ui'
import { Textarea } from '@hubilee/ui'
import { Checkbox } from '@hubilee/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hubilee/ui'
import type { Category } from '@/types'
import { useCategories } from '@/hooks/useCategories'

interface ProductFormProps {
  initialData?: Partial<CreateProductInput>
  onSubmit: (data: CreateProductInput | UpdateProductInput) => Promise<void>
  isLoading?: boolean
}

const NO_CATEGORY_VALUE = '__none__'

export function ProductForm({ initialData, onSubmit, isLoading }: ProductFormProps) {
  const { data: categoriesData } = useCategories()
  const categories: Category[] = Array.isArray(categoriesData) ? categoriesData : []

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<Partial<CreateProductInput>>({
    resolver: zodResolver(initialData ? updateProductSchema : createProductSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      sku: initialData?.sku || '',
      barcode: initialData?.barcode || '',
      price: initialData?.price || 0,
      cost: initialData?.cost || 0,
      stock: initialData?.stock || 0,
      minStock: initialData?.minStock || 0,
      categoryId: initialData?.categoryId || undefined,
      active: initialData?.active ?? true,
    },
  })

  useEffect(() => {
    if (initialData?.categoryId) {
      setValue('categoryId', initialData.categoryId)
    }
  }, [initialData?.categoryId, setValue])

  const onFormSubmit = async (data: Partial<CreateProductInput>) => {
    const payload = {
      ...data,
      categoryId: data.categoryId === undefined || data.categoryId === '' ? null : data.categoryId,
    }
    await onSubmit(payload as CreateProductInput | UpdateProductInput)
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Nombre del Producto <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Ej: Laptop Dell XPS 13"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* SKU */}
        <div className="space-y-2">
          <Label htmlFor="sku">
            SKU <span className="text-red-500">*</span>
          </Label>
          <Input
            id="sku"
            {...register('sku')}
            placeholder="Ej: LAP-DELL-XPS13-001"
            className={errors.sku ? 'border-red-500' : ''}
          />
          {errors.sku && (
            <p className="text-sm text-red-500">{errors.sku.message}</p>
          )}
        </div>

        {/* Barcode */}
        <div className="space-y-2">
          <Label htmlFor="barcode">Código de Barras</Label>
          <Input
            id="barcode"
            {...register('barcode')}
            placeholder="Ej: 1234567890123"
            className={errors.barcode ? 'border-red-500' : ''}
          />
          {errors.barcode && (
            <p className="text-sm text-red-500">{errors.barcode.message}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="categoryId">Categoría</Label>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || NO_CATEGORY_VALUE}
                onValueChange={(value) => field.onChange(value === NO_CATEGORY_VALUE ? null : value)}
              >
                <SelectTrigger id="categoryId" className={errors.categoryId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY_VALUE}>Sin categoría</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId && (
            <p className="text-sm text-red-500">{errors.categoryId.message}</p>
          )}
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="price">
            Precio de Venta <span className="text-red-500">*</span>
          </Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            placeholder="0.00"
            className={errors.price ? 'border-red-500' : ''}
          />
          {errors.price && (
            <p className="text-sm text-red-500">{errors.price.message}</p>
          )}
        </div>

        {/* Cost */}
        <div className="space-y-2">
          <Label htmlFor="cost">Costo</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            {...register('cost', { valueAsNumber: true })}
            placeholder="0.00"
            className={errors.cost ? 'border-red-500' : ''}
          />
          {errors.cost && (
            <p className="text-sm text-red-500">{errors.cost.message}</p>
          )}
        </div>

        {/* Stock */}
        <div className="space-y-2">
          <Label htmlFor="stock">Stock Inicial</Label>
          <Input
            id="stock"
            type="number"
            {...register('stock', { valueAsNumber: true })}
            placeholder="0"
            className={errors.stock ? 'border-red-500' : ''}
          />
          {errors.stock && (
            <p className="text-sm text-red-500">{errors.stock.message}</p>
          )}
        </div>

        {/* Min Stock */}
        <div className="space-y-2">
          <Label htmlFor="minStock">Stock Mínimo</Label>
          <Input
            id="minStock"
            type="number"
            {...register('minStock', { valueAsNumber: true })}
            placeholder="0"
            className={errors.minStock ? 'border-red-500' : ''}
          />
          {errors.minStock && (
            <p className="text-sm text-red-500">{errors.minStock.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Descripción detallada del producto..."
          rows={4}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Active */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="active"
          {...register('active')}
        />
        <Label htmlFor="active" className="font-normal">
          Producto activo
        </Label>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar Producto'}
        </Button>
      </div>
    </form>
  )
}
