'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@hubilee/ui'
import { HardDrive, Loader2 } from 'lucide-react'
import { createBackup } from '@/lib/services/backupApiService'
import { toast } from 'sonner'

export function CreateBackupButton() {
  const [isCreating, setIsCreating] = useState(false)
  const queryClient = useQueryClient()

  const handleCreate = async () => {
    if (!confirm('¿Deseas crear un respaldo de la base de datos ahora?')) return

    try {
      setIsCreating(true)
      await createBackup()
      await queryClient.invalidateQueries({ queryKey: ['backups'] })
      toast.success('Respaldo creado exitosamente')
    } catch (err) {
      toast.error('Error al crear respaldo: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Button onClick={handleCreate} disabled={isCreating}>
      {isCreating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creando...
        </>
      ) : (
        <>
          <HardDrive className="mr-2 h-4 w-4" />
          Crear Respaldo
        </>
      )}
    </Button>
  )
}
