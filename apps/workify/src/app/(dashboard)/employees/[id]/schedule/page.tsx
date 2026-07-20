'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { workifyApi } from '@/lib/api/client';
import { Badge, Button, Card } from '@hubilee/ui';
import { 
  Edit, 
  Save,
  X,
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
}

interface Schedule {
  id: string;
  dayOfWeek: number;
  isWorkDay: boolean;
  workShiftId: string | null;
  workShift: WorkShift | null;
  customStartTime?: string;
  customEndTime?: string;
  customBreakStart?: string;
  customBreakEnd?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function EmployeeSchedulePage() {
  const params = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    isWorkDay: true,
    workShiftId: '',
    customStartTime: '08:00',
    customEndTime: '16:00',
    customBreakStart: '',
    customBreakEnd: '',
    useCustomSchedule: false
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const employeeData = await workifyApi.get<{ employee: typeof employee }>(`/employees/${params.id}`);
      setEmployee(employeeData.employee);

      const shiftsData = await workifyApi.get<{ workShifts: typeof workShifts }>('/work-shifts');
      setWorkShifts(shiftsData.workShifts || []);

      try {
        const schedulesData = await workifyApi.get<{ schedules: typeof schedules }>(`/employees/${params.id}/schedule`);
        setSchedules(schedulesData.schedules || []);
      } catch {
        // Initialize empty schedules for all days
        const emptySchedules = dayNames.map((_, index) => ({
          id: `temp-${index}`,
          dayOfWeek: index,
          isWorkDay: index >= 1 && index <= 5, // Monday to Friday
          workShiftId: null,
          workShift: null,
          customStartTime: '08:00',
          customEndTime: '16:00',
          customBreakStart: '',
          customBreakEnd: ''
        }));
        setSchedules(emptySchedules);
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditDay = (dayOfWeek: number) => {
    const currentSchedule = schedules.find(s => s.dayOfWeek === dayOfWeek);
    setEditForm({
      isWorkDay: currentSchedule?.isWorkDay ?? true,
      workShiftId: currentSchedule?.workShiftId ?? '',
      customStartTime: currentSchedule?.customStartTime ?? '08:00',
      customEndTime: currentSchedule?.customEndTime ?? '16:00',
      customBreakStart: currentSchedule?.customBreakStart ?? '',
      customBreakEnd: currentSchedule?.customBreakEnd ?? '',
      useCustomSchedule: !currentSchedule?.workShiftId
    });
    setEditingDay(dayOfWeek);
  };

  const handleSaveDay = async () => {
    if (editingDay === null) return;

    try {
      setSaving(true);

      const scheduleData = {
        employeeId: params.id,
        dayOfWeek: editingDay,
        isWorkDay: editForm.isWorkDay,
        workShiftId: editForm.useCustomSchedule ? null : editForm.workShiftId,
        customStartTime: editForm.useCustomSchedule ? editForm.customStartTime : null,
        customEndTime: editForm.useCustomSchedule ? editForm.customEndTime : null,
        customBreakStart: editForm.useCustomSchedule ? editForm.customBreakStart : null,
        customBreakEnd: editForm.useCustomSchedule ? editForm.customBreakEnd : null
      };

      await workifyApi.post(`/employees/${params.id}/schedule`, scheduleData);

      // Update local state
      const updatedSchedules = schedules.map(schedule => 
        schedule.dayOfWeek === editingDay 
          ? {
              ...schedule,
              isWorkDay: editForm.isWorkDay,
              workShiftId: editForm.useCustomSchedule ? null : editForm.workShiftId,
              workShift: editForm.useCustomSchedule ? null : workShifts.find(ws => ws.id === editForm.workShiftId) || null,
              customStartTime: editForm.useCustomSchedule ? editForm.customStartTime : '',
              customEndTime: editForm.useCustomSchedule ? editForm.customEndTime : '',
              customBreakStart: editForm.useCustomSchedule ? editForm.customBreakStart : '',
              customBreakEnd: editForm.useCustomSchedule ? editForm.customBreakEnd : ''
            }
          : schedule
      );
      setSchedules(updatedSchedules);

      setEditingDay(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingDay(null);
  };

  const getScheduleDisplay = (schedule: Schedule) => {
    if (!schedule.isWorkDay) {
      return { text: 'No laborable', color: 'bg-gray-100 text-gray-600' };
    }

    if (schedule.workShift) {
      return { 
        text: `${schedule.workShift.name} (${schedule.workShift.startTime} - ${schedule.workShift.endTime})`,
        color: 'bg-blue-100 text-blue-800'
      };
    }

    if (schedule.customStartTime && schedule.customEndTime) {
      return { 
        text: `Personalizado (${schedule.customStartTime} - ${schedule.customEndTime})`,
        color: 'bg-green-100 text-green-800'
      };
    }

    return { text: 'Sin horario', color: 'bg-yellow-100 text-yellow-800' };
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Horarios de {employee?.firstName} {employee?.lastName}
          </h1>
          <p className="text-gray-600">Gestiona los horarios de trabajo del empleado</p>
        </div>
        <div className="flex space-x-3">
          <Link href={`/employees/${params.id}`}>
            <Button variant="secondary">
              Volver al Empleado
            </Button>
          </Link>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dayNames.map((dayName, index) => {
          const schedule = schedules.find(s => s.dayOfWeek === index);
          const isEditing = editingDay === index;
          const display = schedule ? getScheduleDisplay(schedule) : { text: 'Sin configurar', color: 'bg-gray-100 text-gray-600' };

          return (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{dayName}</h3>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditDay(index)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`workDay-${index}`}
                      checked={editForm.isWorkDay}
                      onChange={(e) => setEditForm(prev => ({ ...prev, isWorkDay: e.target.checked }))}
                      className="mr-2"
                    />
                    <label htmlFor={`workDay-${index}`} className="text-sm">
                      Día laborable
                    </label>
                  </div>

                  {editForm.isWorkDay && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de horario
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`scheduleType-${index}`}
                              checked={!editForm.useCustomSchedule}
                              onChange={() => setEditForm(prev => ({ ...prev, useCustomSchedule: false }))}
                              className="mr-2"
                            />
                            <span className="text-sm">Usar turno existente</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`scheduleType-${index}`}
                              checked={editForm.useCustomSchedule}
                              onChange={() => setEditForm(prev => ({ ...prev, useCustomSchedule: true }))}
                              className="mr-2"
                            />
                            <span className="text-sm">Horario personalizado</span>
                          </label>
                        </div>
                      </div>

                      {!editForm.useCustomSchedule ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Seleccionar turno
                          </label>
                          <select
                            value={editForm.workShiftId}
                            onChange={(e) => setEditForm(prev => ({ ...prev, workShiftId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Seleccionar turno...</option>
                            {workShifts.map(shift => (
                              <option key={shift.id} value={shift.id}>
                                {shift.name} ({shift.startTime} - {shift.endTime})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Hora de entrada
                            </label>
                            <input
                              type="time"
                              value={editForm.customStartTime}
                              onChange={(e) => setEditForm(prev => ({ ...prev, customStartTime: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Hora de salida
                            </label>
                            <input
                              type="time"
                              value={editForm.customEndTime}
                              onChange={(e) => setEditForm(prev => ({ ...prev, customEndTime: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Inicio descanso (opcional)
                            </label>
                            <input
                              type="time"
                              value={editForm.customBreakStart}
                              onChange={(e) => setEditForm(prev => ({ ...prev, customBreakStart: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fin descanso (opcional)
                            </label>
                            <input
                              type="time"
                              value={editForm.customBreakEnd}
                              onChange={(e) => setEditForm(prev => ({ ...prev, customBreakEnd: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveDay}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Guardar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Badge className={display.color}>
                    {display.text}
                  </Badge>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
} 