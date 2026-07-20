'use client'

import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useUser } from '@/hooks/useUser'
import { useCompanyMembers, useDeleteUser } from '@/hooks/useUsers'
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
import { Plus, Search, User as UserIcon, Edit, Trash2, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { Badge } from '@hubilee/ui'
import type { UserRole } from '@/types'

const PAGE_SIZE = 20

type SortCol = 'name' | 'email' | 'role' | 'active'
type SortOrder = 'asc' | 'desc'

export function UserList() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortCol>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const { data: currentUser, isLoading: isLoadingUser } = useUser()
  const companyId = currentUser?.companyId
  const companyMembersQuery = useCompanyMembers(companyId)
  const deleteUser = useDeleteUser()

  const allMembers = companyMembersQuery.data?.users ?? []
  const filteredAndPaginated = useMemo(() => {
    let list = allMembers
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (u) =>
          (u.email ?? '').toLowerCase().includes(q) ||
          (u.name ?? '').toLowerCase().includes(q)
      )
    }
    if (roleFilter !== 'all') {
      list = list.filter((u) => (u.role ?? 'USER') === roleFilter)
    }
    
    // Sort the list
    list = [...list].sort((a, b) => {
      let aVal: string | boolean
      let bVal: string | boolean
      
      switch (sortBy) {
        case 'name':
          aVal = (a.name ?? '').toLowerCase()
          bVal = (b.name ?? '').toLowerCase()
          break
        case 'email':
          aVal = (a.email ?? '').toLowerCase()
          bVal = (b.email ?? '').toLowerCase()
          break
        case 'role':
          aVal = (a.role ?? 'USER')
          bVal = (b.role ?? 'USER')
          break
        case 'active':
          aVal = a.active
          bVal = b.active
          break
        default:
          aVal = ''
          bVal = ''
      }
      
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder === 'asc' ? cmp : -cmp
    })
    
    const total = list.length
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const start = (page - 1) * PAGE_SIZE
    const paginated = list.slice(start, start + PAGE_SIZE)
    return { users: paginated, total, totalPages }
  }, [allMembers, search, roleFilter, page, sortBy, sortOrder])

  const { users, total: totalFiltered, totalPages } = filteredAndPaginated
  const pagination = {
    page,
    limit: PAGE_SIZE,
    total: totalFiltered,
    totalPages,
  }

  const getRoleBadgeVariant = (role: UserRole | string) => {
    switch (role) {
      case 'OWNER':
      case 'ADMIN':
        return 'default'
      case 'SUPERVISOR':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (role: UserRole | string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador'
      case 'OWNER':
        return 'Propietario'
      case 'USER':
        return 'Usuario'
      case 'SUPERVISOR':
        return 'Supervisor'
      case 'CASHIER':
        return 'Cajero'
      default:
        return String(role)
    }
  }

  const toggleSort = (column: SortCol) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
    setPage(1)
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
      await deleteUser.mutateAsync(id)
    } catch {
      // Error already surfaced by mutation / list refetch
    }
  }

  if (isLoadingUser) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-12 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <UserIcon className="h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold">Selecciona una empresa</h3>
        <p className="mt-2 text-center text-sm text-gray-500">
          Debes tener una empresa seleccionada para ver y gestionar los usuarios.
        </p>
      </div>
    )
  }

  if (companyMembersQuery.error) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50/50 p-8">
        <p className="text-sm text-red-600">Error al cargar usuarios: {String(companyMembersQuery.error)}</p>
      </div>
    )
  }

  if (companyMembersQuery.isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-12 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar usuarios..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="OWNER">Propietario</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
              <SelectItem value="USER">Usuario</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Link to="/admin/users/new">
          <Button><Plus className="mr-2 h-4 w-4" />Nuevo Usuario</Button>
        </Link>
      </div>

      {users.length > 0 ? (
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
                    <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('email')}>
                      Email
                      <SortIcon column="email" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('role')}>
                      Rol
                      <SortIcon column="role" />
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
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'default' : 'secondary'}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to="/admin/users/$id" params={{ id: user.id }}>
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
                              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará el usuario &quot;{user.name}&quot;. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {deleteUser.isPending ? 'Eliminando...' : 'Eliminar'}
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
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Mostrando {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, pagination.total)} de {pagination.total}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}>Siguiente</Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <UserIcon className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">No hay usuarios</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search ? 'No se encontraron usuarios.' : 'Comienza agregando tu primer usuario.'}
          </p>
          {!search && (
            <Link to="/admin/users/new" className="mt-4">
              <Button><Plus className="mr-2 h-4 w-4" />Nuevo Usuario</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
