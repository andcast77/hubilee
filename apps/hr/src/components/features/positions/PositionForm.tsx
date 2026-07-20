import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hubilee/ui';
import type { SalaryType, OvertimeType } from '@/types';

const salaryTypes = [
  { value: 'hour', label: 'Por Hora' },
  { value: 'day', label: 'Por Día' },
  { value: 'week', label: 'Por Semana' },
  { value: 'biweek', label: 'Por Quincena' },
  { value: 'month', label: 'Mensual' }
];

const overtimeTypes = [
  { value: 'multiplier', label: 'Multiplicador' },
  { value: 'fixed', label: 'Precio Fijo' }
];

export interface PositionFormProps {
  initialData?: Partial<{
    name: string;
    description: string;
    salaryAmount: number;
    salaryType: SalaryType;
    overtimeEligible: boolean;
    overtimeType: OvertimeType;
    overtimeValue: number;
    annualVacationDays: number;
    hasAguinaldo: boolean;
    monthlyBonus: number;
    level: string;
    isActive: boolean;
    notes: string;
  }>;
  onSubmit?: (data: Record<string, unknown>) => void;
  loading?: boolean;
}

export const PositionForm: React.FC<PositionFormProps> = ({ initialData = {}, onSubmit, loading }) => {
  const [form, setForm] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    salaryAmount: initialData.salaryAmount?.toString() || '',
    salaryType: initialData.salaryType || 'month',
    overtimeEligible: initialData.overtimeEligible ?? false,
    overtimeType: initialData.overtimeType || 'multiplier',
    overtimeValue: initialData.overtimeValue?.toString() || '',
    annualVacationDays: initialData.annualVacationDays?.toString() || '',
    hasAguinaldo: initialData.hasAguinaldo ?? true,
    monthlyBonus: initialData.monthlyBonus?.toString() || '',
    level: initialData.level || '',
    isActive: initialData.isActive ?? true,
    notes: initialData.notes || ''
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Validaciones mínimas
    if (!form.name.trim()) {
      setError('El nombre del cargo es requerido');
      return;
    }
    if (!form.salaryAmount || isNaN(Number(form.salaryAmount)) || Number(form.salaryAmount) <= 0) {
      setError('El monto de salario es requerido y debe ser un número positivo');
      return;
    }
    if (!form.salaryType) {
      setError('El tipo de salario es requerido');
      return;
    }
    if (form.overtimeEligible) {
      if (!form.overtimeType) {
        setError('El tipo de hora extra es requerido');
        return;
      }
      if (!form.overtimeValue || isNaN(Number(form.overtimeValue)) || Number(form.overtimeValue) <= 0) {
        setError('El valor de hora extra es requerido y debe ser un número positivo');
        return;
      }
    }
    // Enviar datos
    onSubmit?.({
      ...form,
      salaryAmount: Number(form.salaryAmount),
      overtimeValue: form.overtimeEligible ? Number(form.overtimeValue) : undefined,
      annualVacationDays: form.annualVacationDays ? Number(form.annualVacationDays) : undefined,
      monthlyBonus: form.monthlyBonus ? Number(form.monthlyBonus) : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información básica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nombre del Cargo *</Label>
          <Input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Ej: Desarrollador, Supervisor, Gerente"
            required
          />
        </div>
        <div>
          <Label htmlFor="level">Nivel/Categoría</Label>
          <Input
            id="level"
            name="level"
            value={form.level}
            onChange={handleChange}
            placeholder="Ej: Junior, Senior, Gerencial"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Descripción</Label>
        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Descripción del cargo y responsabilidades..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      {/* Salario */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Salario</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="salaryAmount">Monto *</Label>
            <Input
              id="salaryAmount"
              name="salaryAmount"
              type="number"
              step="0.01"
              value={form.salaryAmount}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <Label htmlFor="salaryType">Tipo de Salario *</Label>
            <Select value={form.salaryType} onValueChange={(value) => handleSelectChange('salaryType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {salaryTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {/* Horas extra */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Horas Extra</h3>
        <div className="flex items-center space-x-2 mb-4">
          <input
            id="overtimeEligible"
            name="overtimeEligible"
            type="checkbox"
            checked={form.overtimeEligible}
            onChange={handleChange}
            className="rounded border-gray-300"
          />
          <Label htmlFor="overtimeEligible">¿Elegible para horas extra?</Label>
        </div>
        {form.overtimeEligible && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="overtimeType">Tipo de Hora Extra *</Label>
              <Select value={form.overtimeType} onValueChange={(value) => handleSelectChange('overtimeType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {overtimeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="overtimeValue">Valor *</Label>
              <Input
                id="overtimeValue"
                name="overtimeValue"
                type="number"
                step="0.01"
                value={form.overtimeValue}
                onChange={handleChange}
                placeholder="Ej: 1.5 o 200"
                required={form.overtimeEligible}
              />
            </div>
          </div>
        )}
      </div>
      {/* Vacaciones, aguinaldo, bono */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Beneficios y Bonificaciones</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="annualVacationDays">Días de Vacaciones</Label>
            <Input
              id="annualVacationDays"
              name="annualVacationDays"
              type="number"
              min="0"
              value={form.annualVacationDays}
              onChange={handleChange}
              placeholder="15"
            />
          </div>
          <div className="flex items-center space-x-2 mt-7">
            <input
              id="hasAguinaldo"
              name="hasAguinaldo"
              type="checkbox"
              checked={form.hasAguinaldo}
              onChange={handleChange}
              className="rounded border-gray-300"
            />
            <Label htmlFor="hasAguinaldo">Aguinaldo</Label>
          </div>
          <div>
            <Label htmlFor="monthlyBonus">Bono Mensual</Label>
            <Input
              id="monthlyBonus"
              name="monthlyBonus"
              type="number"
              min="0"
              step="0.01"
              value={form.monthlyBonus}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
      {/* Estado y notas */}
      <div className="border-t pt-6">
        <div className="flex items-center space-x-2 mb-4">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            checked={form.isActive}
            onChange={handleChange}
            className="rounded border-gray-300"
          />
          <Label htmlFor="isActive">Cargo Activo</Label>
        </div>
        <div>
          <Label htmlFor="notes">Notas Internas</Label>
          <textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Notas internas para RRHH..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{error}</div>
      )}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" loading={loading || false} disabled={loading || false}>
          Guardar Cargo
        </Button>
      </div>
    </form>
  );
}; 

