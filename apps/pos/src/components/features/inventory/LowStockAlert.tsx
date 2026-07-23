'use client'

import { useState } from 'react'
import { Link } from '@/lib/next-nav'
import { useLowStockProducts } from '@/hooks/useInventory'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hubilee/ui'
import { Skeleton } from '@hubilee/ui'
import { AlertTriangle, Package } from 'lucide-react'
import { Button } from '@hubilee/ui'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { IdentityCell } from '@/components/admin/IdentityCell'

export function LowStockAlert() {
  const [search, setSearch] = useState('')
  const { data: products, isLoading, error } = useLowStockProducts()

  const filtered = search.trim() && products
    ? products.filter(
        (p: any) =>
          (p.name ?? '').toLowerCase().includes(search.trim().toLowerCase()) ||
          (p.sku ?? '').toLowerCase().includes(search.trim().toLowerCase()),
      )
    : products

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50/50 p-8">
        <p className="text-sm text-red-600">Error al cargar productos con stock bajo: {String(error)}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Stock Actual</TableHead>
              <TableHead>Stock Mínimo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (!filtered || filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <Package className="h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold">
          {search ? 'No se encontraron productos' : 'No hay productos con stock bajo'}
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          {search
            ? 'No hay productos que coincidan con tu búsqueda.'
            : 'Todos los productos tienen suficiente inventario.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">
          Productos con Stock Bajo ({filtered.length})
        </h3>
      </div>

      <AdminListToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Buscar productos...',
        }}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Stock Actual</TableHead>
              <TableHead>Stock Mínimo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell>
                  <IdentityCell
                    title={product.name}
                    subtitle={product.sku ?? undefined}
                  />
                </TableCell>
                <TableCell>
                  {product.category ? (
                    <span className="text-sm text-gray-600">{product.category.name}</span>
                  ) : (
                    <span className="text-gray-400">Sin categoría</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-red-600">{product.stock}</span>
                </TableCell>
                <TableCell>
                  <span className="text-gray-600">{product.minStock}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Link to="/products/$id" params={{ id: product.id }}>
                    <Button variant="ghost" size="sm">
                      Ver Producto
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
