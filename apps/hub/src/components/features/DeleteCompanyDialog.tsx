"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from "@hubilee/ui";
import { companyApi } from "@/lib/api-client";
import { clearTokenCookie } from "@/lib/auth";
import { AlertTriangle } from "lucide-react";

type DeleteCompanyDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
};

export function DeleteCompanyDialog({
  isOpen,
  onClose,
  companyId,
  companyName,
}: DeleteCompanyDialogProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText !== companyName) {
      setError("El nombre no coincide");
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await companyApi.deleteCompany(companyId);
      if (response.success) {
        // Clear token and redirect to login
        clearTokenCookie();
        router.replace("/login");
      } else {
        setError(response.error || "Error al eliminar la empresa");
      }
    } catch (err: any) {
      setError(err.message || "Error al eliminar la empresa");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText("");
      setError("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle>Eliminar empresa</DialogTitle>
          </div>
          <DialogDescription>
            Esta acción es permanente y no se puede deshacer. Se eliminarán todos los datos
            asociados a la empresa, incluyendo usuarios, productos, ventas y configuraciones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ Advertencia: Esta acción eliminará permanentemente la empresa y todos sus datos.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Para confirmar, escribe el nombre de la empresa:{" "}
              <span className="font-mono font-bold">{companyName}</span>
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
              placeholder={companyName}
              disabled={isDeleting}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== companyName}
          >
            {isDeleting ? "Eliminando..." : "Eliminar empresa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
