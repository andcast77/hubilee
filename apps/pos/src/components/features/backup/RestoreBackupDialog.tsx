'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { Button } from '@hubilee/ui'
import { Input } from '@hubilee/ui'
import { Label } from '@hubilee/ui'
import { Upload, AlertTriangle } from 'lucide-react'
import { restoreBackup } from '@/lib/services/backupApiService'
import { toast } from 'sonner'

export function RestoreBackupDialog() {
  const [filename, setFilename] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const queryClient = useQueryClient()

  const handleRestore = async () => {
    if (!filename.trim()) {
      toast.error('Por favor ingresa el nombre del archivo de respaldo')
      return
    }

    if (!confirm('⚠️ ADVERTENCIA: Esta acción restaurará la base de datos desde el respaldo. Todos los datos actuales serán reemplazados. ¿Estás seguro?')) {
      return
    }

    try {
      setIsRestoring(true)
      await restoreBackup(filename.trim())
      await queryClient.invalidateQueries({ queryKey: ['backups'] })
      toast.success('Base de datos restaurada exitosamente. La página se recargará.')
      window.location.reload()
    } catch (err) {
      toast.error('Error al restaurar respaldo: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <span className="flex items-center">
            <Upload className="mr-2 h-4 w-4" />
            Restaurar Respaldo
          </span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Restaurar desde Respaldo
          </AlertDialogTitle>
          <AlertDialogDescription>
            Ingresa el nombre del archivo de respaldo que deseas restaurar. Esta acción reemplazará todos los datos actuales.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="filename">Nombre del archivo</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="backup_2024-01-01_12-00-00.sql"
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRestore}
            disabled={isRestoring || !filename.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isRestoring ? 'Restaurando...' : 'Restaurar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
