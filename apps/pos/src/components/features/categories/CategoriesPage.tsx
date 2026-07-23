'use client'

import { useState } from 'react'
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@hubilee/ui'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { IdentityCell } from '@/components/admin/IdentityCell'

export function CategoriesPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const { data = [], isLoading } = useCategories()
  const createMutation = useCreateCategory()
  const deleteMutation = useDeleteCategory()

  const filtered = search.trim()
    ? data.filter(
        (c: any) =>
          (c.name ?? '').toLowerCase().includes(search.trim().toLowerCase()) ||
          (c.description ?? '').toLowerCase().includes(search.trim().toLowerCase()),
      )
    : data

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Nueva categoria</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion" />
          <Button
            onClick={async () => {
              if (!name.trim()) return
              await createMutation.mutateAsync({ name: name.trim(), description: description || undefined })
              setName('')
              setDescription('')
            }}
            disabled={createMutation.isPending}
          >
            Crear
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminListToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Buscar categorías...',
            }}
          />
          {isLoading ? (
            <p>Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500">No se encontraron categorías.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded border p-2">
                  <IdentityCell
                    title={c.name}
                    subtitle={c.description || 'Sin descripcion'}
                  />
                  <Button variant="outline" onClick={() => deleteMutation.mutate(c.id)}>
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
