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
  initialData?: Partial<CreateUserInput & { storeIds?: string[] }>
  onSubmit: (data: CreateUserInput | UpdateUserInput) => Promise<void>
  isLoading?: boolean
  isEdit?: boolean
}

export function UserForm({ initialData, onSubmit, isLoading, isEdit = false }: UserFormProps) {
  const storeContext = useStoreContextOptional()
  const stores = storeContext?.stores ?? []

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
      storeIds: initialData?.storeIds ?? [],
    },
  })

  const role = watch('role')
  const storeIds = watch('storeIds') ?? []
  const needsStoreAssignment = role === UserRole.SUPERVISOR || role === UserRole.CASHIER

  const toggleStore = (storeId: string) => {
    const current = storeIds as string[]
    if (current.includes(storeId)) {
      setValue('storeIds', current.filter((id) => id !== storeId))
    } else {
      setValue('storeIds', [...current, storeId])
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre Completo <span className="text-red-500">*</span></Label>
          <Input id="name" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
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
              <SelectItem value={UserRole.SUPERVISOR}>Supervisor</SelectItem>
              <SelectItem value={UserRole.CASHIER}>Cajero</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
        </div>
      </div>

      {needsStoreAssignment && stores.length > 0 && (
        <div className="space-y-2">
          <Label>Locales asignados</Label>
          <p className="text-sm text-muted-foreground">
            Selecciona los locales a los que tendrá acceso este usuario. Si no selecciona ninguno, se asignarán todos.
          </p>
          <ScrollArea className="h-[160px] rounded-md border p-3">
            <div className="space-y-2">
              {stores.filter((s) => s.active).map((store) => (
                <div key={store.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`store-${store.id}`}
                    checked={(storeIds as string[]).includes(store.id)}
                    onCheckedChange={() => toggleStore(store.id)}
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
