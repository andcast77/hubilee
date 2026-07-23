'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/lib/next-nav'
import { useCustomers, useDeleteCustomer } from '@/hooks/useCustomers'
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
import { Edit, Trash2, ChevronsUpDown, ChevronUp, ChevronDown, Phone } from 'lucide-react'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { IdentityCell } from '@/components/admin/IdentityCell'
import { SoftStatusPill } from '@/components/admin/SoftStatusPill'
import type { Customer } from '@/types'

interface CustomerListProps {
  onCustomerClick?: (customer: Customer) => void
}

type SortCol = 'name' | 'email' | 'phone' | 'city' | 'sales'
type SortOrder = 'asc' | 'desc'

export function CustomerList({ onCustomerClick }: CustomerListProps) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortCol>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const PAGE_LIMIT = 20
  const [page, setPage] = useState(1)

  const apiSortBy = sortBy === 'city' ? 'name' : sortBy

  const query = {
    search: search || undefined,
    page,
    limit: PAGE_LIMIT,
    sortBy: apiSortBy,
    sortOrder,
  }

  const { data: customersResponse, isLoading, error } = useCustomers(query)
  const deleteCustomer = useDeleteCustomer()

  type CustomerWithCount = Customer & { _count?: { sales: number } }
  const customers = (customersResponse?.customers ?? []) as CustomerWithCount[]
  const pagination = customersResponse?.pagination

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
      await deleteCustomer.mutateAsync(id)
    } catch {
      // Error already surfaced by mutation / list refetch
    }
  }

  return (
    <div className="space-y-4">
      {/* AdminListToolbar: search + CTA */}
      <AdminListToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Buscar clientes...',
        }}
        primaryAction={{ label: 'Crear Cliente', href: '/customers/new' }}
      />

      {/* Error state */}
      {error && (
        <div
          data-testid="list-error"
          className="flex items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50/50 p-8"
        >
          <p className="text-sm text-red-600">Error al cargar clientes: {String(error)}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {!error && isLoading && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Compras</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Customers Table */}
      {!error && !isLoading && customers && customers.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('name')}>
                    Cliente
                    <SortIcon column="name" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('phone')}>
                    Teléfono
                    <SortIcon column="phone" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('city')}>
                    Ciudad
                    <SortIcon column="city" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('sales')}>
                    Compras
                    <SortIcon column="sales" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className={onCustomerClick ? 'cursor-pointer' : ''}
                  onClick={() => onCustomerClick?.(customer)}
                >
                  <TableCell>
                    <IdentityCell
                      title={customer.name}
                      subtitle={customer.email ?? undefined}
                    />
                  </TableCell>
                  <TableCell>
                    {customer.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {customer.phone}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.city ? (
                      <span>{customer.city}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer._count?.sales !== undefined ? (
                      <span>{customer._count.sales}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <SoftStatusPill status="active" label="Activo" />
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Link to="/customers/$id" params={{ id: customer.id }}>
                        <Button variant="ghost" size="sm" title="Editar" aria-label="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Eliminar" aria-label="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará el cliente &quot;{customer.name}&quot;. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(customer.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {deleteCustomer.isPending ? 'Eliminando...' : 'Eliminar'}
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
        <div
          data-testid="list-empty"
          className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12"
        >
          <h3 className="text-lg font-semibold">No hay clientes</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search
              ? 'No se encontraron clientes que coincidan con tu búsqueda.'
              : 'Comienza agregando tu primer cliente.'}
          </p>
          {!search && (
            <Link to="/customers/new" className="mt-4">
              <Button>
                Crear Cliente
              </Button>
            </Link>
          )}
        </div>
      ) : null}
    </div>
  )
}
