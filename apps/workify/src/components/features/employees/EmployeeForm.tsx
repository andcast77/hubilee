'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { workifyApi } from '@/lib/api/client';
import { Button, Input, InputField } from '@hubilee/ui';
import { usePositions } from '@/hooks/usePositions';

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  positionId?: string;
  birthDate: string;
  dateJoined: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

interface EmployeeFormProps {
  employee?: Partial<EmployeeFormData> & { id?: string };
  mode: 'create' | 'edit';
}

export default function EmployeeForm({ employee, mode }: EmployeeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [submitted, setSubmitted] = useState(false);
  const inputRefs = {
    firstName: useRef<HTMLInputElement>(null),
    lastName: useRef<HTMLInputElement>(null),
    idNumber: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    position: useRef<HTMLInputElement>(null),
    department: useRef<HTMLInputElement>(null),
  };
  
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    idNumber: employee?.idNumber || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    address: employee?.address || '',
    department: employee?.department || '',
    positionId: employee?.positionId || '',
    birthDate: String(employee?.birthDate ?? ''),
    dateJoined: String(employee?.dateJoined ?? new Date().toISOString().split('T')[0]),
    status: employee?.status || 'ACTIVE',
  });

  // Utilidad para validar año mínimo en campos de fecha
  const isValidYear = (value: string) => {
    const year = Number(value.split('-')[0]);
    return year >= 1900;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Validación personalizada para campos de fecha
    if ((name === 'birthDate' || name === 'dateJoined') && value && !isValidYear(value)) {
      setError('El año no puede ser menor a 1900');
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error si se corrige un campo de fecha
    if ((name === 'birthDate' || name === 'dateJoined') && error) {
      setError(null);
    }
  };

  // Validación individual de campos
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) return 'El nombre es requerido';
        break;
      case 'lastName':
        if (!value.trim()) return 'El apellido es requerido';
        break;
      case 'idNumber':
        if (!value.trim()) return 'El número de identificación es requerido';
        break;
      case 'email':
        if (!value.trim()) return 'El email es requerido';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'El formato del email no es válido';
        break;
      case 'position':
        if (!value.trim()) return 'La posición es requerida';
        break;
      case 'department':
        if (!value.trim()) return 'El departamento es requerido';
        break;
      default:
        break;
    }
    return '';
  };

  // Handler para onBlur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const errorMsg = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: errorMsg }));
    // Solo devolver el foco si el campo fue tocado y tiene error Y el usuario ya escribió algo
    if (errorMsg && value.trim() !== '') {
      setTimeout(() => {
        inputRefs[name as keyof typeof inputRefs]?.current?.focus();
      }, 0);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      setError('El nombre es requerido');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('El apellido es requerido');
      return false;
    }
    if (!formData.idNumber.trim()) {
      setError('El número de identificación es requerido');
      return false;
    }
    if (!formData.email.trim()) {
      setError('El email es requerido');
      return false;
    }
    if (!formData.positionId) {
      setError('El cargo/puesto es requerido');
      return false;
    }
    if (!formData.department.trim()) {
      setError('El departamento es requerido');
      return false;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('El formato del email no es válido');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Marcar todos los campos críticos como touched
    setTouched({
      firstName: true,
      lastName: true,
      idNumber: true,
      email: true,
      position: true,
      department: true,
    });
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dataToSend = {
        ...formData,
        birthDate: formData.birthDate || null,
        dateJoined: formData.dateJoined || null,
      };

      if (mode === 'create') {
        await workifyApi.post('/employees', dataToSend);
      } else {
        await workifyApi.put(`/employees/${employee?.id}`, dataToSend);
      }
      
      // Redirigir a la lista de empleados
      router.push('/employees');
      router.refresh(); // Refrescar la lista
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/employees');
  };

  const { positions, error: errorPositions } = usePositions();
  // Simulación de permisos: reemplaza esto por tu lógica real de permisos
  const userRole = 'ADMIN'; // o 'HR', 'EMPLOYEE', etc.
  const canEditPosition = userRole === 'ADMIN' || userRole === 'HR';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error al guardar empleado
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Información Personal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <InputField
              type="text"
              id="firstName"
              name="firstName"
              label="Nombre *"
              value={formData.firstName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              ref={inputRefs.firstName}
              placeholder="Juan"
              required
              error={(touched.firstName || submitted) ? fieldErrors.firstName : undefined}
            />
          </div>
          
          <div>
            <InputField
              type="text"
              id="lastName"
              name="lastName"
              label="Apellido *"
              value={formData.lastName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              ref={inputRefs.lastName}
              placeholder="Pérez"
              required
              error={(touched.lastName || submitted) ? fieldErrors.lastName : undefined}
            />
          </div>
          
          <div>
            <InputField
              type="text"
              id="idNumber"
              name="idNumber"
              label="Número de Identificación *"
              value={formData.idNumber}
              onChange={handleInputChange}
              onBlur={handleBlur}
              ref={inputRefs.idNumber}
              placeholder="12345678"
              required
              error={(touched.idNumber || submitted) ? fieldErrors.idNumber : undefined}
            />
          </div>
          
          <div>
            <InputField
              type="email"
              id="email"
              name="email"
              label="Email *"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              ref={inputRefs.email}
              placeholder="juan.perez@empresa.com"
              required
              error={(touched.email || submitted) ? fieldErrors.email : undefined}
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <Input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+54 11 1234-5678"
            />
          </div>
          
          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Nacimiento
            </label>
            <Input
              type="date"
              id="birthDate"
              name="birthDate"
              value={formData.birthDate ?? ''}
              onChange={handleInputChange}
              min="1900-01-01"
              max={new Date().getFullYear() + '-12-31'}
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Dirección
          </label>
          <Input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Av. Corrientes 1234, CABA"
          />
        </div>
      </div>

      {/* Información Laboral */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="positionId" className="block text-sm font-medium text-gray-700 mb-1">
              Cargo/Puesto *
            </label>
            {canEditPosition ? (
              <select
                id="positionId"
                name="positionId"
                value={formData.positionId || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecciona un cargo</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>
            ) : (
              <div className="py-2 px-3 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                {positions.find((pos) => pos.id === formData.positionId)?.name || 'Sin cargo asignado'}
              </div>
            )}
            {errorPositions && (
              <p className="text-sm text-red-600">{errorPositions}</p>
            )}
          </div>
          
          <div>
            <InputField
              type="text"
              id="department"
              name="department"
              label="Departamento *"
              value={formData.department}
              onChange={handleInputChange}
              onBlur={handleBlur}
              ref={inputRefs.department}
              placeholder="Tecnología"
              required
              error={(touched.department || submitted) ? fieldErrors.department : undefined}
            />
          </div>
          
          <div>
            <label htmlFor="dateJoined" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Ingreso *
            </label>
            <Input
              type="date"
              id="dateJoined"
              name="dateJoined"
              value={formData.dateJoined || ''}
              onChange={handleInputChange}
              required
              min="1900-01-01"
              max={new Date().getFullYear() + '-12-31'}
            />
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado *
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="SUSPENDED">Suspendido</option>
            </select>
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Guardando...' : mode === 'create' ? 'Crear Empleado' : 'Actualizar Empleado'}
        </Button>
      </div>
    </form>
  );
} 

