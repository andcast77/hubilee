'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema, type CreateUserInput, type UpdateUserInput } from '@/lib/validations/user'
import { Button } from '@hubilee/ui'
import { Input } from '@hubilee/ui'
import { Label } from '@hubilee/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hubilee/ui'
import { Checkbox } from '@hubilee/ui'
import { ScrollArea } from '@hubilee/ui'
import { useStoreContextOptional } from '@/components/providers/StoreContext'
import { UserRole } from '@/types'

interface UserFormProps {
  initialData?: Partial<CreateUserInput & { storeIds?: string[]; employeeCode?: string | null }>
  onSubmit: (data: CreateUserInput | UpdateUserInput) => Promise<void>
  isLoading?: boolean
  isEdit?: boolean
  /** Shown after create / for floor staff */
  companyCode?: string | null
}

export function UserForm({
  initialData,
  onSubmit,
  isLoading,
  isEdit = false,
  companyCode,
}: UserFormProps) {
  const storeContext = useStoreContextOptional()
  const stores = storeContext?.stores ?? []
  const activeStores = stores.filter((s) => s.active)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      role: initialData?.role || UserRole.CASHIER,
      active: initialData?.active ?? true,
      storeIds:
        initialData?.storeIds ??
        (activeStores.length === 1 ? [activeStores[0]!.id] : []),
    },
  })

  const role = watch('role')
  const storeIds = watch('storeIds') ?? []
  const isFloorRole = role === UserRole.CASHIER || role === UserRole.SUPERVISOR
  const emailRequired = role === UserRole.ADMIN
  const needsStoreAssignment = isFloorRole

  const selectSingleStore = (storeId: string) => {
    setValue('storeIds', [storeId])
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {companyCode || initialData?.employeeCode ? (
        <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
          {companyCode ? (
            <p>
              <span className="font-medium">Código de empresa:</span>{' '}
              <code className="select-all">{companyCode}</code>
            </p>
          ) : null}
          {initialData?.employeeCode ? (
            <p>
              <span className="font-medium">Código de empleado:</span>{' '}
              <code className="select-all">{initialData.employeeCode}</code>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre Completo <span className="text-red-500">*</span></Label>
          <Input id="name" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">
            Email {emailRequired ? <span className="text-red-500">*</span> : (
              <span className="text-muted-foreground font-normal">(opcional para cajero)</span>
            )}
          </Label>
          <Input id="email" type="email" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">
            {isEdit ? 'Nueva Contraseña' : 'Contraseña'} {!isEdit && <span className="text-red-500">*</span>}
          </Label>
          <Input id="password" type="password" {...register('password')} className={errors.password ? 'border-red-500' : ''} />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          {isEdit && <p className="text-xs text-gray-500">Deja en blanco para mantener la contraseña actual</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Rol <span className="text-red-500">*</span></Label>
          <Select value={role} onValueChange={(value) => setValue('role', value as UserRole)}>
            <SelectTrigger id="role" className={errors.role ? 'border-red-500' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
              <SelectItem value={UserRole.CASHIER}>Cajero</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
          {isFloorRole && (
            <p className="text-xs text-muted-foreground">
              El cajero se crea como membresía USER (códigos de piso), sin rol CASHIER en la API.
            </p>
          )}
        </div>
      </div>

      {needsStoreAssignment && activeStores.length > 0 && (
        <div className="space-y-2">
          <Label>Local asignado</Label>
          <p className="text-sm text-muted-foreground">
            {activeStores.length === 1
              ? 'Se asignará el único local activo.'
              : 'Selecciona exactamente un local (obligatorio si hay varios).'}
          </p>
          <ScrollArea className="h-[160px] rounded-md border p-3">
            <div className="space-y-2">
              {activeStores.map((store) => (
                <div key={store.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`store-${store.id}`}
                    checked={(storeIds as string[]).includes(store.id)}
                    onCheckedChange={() => selectSingleStore(store.id)}
                  />
                  <Label
                    htmlFor={`store-${store.id}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {store.name} ({store.code})
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox id="active" {...register('active')} />
        <Label htmlFor="active" className="font-normal">Usuario activo</Label>
      </div>
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : isEdit ? 'Actualizar Usuario' : 'Crear Usuario'}</Button>
      </div>
    </form>
  )
}
