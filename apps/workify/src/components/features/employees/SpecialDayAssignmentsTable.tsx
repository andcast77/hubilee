'use client';

import { useState } from 'react';
import { workifyApi } from '@/lib/api/client';
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@hubilee/ui';
import SpecialDayAssignmentModal from './SpecialDayAssignmentModal';

interface SpecialDayAssignment {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    position: string | null;
    department: string | null;
  };
  date: string;
  type: 'GUARD' | 'HOLIDAY' | 'WEEKEND' | 'EMERGENCY' | 'OVERTIME';
  isMandatory: boolean;
  notes: string | null;
}

interface SpecialDayAssignmentsTableProps {
  assignments: SpecialDayAssignment[];
  loading?: boolean;
  onRefresh?: () => void;
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'GUARD':
      return 'Guardia';
    case 'HOLIDAY':
      return 'Feriado';
    case 'WEEKEND':
      return 'Fin de Semana';
    case 'EMERGENCY':
      return 'Emergencia';
    case 'OVERTIME':
      return 'Horas Extra';
    default:
      return type;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'GUARD':
      return 'bg-blue-100 text-blue-800';
    case 'HOLIDAY':
      return 'bg-red-100 text-red-800';
    case 'WEEKEND':
      return 'bg-purple-100 text-purple-800';
    case 'EMERGENCY':
      return 'bg-orange-100 text-orange-800';
    case 'OVERTIME':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function SpecialDayAssignmentsTable({
  assignments,
  loading = false,
  onRefresh
}: SpecialDayAssignmentsTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<SpecialDayAssignment | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCreateNew = () => {
    setEditingAssignment(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (assignment: SpecialDayAssignment) => {
    setEditingAssignment(assignment);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDelete = async (assignment: SpecialDayAssignment) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta asignación?')) {
      return;
    }

    try {
      await workifyApi.delete(`/employees/special-assignments/${assignment.id}`);
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Error al eliminar la asignación');
    }
  };

  const handleModalSuccess = () => {
    onRefresh?.();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded-t-lg"></div>
          <div className="space-y-3 p-6">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Button onClick={handleCreateNew}>
          + Nueva Asignación Especial
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay asignaciones especiales
            </h3>
            <p className="text-gray-600 mb-4">
              No se han configurado asignaciones especiales para días específicos.
            </p>
            <Button onClick={handleCreateNew}>
              Crear Primera Asignación
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Obligatorio</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">
                        {assignment.employee.firstName} {assignment.employee.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {assignment.employee.position} - {assignment.employee.department}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {formatDate(assignment.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(assignment.type)}>
                      {getTypeLabel(assignment.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={assignment.isMandatory ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {assignment.isMandatory ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {assignment.notes || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(assignment)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(assignment)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SpecialDayAssignmentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        assignment={editingAssignment ? {
          id: editingAssignment.id,
          employeeId: editingAssignment.employee.id,
          date: (editingAssignment.date || new Date().toISOString()).split('T')[0] as string,
          type: editingAssignment.type,
          isMandatory: editingAssignment.isMandatory,
          notes: editingAssignment.notes || '',
        } : {}}
        mode={modalMode}
        onSuccess={handleModalSuccess}
      />
    </>
  );
} 

