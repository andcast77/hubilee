'use client';

import { useState, useEffect } from 'react';
import { hrApi } from '@/lib/api/client';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hubilee/ui';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    date: string;
    description: string;
    isRecurring: boolean;
  }>({
    name: '',
    date: '',
    description: '',
    isRecurring: false
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const data = await hrApi.get<{ holidays: Holiday[] }>('/holidays');
      setHolidays(data.holidays || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingHoliday) {
        await hrApi.put(`/holidays/${editingHoliday.id}`, formData);
      } else {
        await hrApi.post('/holidays', formData);
      }
      await fetchHolidays();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving holiday:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este día no laboral?')) {
      return;
    }

    try {
      await hrApi.delete(`/holidays/${id}`);
      await fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: (holiday.date as string).split('T')[0] || new Date().toISOString().split('T')[0] || '', // Convert to YYYY-MM-DD format
      description: holiday.description || '',
      isRecurring: holiday.isRecurring
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingHoliday(null);
    setFormData({
      name: '',
      date: '',
      description: '',
      isRecurring: false
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isUpcoming = (dateString: string) => {
    const today = new Date();
    const holidayDate = new Date(dateString);
    return holidayDate >= today;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando días no laborales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Días No Laborales</h1>
          <p className="text-gray-600 mt-1">
            Gestiona feriados y días festivos que aparecerán como marcadores en el calendario
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Día No Laboral
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">¿Qué son los Días No Laborales?</h3>
              <p className="text-sm text-blue-700">
                Los días no laborales son feriados, festivos y otros días especiales donde la empresa no trabaja. 
                Estos días aparecerán marcados en el calendario de horas trabajadas y no se contarán como días laborales 
                para el cálculo de asistencia y horas trabajadas.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Holidays Table */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Días No Laborales</h2>
            <Badge variant="outline">
              {holidays.length} día{holidays.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {holidays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay días no laborales configurados</h3>
              <p className="text-gray-600 mb-4">
                Agrega feriados y días festivos para que aparezcan marcados en el calendario
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Día No Laboral
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Recurrente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell>
                        <div className="font-medium text-gray-900">{holiday.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {formatDate(holiday.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {holiday.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={holiday.isRecurring ? "default" : "secondary"}>
                          {holiday.isRecurring ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Anual
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              Único
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isUpcoming(holiday.date) ? "default" : "secondary"}>
                          {isUpcoming(holiday.date) ? (
                            <>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Próximo
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Pasado
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(holiday)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(holiday.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? 'Editar Día No Laboral' : 'Agregar Día No Laboral'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Día No Laboral *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Día de la Independencia"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descripción (opcional)</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción adicional del día no laboral..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                id="isRecurring"
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isRecurring">Se repite anualmente</Label>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingHoliday ? 'Actualizar' : 'Agregar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 

