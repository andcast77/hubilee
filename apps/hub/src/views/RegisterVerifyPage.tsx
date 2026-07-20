"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError, runRegisterVerifyDeduped } from "@hubilee/shared";
import { authApi, accountApi } from "@/lib/api-client";
import {
  AuthLayout,
  AuthBrandDecorativePanel,
  AuthBrandWelcomeHeader,
  AuthBrandErrorAlert,
  AUTH_BRAND_CARD_CLASS,
  AUTH_BRAND_PRIMARY_BUTTON_CLASS,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hubilee/ui";

export function RegisterVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [done, setDone] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    setErrorMessage("");
    const token = searchParams.get("token")?.trim() ?? "";
    const emailParam = searchParams.get("email")?.trim().toLowerCase() ?? "";
    if (!token || !emailParam) {
      setErrorMessage("Enlace incompleto. Vuelve a registrarte y solicita un nuevo enlace.");
      setBusy(false);
      return;
    }

    try {
      await runRegisterVerifyDeduped(emailParam, token, async () => {
        const verifyRes = await authApi.verifyRegistrationLink({
          email: emailParam,
          token,
        });
        if (!verifyRes.success || !verifyRes.data?.user) {
          throw new Error(verifyRes.error || "No se pudo validar el enlace.");
        }

        try {
          await accountApi.acceptPrivacy();
        } catch {
          // non-blocking
        }

        setDone(true);
        router.replace("/dashboard");
      });
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Error al completar el registro.",
      );
    } finally {
      setBusy(false);
    }
  }, [router, searchParams]);

  useEffect(() => {
    void run();
  }, [run]);

  const decorativePanel = (
    <AuthBrandDecorativePanel
      badge={
        <>
          <span>Hub</span>
          <span>Hubilee</span>
        </>
      }
      title="Confirmando tu registro"
      description="Un momento mientras validamos tu enlace."
      quote={<>Empieza rápido, crece con claridad.</>}
    />
  );

  return (
    <AuthLayout variant="brand" contentClassName="max-w-lg" panel={decorativePanel}>
      <AuthBrandWelcomeHeader
        title={done ? "Redirigiendo…" : "Verificación"}
        subtitle={
          done
            ? "Tu cuenta está lista."
            : busy
              ? "Validando enlace…"
              : "Completa o corrige el registro"
        }
      />

      <Card className={AUTH_BRAND_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="text-white">Registro con enlace</CardTitle>
          <CardDescription className="text-white/60">
            {busy && !errorMessage
              ? "Por favor espera."
              : "Si algo falló, puedes volver al formulario de alta."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <AuthBrandErrorAlert variant="error">
              <p className="text-sm text-red-200">{errorMessage}</p>
            </AuthBrandErrorAlert>
          ) : null}
          {!busy && errorMessage ? (
            <Link href="/register" className={AUTH_BRAND_PRIMARY_BUTTON_CLASS + " inline-flex items-center justify-center"}>
              Volver al registro
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
