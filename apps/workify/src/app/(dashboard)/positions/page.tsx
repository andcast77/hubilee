"use client";

import { useState, useEffect } from 'react';
import { workifyApi } from '@/lib/api/client';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hubilee/ui';
import { Plus, Edit, Trash2, Users, DollarSign, Clock, Calendar, Shield, Heart } from 'lucide-react';

interface Position {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  paymentType: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'PROJECT' | 'COMMISSION';
  currency: string;
  baseSalary?: number;
  hourlyRate?: number;
  dailyRate?: number;
  overtimeRate?: number;
  nightShiftRate?: number;
  holidayRate?: number;
  standardHoursPerDay: number;
  standardHoursPerWeek: number;
  standardDaysPerWeek: number;
  hasHealthInsurance: boolean;
  hasRetirementPlan: boolean;
  hasVacationDays: boolean;
  vacationDaysPerYear: number;
  hasSickDays: boolean;
  sickDaysPerYear: number;
  employeeCount?: number;
}

const paymentTypes = [
  { value: 'HOURLY', label: 'Por Hora', icon: '⏰' },
  { value: 'DAILY', label: 'Por Día', icon: '📅' },
  { value: 'WEEKLY', label: 'Por Semana', icon: '📊' },
  { value: 'MONTHLY', label: 'Mensual', icon: '💰' },
  { value: 'YEARLY', label: 'Anual', icon: '📈' },
  { value: 'PROJECT', label: 'Por Proyecto', icon: '🎯' },
  { value: 'COMMISSION', label: 'Por Comisión', icon: '💸' }
];

const currencies = [
  { value: 'USD', label: 'USD - Dólar Estadounidense' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'PEN', label: 'PEN - Sol Peruano' },
  { value: 'COP', label: 'COP - Peso Colombiano' },
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'ARS', label: 'ARS - Peso Argentino' }
];

