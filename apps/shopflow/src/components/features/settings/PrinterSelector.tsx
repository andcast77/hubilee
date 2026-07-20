'use client'

import { useState } from 'react'
import { usePrinters } from '@/hooks/usePrinters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hubilee/ui'
import { Label } from '@hubilee/ui'
import { Button } from '@hubilee/ui'
import { Input } from '@hubilee/ui'
import { Switch } from '@hubilee/ui'
import { Plus, Trash2, Printer, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@hubilee/ui'
import {
  Alert,
  AlertDescription,
} from '@hubilee/ui'

export function PrinterSelector() {
  const {
    printers,
    defaultPrinter,
    useConfiguredPrinter,
    isLoading,
    addPrinter,
    removePrinter,
    setDefault,
    setUseConfigured,
    refresh,
  } = usePrinters()
  const [newPrinterName, setNewPrinterName] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAddPrinter = async () => {
    if (!newPrinterName.trim()) return
    
    const printerName = newPrinterName.trim()
    addPrinter({
      name: printerName,
      type: 'STANDARD',
      description: 'Impresora configurada manualmente',
    })
    setNewPrinterName('')
    setIsDialogOpen(false)
    setUseConfigured(true)
    
    // Reload printers and set as default if it's the first one or no default is set
    const updatedPrinters = await refresh()
    if ((printers.length === 0 || !defaultPrinter) && updatedPrinters) {
      const newPrinter = updatedPrinters.find(p => p.name === printerName)
      if (newPrinter) {
        setDefault(newPrinter.id)
      }
    }
  }

  const handleToggleConfiguredPrinter = (checked: boolean) => {
    setUseConfigured(checked)
    if (checked && printers.length > 0 && !defaultPrinter) {
      setDefault(printers[0].id)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Configuración de Impresora</Label>
        <div className="h-10 w-full bg-gray-100 animate-pulse rounded-md" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Modo de Impresión */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="useConfigured">Usar Impresora Configurada</Label>
            <p className="text-xs text-gray-500">
              Si está desactivado, se abrirá el diálogo de impresión del sistema cada vez
            </p>
          </div>
          <Switch
            id="useConfigured"
            checked={useConfiguredPrinter}
            onCheckedChange={handleToggleConfiguredPrinter}
          />
        </div>

        {!useConfiguredPrinter && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Cuando imprimas un ticket, se abrirá automáticamente el diálogo de impresión del sistema 
              donde podrás seleccionar la impresora que desees usar.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Configuración de Impresora (solo si está activado) */}
      {useConfiguredPrinter && (
        <>
          <div className="space-y-2">
            <Label htmlFor="defaultPrinter">Impresora por Defecto</Label>
            <div className="flex gap-2">
              <Select
                value={defaultPrinter || ''}
                onValueChange={(value) => setDefault(value)}
              >
                <SelectTrigger id="defaultPrinter" className="flex-1">
                  <SelectValue placeholder="Seleccionar impresora" />
                </SelectTrigger>
                <SelectContent>
                  {printers.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">
                      No hay impresoras configuradas. Agrega una abajo.
                    </div>
                  ) : (
                    printers.map((printer) => (
                      <SelectItem key={printer.id} value={printer.id}>
                        {printer.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-gray-500">
              Selecciona la impresora que se usará por defecto para imprimir tickets
            </p>
          </div>

          {/* Agregar Impresora */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Impresoras Configuradas</Label>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Impresora
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Impresora</DialogTitle>
                    <DialogDescription>
                      Ingresa el nombre de la impresora que aparece en tu sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>¿Cómo encontrar el nombre?</strong>
                        <br />
                        Ve a Configuración → Dispositivos → Impresoras (Windows) o 
                        Configuración → Impresoras y escáneres (Mac). 
                        Copia el nombre exacto que aparece.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label htmlFor="printerName">Nombre de la Impresora</Label>
                      <Input
                        id="printerName"
                        value={newPrinterName}
                        onChange={(e) => setNewPrinterName(e.target.value)}
                        placeholder="Ej: HP LaserJet Pro M404dn"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddPrinter()
                          }
                        }}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAddPrinter}
                        disabled={!newPrinterName.trim()}
                      >
                        Agregar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {printers.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay impresoras configuradas. Agrega una para usar impresión automática.
              </p>
            ) : (
              <div className="space-y-2">
                {printers.map((printer) => (
                  <div
                    key={printer.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Printer className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{printer.name}</span>
                      {printer.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Por defecto
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePrinter(printer.id)}
                      title="Eliminar impresora"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
