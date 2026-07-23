'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/lib/next-nav'
import { useSuppliers, useDeleteSupplier } from '@/hooks/useSuppliers'
import { Button } from '@hubilee/ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hubilee/ui'
import { Skeleton } from '@hubilee/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@hubilee/ui'
import { Truck, Edit, Trash2, ChevronsUpDown, ChevronUp, ChevronDown, Plus } from 'lucide-react'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { IdentityCell } from '@/components/admin/IdentityCell'
import { SoftStatusPill } from '@/components/admin/SoftStatusPill'

type SortCol = 'name' | 'contact' | 'location' | 'active'
type SortOrder = 'asc' | 'desc'

export function SupplierList() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortCol>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const PAGE_LIMIT = 20
  const [page, setPage] = useState(1)

  const query = {
    search: search || undefined,
    page,
    limit: PAGE_LIMIT,
    sortBy,
    sortOrder,
  }

  const { data: suppliersResponse, isLoading, error } = useSuppliers(query)
  const deleteSupplier = useDeleteSupplier()

  const suppliers = (suppliersResponse?.suppliers ?? []) as Array<any>
  const pagination = suppliersResponse?.pagination

  useEffect(() => {
    setPage(1)
  }, [search, sortBy, sortOrder])

  const toggleSort = (column: SortCol) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ column }: { column: SortCol }) => {
    if (sortBy !== column) return <ChevronsUpDown className="ml-1 h-4 w-4 text-muted-foreground" />
    return sortOrder === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    )
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSupplier.mutateAsync(id)
    } catch {
      // Error already surfaced by mutation / list refetch
    }
  }

  return (
    <div className="space-y-4">
      <AdminListToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Buscar proveedores...',
        }}
        primaryAction={{ label: 'Nuevo Proveedor', href: '/suppliers/new' }}
      />

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50/50 p-8">
          <p className="text-sm text-red-600">Error al cargar proveedores: {String(error)}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {!error && isLoading && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Suppliers Table */}
      {!error && !isLoading && suppliers && suppliers.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('name')}>
                    Nombre
                    <SortIcon column="name" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('contact')}>
                    Contacto
                    <SortIcon column="contact" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('location')}>
                    Ubicación
                    <SortIcon column="location" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('active')}>
                    Estado
                    <SortIcon column="active" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <IdentityCell
                      title={supplier.name}
                      subtitle={supplier.email ?? supplier.phone ?? undefined}
                    />
                  </TableCell>
                  <TableCell>
                    {supplier.city ? (
                      <span className="text-sm">{supplier.city}{supplier.state ? `, ${supplier.state}` : ''}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SoftStatusPill
                      status={supplier.active ? 'active' : 'inactive'}
                      label={supplier.active ? 'Activo' : 'Inactivo'}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link to="/suppliers/$id" params={{ id: supplier.id }}>
                        <Button variant="ghost" size="sm" title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará el proveedor &quot;{supplier.name}&quot;. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(supplier.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {deleteSupplier.isPending ? 'Eliminando...' : 'Eliminar'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : !error && !isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <Truck className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">No hay proveedores</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search ? 'No se encontraron proveedores.' : 'Comienza agregando tu primer proveedor.'}
          </p>
          {!search && (
            <Link to="/suppliers/new" className="mt-4">
              <Button><Plus className="mr-2 h-4 w-4" />Nuevo Proveedor</Button>
            </Link>
          )}
        </div>
      ) : null}
    </div>
  )
}
