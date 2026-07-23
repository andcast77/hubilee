'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hubilee/ui'
import { Button } from '@hubilee/ui'
import { Download, Trash2, HardDrive } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getBackupList, deleteBackup, getBackupDownloadUrl, type BackupItem } from '@/lib/services/backupApiService'
import { toast } from 'sonner'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { IdentityCell } from '@/components/admin/IdentityCell'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export function BackupList() {
  const [search, setSearch] = useState('')
  const { data: backups, isLoading, error, refetch } = useQuery({
    queryKey: ['backups'],
    queryFn: getBackupList,
  })

  const filtered = search.trim() && backups
    ? backups.filter(
        (b) =>
          b.filename.toLowerCase().includes(search.trim().toLowerCase()) ||
          b.type.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : backups

  const handleDownload = (filename: string) => {
    const url = getBackupDownloadUrl(filename)
    if (url) window.open(url, '_blank')
  }

  const handleDelete = async (filename: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este respaldo?')) return
    try {
      await deleteBackup(filename)
      refetch()
    } catch (err) {
      toast.error('Error al eliminar el respaldo: ' + String(err))
    }
  }

  if (isLoading) return <div className="flex items-center justify-center p-8 text-gray-500">Cargando respaldos...</div>
  if (error) return <div className="flex items-center justify-center p-8 text-red-500">Error: {String(error)}</div>

  if (!filtered || filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <HardDrive className="h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold">
          {search ? 'No se encontraron respaldos' : 'No hay respaldos'}
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          {search
            ? 'No hay respaldos que coincidan con tu búsqueda.'
            : 'Aún no se han creado respaldos del sistema.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AdminListToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Buscar respaldos...',
        }}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Archivo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Tamaño</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((backup: BackupItem) => (
              <TableRow key={backup.id}>
                <TableCell>
                  <IdentityCell
                    title={backup.filename}
                    subtitle={backup.type === 'database' ? 'Base de Datos' : 'Exportación'}
                  />
                </TableCell>
                <TableCell>
                  <span className="text-sm">{backup.type === 'database' ? 'Base de Datos' : 'Exportación'}</span>
                </TableCell>
                <TableCell>
                  {format(new Date(backup.createdAt), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}
                </TableCell>
                <TableCell>{formatFileSize(backup.size)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(backup.filename)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(backup.filename)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
