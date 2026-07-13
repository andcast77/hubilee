'use client'

import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSuppliers, useDeleteSupplier } from '@/hooks/useSuppliers'
import { Button } from '@multisystem/ui'
import { Input } from '@multisystem/ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@multisystem/ui'
import { Skeleton } from '@multisystem/ui'
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
} from '@multisystem/ui'
import { Plus, Search, Truck, Mail, Phone, Edit, Trash2, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { Badge } from '@multisystem/ui'

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar proveedores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link to="/suppliers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proveedor
          </Button>
        </Link>
      </div>

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
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-gray-400" />
                      {supplier.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {supplier.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-gray-400" />
                          {supplier.email}
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {supplier.phone}
                        </div>
                      )}
                      {!supplier.email && !supplier.phone && (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.city ? (
                      <span className="text-sm">{supplier.city}{supplier.state ? `, ${supplier.state}` : ''}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.active ? 'default' : 'secondary'}>
                      {supplier.active ? 'Activo' : 'Inactivo'}
                    </Badge>
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
