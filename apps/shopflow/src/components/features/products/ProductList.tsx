'use client'

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useProducts, useDeleteProduct } from '@/hooks/useProducts'
import { Button } from '@hubilee/ui'
import { Input } from '@hubilee/ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hubilee/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { Plus, Search, Package, AlertTriangle, Edit, Trash2, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import type { Product } from '@/types'
import { Badge } from '@hubilee/ui'

interface ProductListProps {
  onProductClick?: (product: Product) => void
}

export function ProductList({ onProductClick }: ProductListProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'price' | 'stock' | 'active' | 'category'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const query = {
    search: search || undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    active: activeFilter === 'all' ? undefined : activeFilter === 'active',
    page,
    limit: 20,
    sortBy,
    sortOrder,
  }

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
    setPage(1)
  }

  const SortIcon = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) return <ChevronsUpDown className="ml-1 h-4 w-4 text-muted-foreground" />
    return sortOrder === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    )
  }

  const { data, isLoading, error } = useProducts(query)
  const deleteProduct = useDeleteProduct()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  const isLowStock = (product: Product) => {
    return product.minStock !== null && product.stock <= product.minStock
  }

  const handleDelete = async (id: string, _name: string) => {
    try {
      await deleteProduct.mutateAsync(id)
    } catch {
      // Error already surfaced by mutation / list refetch
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with search and filters - always visible */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-10"
            />
          </div>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Link to="/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </Link>
      </div>

      {/* Error state - only table area */}
      {error && (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50/50 p-8">
          <p className="text-sm text-red-600">Error al cargar productos: {String(error)}</p>
        </div>
      )}

      {/* Loading skeleton - only table area */}
      {!error && isLoading && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Products Table */}
      {!error && !isLoading && (data?.products?.length ?? 0) > 0 ? (
        <>
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
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('sku')}>
                    SKU
                    <SortIcon column="sku" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('category')}>
                    Categoría
                    <SortIcon column="category" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('stock')}>
                    Stock
                    <SortIcon column="stock" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('price')}>
                    Precio
                    <SortIcon column="price" />
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
                {(data?.products ?? []).map((product) => (
                  <TableRow
                    key={product.id}
                    className={onProductClick ? 'cursor-pointer' : ''}
                    onClick={() => onProductClick?.(product)}
                  >
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-gray-500">{product.sku}</TableCell>
                    <TableCell>
                      {product.categoryName ? (
                        <Badge variant="outline">{product.categoryName}</Badge>
                      ) : (
                        <span className="text-gray-400">Sin categoría</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{product.stock}</span>
                        {isLowStock(product) && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      <Badge variant={product.active ? 'default' : 'secondary'}>
                        {product.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Link to="/products/$id" params={{ id: product.id }}>
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
                              <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará el producto &quot;{product.name}&quot;. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(product.id, product.name)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {deleteProduct.isPending ? 'Eliminando...' : 'Eliminar'}
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
          </div>

          {/* Pagination */}
          {(data?.pagination?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Mostrando {((page - 1) * query.limit) + 1} -{' '}
                {Math.min(page * query.limit, data?.pagination?.total ?? 0)} de{' '}
                {data?.pagination?.total ?? 0} productos
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (data?.pagination?.totalPages ?? 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      ) : !error && !isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <Package className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">No hay productos</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search
              ? 'No se encontraron productos que coincidan con tu búsqueda.'
              : 'Comienza agregando tu primer producto.'}
          </p>
          {!search && (
            <Link to="/products/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Button>
            </Link>
          )}
        </div>
      ) : null}
    </div>
  )
}