export default function PositionsPage() {
  const [ positions, setPositions ] = useState<Position[]>([]);
  const [ loading, setLoading] = useState(true);
  const [ isModalOpen, setIsModalOpen] = useState(false);
  const [ editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [ formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    paymentType: 'HOURLY',
    currency: 'ARS',
    baseSalary: '',
    hourlyRate: '',
    dailyRate: '',
    overtimeRate: '',
    nightShiftRate: '',
    holidayRate: '',
    standardHoursPerDay: '',
    standardHoursPerWeek: '',
    standardDaysPerWeek: '',
    hasHealthInsurance: false,
    hasRetirementPlan: false,
    hasVacationDays: true,
    vacationDaysPerYear: '',
    hasSickDays: true,
    sickDaysPerYear: ''
  });
  
  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const data = await workifyApi.get<{ positions: Position[] }>('/positions');
      setPositions(data.positions || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      
      if (editingPosition) {
        await workifyApi.put(`/positions/${editingPosition.id}`, {
          ...formData,
          baseSalary: formData.baseSalary ? parseFloat(formData.baseSalary) : null,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : null,
          overtimeRate: parseFloat(formData.overtimeRate),
          nightShiftRate: parseFloat(formData.nightShiftRate),
          holidayRate: parseFloat(formData.holidayRate),
          standardHoursPerDay: parseFloat(formData.standardHoursPerDay),
          standardHoursPerWeek: parseFloat(formData.standardHoursPerWeek),
          standardDaysPerWeek: parseInt(formData.standardDaysPerWeek),
          vacationDaysPerYear: parseInt(formData.vacationDaysPerYear),
          sickDaysPerYear: parseInt(formData.sickDaysPerYear),
        });
      } else {
        await workifyApi.post('/positions', {
          ...formData,
          baseSalary: formData.baseSalary ? parseFloat(formData.baseSalary) : null,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : null,
          overtimeRate: parseFloat(formData.overtimeRate),
          nightShiftRate: parseFloat(formData.nightShiftRate),
          holidayRate: parseFloat(formData.holidayRate),
          standardHoursPerDay: parseFloat(formData.standardHoursPerDay),
          standardHoursPerWeek: parseFloat(formData.standardHoursPerWeek),
          standardDaysPerWeek: parseInt(formData.standardDaysPerWeek),
          vacationDaysPerYear: parseInt(formData.vacationDaysPerYear),
          sickDaysPerYear: parseInt(formData.sickDaysPerYear),
        });
      }

      await fetchPositions();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving position:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta posicion?')) {
      return;
    }

    try {
      await workifyApi.delete(`/positions/${id}`);
      await fetchPositions();
    } catch (error) {
      console.error('Error deleting position:', error);
    }
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      description: position.description || '',
      isActive: position.isActive,
      paymentType: position.paymentType,
      currency: position.currency,
      baseSalary: position.baseSalary?.toString() || '',
      hourlyRate: position.hourlyRate?.toString() || '',
      dailyRate: position.dailyRate?.toString() || '',
      overtimeRate: position.overtimeRate?.toString() || '1.5',
      nightShiftRate: position.nightShiftRate?.toString() || '1.25',
      holidayRate: position.holidayRate?.toString() || '2.0',
      standardHoursPerDay: position.standardHoursPerDay.toString(),
      standardHoursPerWeek: position.standardHoursPerWeek.toString(),
      standardDaysPerWeek: position.standardDaysPerWeek.toString(),
      hasHealthInsurance: position.hasHealthInsurance,
      hasRetirementPlan: position.hasRetirementPlan,
      hasVacationDays: position.hasVacationDays,
      vacationDaysPerYear: position.vacationDaysPerYear.toString(),
      hasSickDays: position.hasSickDays,
      sickDaysPerYear: position.sickDaysPerYear.toString()
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPosition(null);
    setFormData({
      name: '',
      description: '',
      isActive: true,
      paymentType: 'HOURLY',
      currency: 'USD',
      baseSalary: '',
      hourlyRate: '',
      dailyRate: '',
      overtimeRate: '1.5',
      nightShiftRate: '1.25',
      holidayRate: '2.0',
      standardHoursPerDay: '8.0',
      standardHoursPerWeek: '40.0',
      standardDaysPerWeek: '5',
      hasHealthInsurance: false,
      hasRetirementPlan: false,
      hasVacationDays: true,
      vacationDaysPerYear: '15',
      hasSickDays: true,
      sickDaysPerYear: '10'
    });
  };

  const getPaymentTypeInfo = (paymentType: string) => {
    return paymentTypes.find(type => type.value === paymentType);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando posiciones...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posiciones</h1>
          <p className="text-gray-600 mt-1">
            Gestiona posiciones y esquemas de pago de los empleados
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Crear Nueva Posicion
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">¿Qué son las Posiciones?</h3>
              <p className="text-sm text-blue-700">
                Las posiciones definen las responsabilidades y esquemas de pago de los empleados. 
                Cada posición incluye información sobre salarios, beneficios, horas de trabajo y tarifas especiales 
                como horas extra, turnos nocturnos y días festivos.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Posiciones</h2>
            <Badge variant="outline">
              {positions.length} posición{positions.length !== 1 ? 'es' : ''}
            </Badge>
          </div>

          {positions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay posiciones configuradas</h3>
              <p className="text-gray-600 mb-4">
                Crea posiciones para definir esquemas de pago de los empleados
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Posicion
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posicion</TableHead>
                    <TableHead>Tipo de Pago</TableHead>
                    <TableHead>Tarifa</TableHead>
                    <TableHead>Horas Extra</TableHead>
                    <TableHead>Beneficios</TableHead>
                    <TableHead>Empleados</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => {
                    const paymentInfo = getPaymentTypeInfo(position.paymentType);
                    
                    return (
                      <TableRow key={position.id}>  
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{position.name}</div>
                            {position.description && (
                              <div className="text-sm text-gray-600">{position.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <span>{paymentInfo?.icon}</span>
                            {paymentInfo?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {position.paymentType === 'HOURLY' && position.hourlyRate && (
                              <span>{formatCurrency(position.hourlyRate, position.currency)}/h</span>
                            )}
                            {position.paymentType === 'DAILY' && position.dailyRate && (
                              <span>{formatCurrency(position.dailyRate, position.currency)}/día</span>
                            )}
                            {position.paymentType === 'MONTHLY' && position.baseSalary && (
                              <span>{formatCurrency(position.baseSalary, position.currency)}/mes</span>
                            )}
                            {!position.hourlyRate && !position.dailyRate && !position.baseSalary && (
                              <span className="text-gray-500">No definido</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {position.overtimeRate && (
                              <span className="text-orange-600">
                                {position.overtimeRate}x
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {position.hasHealthInsurance && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                <Heart className="w-3 h-3 mr-1" />
                                Salud
                              </Badge>
                            )}
                            {position.hasRetirementPlan && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                <Shield className="w-3 h-3 mr-1" />
                                Jubilación
                              </Badge>
                            )}
                            {position.hasVacationDays && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                <Calendar className="w-3 h-3 mr-1" />
                                {position.vacationDaysPerYear}d
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {position.employeeCount || 0} empleado{position.employeeCount !== 1 ? 's' : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={position.isActive ? "default" : "secondary"}>
                            {position.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(position)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(position.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPosition ? 'Editar Posicion' : 'Crear Nueva Posicion'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre de la Posicion *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Secretario, Desarrollador, Gerente"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="currency">Moneda</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la posicion y responsabilidades..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Payment Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Información de Pago
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentType">Tipo de Pago *</Label>
                  <Select value={formData.paymentType} onValueChange={(value) => setFormData({ ...formData, paymentType: value as 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'PROJECT' | 'COMMISSION' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.paymentType === 'HOURLY' && (
                  <div>
                    <Label htmlFor="hourlyRate">Tarifa por Hora ({formData.currency})</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                )}
                
                {formData.paymentType === 'DAILY' && (
                  <div>
                    <Label htmlFor="dailyRate">Tarifa por Día ({formData.currency})</Label>
                    <Input
                      id="dailyRate"
                      type="number"
                      step="0.01"
                      value={formData.dailyRate}
                      onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                )}
                
                {formData.paymentType === 'MONTHLY' && (
                  <div>
                    <Label htmlFor="baseSalary">Salario Base Mensual ({formData.currency})</Label>
                    <Input
                      id="baseSalary"
                      type="number"
                      step="0.01"
                      value={formData.baseSalary}
                      onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>

              {/* Special Rates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <Label htmlFor="overtimeRate">Multiplicador Horas Extra</Label>
                  <Input
                    id="overtimeRate"
                    type="number"
                    step="0.1"
                    value={formData.overtimeRate}
                    onChange={(e) => setFormData({ ...formData, overtimeRate: e.target.value })}
                    placeholder="1.5"
                  />
                </div>
                
                <div>
                  <Label htmlFor="nightShiftRate">Multiplicador Turno Nocturno</Label>
                  <Input
                    id="nightShiftRate"
                    type="number"
                    step="0.1"
                    value={formData.nightShiftRate}
                    onChange={(e) => setFormData({ ...formData, nightShiftRate: e.target.value })}
                    placeholder="1.25"
                  />
                </div>
                
                <div>
                  <Label htmlFor="holidayRate">Multiplicador Días Festivos</Label>
                  <Input
                    id="holidayRate"
                    type="number"
                    step="0.1"
                    value={formData.holidayRate}
                    onChange={(e) => setFormData({ ...formData, holidayRate: e.target.value })}
                    placeholder="2.0"
                  />
                </div>
              </div>
            </div>

            {/* Work Schedule */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horario de Trabajo
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="standardHoursPerDay">Horas por Día</Label>
                  <Input
                    id="standardHoursPerDay"
                    type="number"
                    step="0.5"
                    value={formData.standardHoursPerDay}
                    onChange={(e) => setFormData({ ...formData, standardHoursPerDay: e.target.value })}
                    placeholder="8.0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="standardHoursPerWeek">Horas por Semana</Label>
                  <Input
                    id="standardHoursPerWeek"
                    type="number"
                    step="0.5"
                    value={formData.standardHoursPerWeek}
                    onChange={(e) => setFormData({ ...formData, standardHoursPerWeek: e.target.value })}
                    placeholder="40.0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="standardDaysPerWeek">Días por Semana</Label>
                  <Input
                    id="standardDaysPerWeek"
                    type="number"
                    min="1"
                    max="7"
                    value={formData.standardDaysPerWeek}
                    onChange={(e) => setFormData({ ...formData, standardDaysPerWeek: e.target.value })}
                    placeholder="5"
                  />
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Beneficios y Bonificaciones
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    id="hasHealthInsurance"
                    type="checkbox"
                    checked={formData.hasHealthInsurance}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, hasHealthInsurance: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="hasHealthInsurance">Seguro de Salud</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    id="hasRetirementPlan"
                    type="checkbox"
                    checked={formData.hasRetirementPlan}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, hasRetirementPlan: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="hasRetirementPlan">Plan de Jubilación</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    id="hasVacationDays"
                    type="checkbox"
                    checked={formData.hasVacationDays}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, hasVacationDays: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="hasVacationDays">Días de Vacaciones</Label>
                </div>
                
                {formData.hasVacationDays && (
                  <div className="ml-6">
                    <Label htmlFor="vacationDaysPerYear">Días de vacaciones por año</Label>
                    <Input
                      id="vacationDaysPerYear"
                      type="number"
                      min="0"
                      value={formData.vacationDaysPerYear}
                      onChange={(e) => setFormData({ ...formData, vacationDaysPerYear: e.target.value })}
                      placeholder="15"
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <input
                    id="hasSickDays"
                    type="checkbox"
                    checked={formData.hasSickDays}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, hasSickDays: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="hasSickDays">Días de Enfermedad</Label>
                </div>
                
                {formData.hasSickDays && (
                  <div className="ml-6">
                    <Label htmlFor="sickDaysPerYear">Días de enfermedad por año</Label>
                    <Input
                      id="sickDaysPerYear"
                      type="number"
                      min="0"
                      value={formData.sickDaysPerYear}
                      onChange={(e) => setFormData({ ...formData, sickDaysPerYear: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="border-t pt-6">
              <div className="flex items-center space-x-2">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive">Posicion Activa</Label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingPosition ? 'Actualizar' : 'Crear'} Posicion
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 

