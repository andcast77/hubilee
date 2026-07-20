'use client';

import { useState, useEffect } from 'react';
import { workifyApi } from '@/lib/api/client';
import { Badge, Button, Card } from '@hubilee/ui';
import { 
  Plus, 
  Clock, 
  Moon, 
  Sun,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface WorkShift {
  id: string;
  name: string;
  description: string | null;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  tolerance: number;
  isActive: boolean;
  isNightShift: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function WorkShiftsPage() {
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTime: '08:00',
    endTime: '16:00',
    breakStart: '',
    breakEnd: '',
    tolerance: 15,
    isActive: true,
    isNightShift: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkShifts();
  }, []);

  const fetchWorkShifts = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await workifyApi.get<{ workShifts: WorkShift[] }>('/work-shifts');
      setWorkShifts(data.workShifts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);

      await workifyApi.post('/work-shifts', {
        ...formData,
        breakStart: formData.breakStart || null,
        breakEnd: formData.breakEnd || null,
      });

      // Limpiar formulario y recargar datos
      setFormData({
        name: '',
        description: '',
        startTime: '08:00',
        endTime: '16:00',
        breakStart: '',
        breakEnd: '',
        tolerance: 15,
        isActive: true,
        isNightShift: false
      });
      setShowForm(false);
      await fetchWorkShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : 
              type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              value
    }));
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // Mostrar solo HH:MM
  };

  const getShiftIcon = (isNightShift: boolean) => {
    return isNightShift ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Turnos de Trabajo</h1>
          <p className="text-gray-600">Gestiona los horarios y turnos de la empresa</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Turno
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Formulario de creación */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Crear Nuevo Turno</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Turno *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Inicio *
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Fin *
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inicio Descanso
                </label>
                <input
                  type="time"
                  name="breakStart"
                  value={formData.breakStart}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fin Descanso
                </label>
                <input
                  type="time"
                  name="breakEnd"
                  value={formData.breakEnd}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tolerancia (minutos)
                </label>
                <input
                  type="number"
                  name="tolerance"
                  value={formData.tolerance}
                  onChange={handleInputChange}
                  min="0"
                  max="60"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Turno Activo</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isNightShift"
                  checked={formData.isNightShift}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Turno Nocturno</span>
              </label>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Turno'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de turnos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workShifts.map((shift) => (
          <Card key={shift.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {getShiftIcon(shift.isNightShift)}
                <h3 className="text-lg font-semibold text-gray-900">{shift.name}</h3>
              </div>
              <Badge variant={shift.isActive ? 'default' : 'secondary'}>
                {shift.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            {shift.description && (
              <p className="text-gray-600 text-sm mb-4">{shift.description}</p>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                </span>
              </div>

              {shift.breakStart && shift.breakEnd && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">☕</span>
                  <span className="text-gray-700">
                    Descanso: {formatTime(shift.breakStart)} - {formatTime(shift.breakEnd)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">⏰</span>
                <span className="text-gray-700">
                  Tolerancia: {shift.tolerance} min
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {workShifts.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay turnos configurados</h3>
          <p className="text-gray-600 mb-4">
            Comienza creando el primer turno de trabajo para tu empresa.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Primer Turno
          </Button>
        </Card>
      )}
    </div>
  );
} 

