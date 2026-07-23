"use client";

import { useState } from "react";
import { Button, Input, Label } from "@hubilee/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/next-nav";
import { useUser } from "@/hooks/useUser";
import { createStore } from "@/lib/services/storeService";
import {
  WizardShell,
  wizardFormStyles,
} from "@/components/auth/WizardShell";
import { toast } from "sonner";

const TOAST_MS = 4000;

export function LocalOnboardingPage() {
  const navigate = useNavigate();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName) {
      setFormError("El nombre del local es obligatorio");
      return;
    }
    if (!trimmedCode) {
      setFormError("El código del local es obligatorio");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await createStore({
        name: trimmedName,
        code: trimmedCode,
        ...(address.trim() ? { address: address.trim() } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Local creado. Se provisionó Caja principal automáticamente.", {
        duration: TOAST_MS,
      });
      setTimeout(() => {
        navigate({ to: "/app/dashboard", replace: true });
      }, 200);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al crear el local",
        { duration: TOAST_MS },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <WizardShell
      step="local"
      title="Creá tu primer local"
      subtitle="Al guardar, el sistema crea automáticamente la Caja principal. Sin paso de caja ni fondo de apertura."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="local-name" className={wizardFormStyles.labelClass}>
            Nombre del local <span className="text-red-500">*</span>
          </Label>
          <Input
            id="local-name"
            className={wizardFormStyles.inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Sucursal Centro"
            aria-label="Nombre del local"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="local-code" className={wizardFormStyles.labelClass}>
            Código <span className="text-red-500">*</span>
          </Label>
          <Input
            id="local-code"
            className={wizardFormStyles.inputClass}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ej: CENTRO"
            aria-label="Código del local"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="local-address" className={wizardFormStyles.labelClass}>
            Dirección
          </Label>
          <Input
            id="local-address"
            className={wizardFormStyles.inputClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Opcional"
            aria-label="Dirección del local"
          />
        </div>

        {formError ? (
          <p className="text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className={wizardFormStyles.primaryBtnClass}
        >
          {isSubmitting ? "Creando…" : "Crear local y continuar"}
        </Button>
      </form>
    </WizardShell>
  );
}
