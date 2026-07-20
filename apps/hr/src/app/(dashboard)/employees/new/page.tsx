import EmployeeForm from '@/components/features/employees/EmployeeForm';

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agregar Empleado</h1>
        <p className="text-gray-600">Registra un nuevo empleado en tu empresa</p>
      </div>
      
      <EmployeeForm mode="create" />
    </div>
  );
} 
