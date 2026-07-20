'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@hubilee/ui';
import SpecialDayAssignmentForm from './SpecialDayAssignmentForm';

interface SpecialDayAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: Partial<{
    id: string;
    employeeId: string;
    date: string;
    type: 'GUARD' | 'HOLIDAY' | 'WEEKEND' | 'EMERGENCY' | 'OVERTIME';
    isMandatory: boolean;
    notes: string;
  }>;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
}

export default function SpecialDayAssignmentModal({
  open,
  onOpenChange,
  assignment,
  mode,
  onSuccess
}: SpecialDayAssignmentModalProps) {
  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nueva Asignación Especial' : 'Editar Asignación'}
          </DialogTitle>
        </DialogHeader>
        
        <SpecialDayAssignmentForm
          {...(assignment && { assignment })}
          mode={mode}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
} 

