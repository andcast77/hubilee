'use client'

import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useUser } from '@/hooks/useUser'
import {
  useAttachMemberEmail,
  useCompanyMembers,
  useDeleteUser,
  useResetMemberPassword,
} from '@/hooks/useUsers'
import { formatUserCodeForDisplay, memberHasUserCode } from '@/lib/user-code'
import { Badge, Button, Input } from '@hubilee/ui'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hubilee/ui'
import { Label } from '@hubilee/ui'
import {
  Plus,
  User as UserIcon,
  Edit,
  Trash2,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Copy,
  KeyRound,
  Mail,
} from 'lucide-react'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { IdentityCell } from '@/components/admin/IdentityCell'
import { SoftStatusPill } from '@/components/admin/SoftStatusPill'
import type { UserRole } from '@/types'

const PAGE_SIZE = 20

type SortCol = 'name' | 'email' | 'role' | 'active'
type SortOrder = 'asc' | 'desc'

type MemberRow = {
  id: string
  name: string
  email: string | null
  role: string
  active: boolean
  userCode?: string | null
}

export function UserList() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortCol>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [resetTarget, setResetTarget] = useState<MemberRow | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [attachTarget, setAttachTarget] = useState<MemberRow | null>(null)
  const [attachEmail, setAttachEmail] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: currentUser, isLoading: isLoadingUser } = useUser()
  const companyId = currentUser?.companyId
  const companyMembersQuery = useCompanyMembers(companyId)
  const deleteUser = useDeleteUser()
  const resetPasswordMutation = useResetMemberPassword(companyId)
  const attachEmailMutation = useAttachMemberEmail(companyId)

  const allMembers = companyMembersQuery.data?.users ?? []
  const filteredAndPaginated = useMemo(() => {
    let list = allMembers
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (u) =>
          (u.email ?? '').toLowerCase().includes(q) ||
          (u.name ?? '').toLowerCase().includes(q) ||
          (u.userCode ?? '').includes(q),
      )
    }
    if (roleFilter !== 'all') {
      list = list.filter((u) => (u.role ?? 'USER') === roleFilter)
    }

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
          aVal = a.role ?? 'USER'
          bVal = b.role ?? 'USER'
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
        return 'Cajero'
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

  const copyUserCode = async (userCode: string) => {
    const display = formatUserCodeForDisplay(userCode)
    await navigator.clipboard.writeText(display.copyText)
  }

  const handleResetPassword = async () => {
    if (!resetTarget || resetPassword.length < 6) {
      setActionError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setActionError(null)
    try {
      await resetPasswordMutation.mutateAsync({
        userId: resetTarget.id,
        password: resetPassword,
      })
      setResetTarget(null)
      setResetPassword('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo restablecer')
    }
  }

  const handleAttachEmail = async () => {
    if (!attachTarget || !attachEmail.trim()) {
      setActionError('Introduce un email válido')
      return
    }
    setActionError(null)
    try {
      await attachEmailMutation.mutateAsync({
        userId: attachTarget.id,
        email: attachEmail.trim(),
      })
      setAttachTarget(null)
      setAttachEmail('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo asociar el email')
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
              <TableHead>Código</TableHead>
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
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
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
      <div className="rounded-md border p-8">
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AdminListToolbar
        search={{
          value: search,
          onChange: (v) => { setSearch(v); setPage(1) },
          placeholder: 'Buscar usuarios...',
        }}
        filters={
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="OWNER">Propietario</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
              <SelectItem value="USER">Cajero</SelectItem>
            </SelectContent>
          </Select>
        }
        primaryAction={{ label: 'Nuevo Usuario', href: '/admin/users/new' }}
      />

      {users.length > 0 ? (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" className="-ml-3 h-8 font-semibold" onClick={() => toggleSort('name')}>
                      Usuario
                      <SortIcon column="name" />
                    </Button>
                  </TableHead>
                  <TableHead>Código de usuario</TableHead>
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
                {users.map((user) => {
                  const userCode = user.userCode ?? null
                  return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <IdentityCell
                        title={user.name}
                        subtitle={user.email ?? undefined}
                      />
                    </TableCell>
                    <TableCell>
                      {userCode ? (
                        <code className="select-all text-sm">{userCode}</code>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <SoftStatusPill
                        status={user.active ? 'active' : 'inactive'}
                        label={user.active ? 'Activo' : 'Inactivo'}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {userCode ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Copiar código"
                            onClick={() => void copyUserCode(userCode)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {memberHasUserCode(user) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Restablecer contraseña"
                            onClick={() => {
                              setActionError(null)
                              setResetPassword('')
                              setResetTarget(user)
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {memberHasUserCode(user) && !user.email ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Asociar email"
                            onClick={() => {
                              setActionError(null)
                              setAttachEmail('')
                              setAttachTarget(user)
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        ) : null}
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
                  )
                })}
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
          <h3 className="mt-4 text-lg font-semibold">No hay usuarios de la tienda</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search ? 'No se encontraron usuarios.' : 'Comienza agregando el primer usuario de la tienda.'}
          </p>
          {!search && (
            <Link to="/admin/users/new" className="mt-4">
              <Button><Plus className="mr-2 h-4 w-4" />Nuevo Usuario</Button>
            </Link>
          )}
        </div>
      )}

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>
              Nueva contraseña para {resetTarget?.name}
              {resetTarget?.userCode ? ` (código ${resetTarget.userCode})` : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-password">Nueva contraseña</Label>
            <Input
              id="reset-password"
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              autoComplete="new-password"
            />
            {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleResetPassword()}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? 'Guardando…' : 'Restablecer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!attachTarget} onOpenChange={(open) => !open && setAttachTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asociar email</DialogTitle>
            <DialogDescription>
              Habilita login por email además del código de usuario para {attachTarget?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="attach-email">Email</Label>
            <Input
              id="attach-email"
              type="email"
              value={attachEmail}
              onChange={(e) => setAttachEmail(e.target.value)}
              autoComplete="email"
            />
            {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAttachTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleAttachEmail()}
              disabled={attachEmailMutation.isPending}
            >
              {attachEmailMutation.isPending ? 'Guardando…' : 'Asociar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
