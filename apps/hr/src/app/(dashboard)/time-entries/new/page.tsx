'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployees } from '@/hooks/useEmployees';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { Clock, Calendar, User, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTimeEntryPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '',
    clockOut: '',
    totalHours: '',
    breakTime: '',
    overtime: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Obtener empleados
  const { employees, loading: employeesLoading } = useEmployees({
    page: 1,
    limit: 100,
  });

  // Hook para crear time entries
  const { createTimeEntry } = useTimeEntries();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateHours = () => {
    if (formData.clockIn && formData.clockOut) {
      const start = new Date(`2000-01-01T${formData.clockIn}`);
      const end = new Date(`2000-01-01T${formData.clockOut}`);
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      const breakTime = parseFloat(formData.breakTime) || 0;
      const totalHours = Math.max(0, diffHours - breakTime);
      
      setFormData(prev => ({
        ...prev,
        totalHours: totalHours.toFixed(2)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.date) {
      setError('Empleado y fecha son requeridos');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createTimeEntry({
        employeeId: formData.employeeId,
        date: formData.date,
        ...(formData.clockIn && { clockIn: formData.clockIn }),
        ...(formData.clockOut && { clockOut: formData.clockOut }),
        ...(formData.totalHours && { totalHours: parseFloat(formData.totalHours) }),
        ...(formData.breakTime && { breakTime: parseFloat(formData.breakTime) }),
        ...(formData.overtime && { overtime: parseFloat(formData.overtime) }),
        ...(formData.notes && { notes: formData.notes }),
        source: 'MANUAL'
      });

      router.push('/time-entries');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear entrada de tiempo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (employeesLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/time-entries"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registrar Horas</h1>
            <p className="text-gray-600">Crear una nueva entrada de tiempo</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Empleado */}
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Empleado *
              </label>
              <select
                id="employeeId"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar empleado</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} - {employee.position || 'Sin posición'}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Fecha *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Hora de entrada */}
            <div>
              <label htmlFor="clockIn" className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Hora de Entrada
              </label>
              <input
                type="time"
                id="clockIn"
                name="clockIn"
                value={formData.clockIn}
                onChange={handleInputChange}
                onBlur={calculateHours}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Hora de salida */}
            <div>
              <label htmlFor="clockOut" className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Hora de Salida
              </label>
              <input
                type="time"
                id="clockOut"
                name="clockOut"
                value={formData.clockOut}
                onChange={handleInputChange}
                onBlur={calculateHours}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Horas totales */}
            <div>
              <label htmlFor="totalHours" className="block text-sm font-medium text-gray-700 mb-2">
                Horas Totales
              </label>
              <input
                type="number"
                id="totalHours"
                name="totalHours"
                value={formData.totalHours}
                onChange={handleInputChange}
                step="0.25"
                min="0"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tiempo de descanso */}
            <div>
              <label htmlFor="breakTime" className="block text-sm font-medium text-gray-700 mb-2">
                Tiempo de Descanso (horas)
              </label>
              <input
                type="number"
                id="breakTime"
                name="breakTime"
                value={formData.breakTime}
                onChange={handleInputChange}
                onBlur={calculateHours}
                step="0.25"
                min="0"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Horas extra */}
            <div>
              <label htmlFor="overtime" className="block text-sm font-medium text-gray-700 mb-2">
                Horas Extra
              </label>
              <input
                type="number"
                id="overtime"
                name="overtime"
                value={formData.overtime}
                onChange={handleInputChange}
                step="0.25"
                min="0"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Notas adicionales sobre la entrada de tiempo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Link
              href="/time-entries"
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Entrada'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 

