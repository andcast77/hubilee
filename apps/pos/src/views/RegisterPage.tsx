"use client";

import { useState } from "react";
import { Link } from "@/lib/next-nav";
import { ApiError } from "@hubilee/shared";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@hubilee/ui";
import { authApi } from "@/lib/api/client";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { RegistrationTurnstile } from "@/components/auth/RegistrationTurnstile";
import { toast } from "sonner";

const TOAST_MS = 4000;

function notifyError(message: string) {
  toast.error(message, { duration: TOAST_MS });
}

// --- Style tokens mirroring LoginPage light shell ---

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const labelClass = "text-sm font-medium text-slate-600";
const inputClass =
  "h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0085db]/25 focus-visible:border-[#0085db]";
const primaryBtnClass =
  "h-12 w-full rounded-xl bg-[#0085db] text-base font-semibold text-white shadow-sm shadow-[#0085db]/25 hover:bg-[#0074c2] focus-visible:ring-[#0085db]";
const outlineBtnClass =
  "h-12 w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

type Step = "form" | "link-pending";

// --- Inline BrandMark (duplicated from LoginPage; no large shared module) ---

function BrandMark({
  imgClassName,
  textClassName,
}: {
  imgClassName: string;
  textClassName: string;
}) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5 rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0085db]/40"
    >
      <img
        src="/logo/isotipo/pos-isotipo.svg"
        alt="Hubilee Pos"
        width={36}
        height={36}
        className={imgClassName}
      />
      <span className={textClassName}>
        Hubilee <span className="text-[#0085db]">Pos</span>
      </span>
    </Link>
  );
}

// --- Register-themed visual panel (mirrors LoginVisualPanel) ---

function RegisterVisualPanel() {
  return (
    <div className="relative hidden h-full min-h-[420px] overflow-hidden rounded-l-[1.75rem] bg-gradient-to-br from-[#e8f4fc] via-[#f0f7ff] to-[#fff4eb] lg:block">
      <div
        aria-hidden
        className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#7ec8f5]/50 blur-2xl animate-[pos-blob_12s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-[#ffb07a]/45 blur-2xl animate-[pos-blob_14s_ease-in-out_infinite_reverse]"
      />
      <div className="relative z-10 flex h-full flex-col justify-between p-10">
        <BrandMark
          imgClassName="h-9 w-9"
          textClassName="text-lg font-bold tracking-tight text-slate-800"
        />

        <div className="mx-auto w-full max-w-[280px] animate-[pos-float_6s_ease-in-out_infinite]">
          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-xl shadow-slate-900/10 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Nueva empresa
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Plan</span>
                <span className="font-medium text-slate-900">Pos</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#0085db]/8 px-3 py-2 text-sm">
                <span className="text-[#0085db]">Cobrá rápido</span>
                <span className="font-semibold text-[#0085db]">→</span>
              </div>
            </div>
          </div>
        </div>

        <p className="max-w-[240px] text-sm leading-relaxed text-slate-600">
          Catálogo, ventas y stock desde un solo lugar.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export function RegisterPage() {
  const [form, setForm] = useState<RegisterInput>({
    email: "",
    password: "",
  });
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  function handleGoogleClick() {
    toast.message("El registro con Google estará disponible pronto.");
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      notifyError(parsed.error.issues[0]?.message || "Formulario inválido");
      return;
    }
    if (!captchaToken?.trim()) {
      notifyError("Completa la verificación anti-robots (captcha).");
      return;
    }
    setIsLoading(true);
    try {
      const d = parsed.data;
      await authApi.post("/register/link/send", {
        email: d.email.trim().toLowerCase(),
        captchaToken,
        verificationBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        password: d.password,
        hrEnabled: false,
        posEnabled: true,
      });
      setStep("link-pending");
      setCaptchaToken(null);
      setTurnstileKey((k) => k + 1);
    } catch (err) {
      notifyError(err instanceof ApiError ? err.message : "No se pudo enviar el enlace.");
    } finally {
      setIsLoading(false);
    }
  }

  async function resendLink() {
    setIsLoading(true);
    try {
      await authApi.post("/register/link/send", {
        email: form.email.trim().toLowerCase(),
        verificationBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        password: form.password,
        hrEnabled: false,
        posEnabled: true,
      });
    } catch (err) {
      notifyError(err instanceof ApiError ? err.message : "No se pudo reenviar el enlace.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] text-slate-900">
      {/* Background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[#9fd4f7]/55 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 h-[480px] w-[480px] rounded-full bg-[#ffc49a]/50 blur-3xl"
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] lg:grid-cols-2">
          <RegisterVisualPanel />

          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
            <div className="mb-8 lg:hidden">
              <BrandMark
                imgClassName="h-8 w-8"
                textClassName="text-lg font-bold tracking-tight text-slate-800"
              />
            </div>

            {step === "link-pending" ? (
              <div className="space-y-4">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Revisa tu correo
                </h1>
                <p className="text-sm text-slate-500">
                  Enlace enviado a{" "}
                  <strong className="text-slate-900">{form.email}</strong>
                </p>
                <p className="text-sm text-slate-500">
                  Abre el enlace del correo para crear tu cuenta. Puedes usar
                  otro navegador o dispositivo.
                </p>

                <div className="space-y-3 pt-2">
                  <p className="text-center text-xs text-slate-400">
                    ¿No recibiste el correo?
                  </p>
                  <p className="text-center text-xs text-slate-400">
                    Máximo 3 correos con enlace por intento (incluido el
                    primero). Luego espera o empieza de nuevo.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                  disabled={isLoading}
                    onClick={() => void resendLink()}
                    className="h-12 w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    {isLoading ? "Enviando…" : "Reenviar enlace"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Crear cuenta
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Completa los datos para usar Pos
                </p>

                <form
                  className="mt-8 space-y-4"
                  onSubmit={(e) => void sendLink(e)}
                >
                  <div className="space-y-2">
                    <Label className={labelClass}>Email</Label>
                    <Input
                      type="email"
                      className={inputClass}
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="tu@empresa.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>Contraseña</Label>
                    <Input
                      type="password"
                      className={inputClass}
                      value={form.password}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="sr-only">
                      Verificación antispam antes de enviar el enlace.
                    </span>
                    <RegistrationTurnstile
                      key={turnstileKey}
                      onToken={setCaptchaToken}
                      variant="compact"
                    />
                    <Button
                      type="submit"
                      className={primaryBtnClass}
                      disabled={isLoading}
                    >
                      {isLoading ? "Registrando…" : "Registrar empresa"}
                    </Button>
                  </div>
                </form>

                <div className="relative my-6">
                  <div
                    aria-hidden
                    className="absolute inset-0 flex items-center"
                  >
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-slate-400">
                      o registrarse con email
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className={`${outlineBtnClass} gap-2.5`}
                  disabled={isLoading}
                  onClick={handleGoogleClick}
                >
                  <GoogleMark className="h-4 w-4" />
                  Continuar con Google
                </Button>

                <p className="mt-6 text-center text-xs text-slate-400">
                  Al registrarte aceptas nuestros{" "}
                  <button
                    type="button"
                    className="cursor-pointer text-[#0085db] underline hover:text-[#0074c2]"
                    onClick={() => setShowTermsDialog(true)}
                  >
                    términos y condiciones
                  </button>
                </p>

                <p className="mt-6 text-center text-sm text-slate-500">
                  ¿Ya tenés cuenta?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-[#0085db] hover:text-[#0074c2]"
                  >
                    Iniciar sesión
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Términos y Condiciones</DialogTitle>
            <DialogDescription>
              Revisa nuestros términos antes de crear tu cuenta
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1 text-sm text-slate-600">
            <section>
              <h3 className="font-semibold text-slate-900 mb-2">1. Uso del Servicio</h3>
              <p>
                Al usar Hubilee Pos, aceptas cumplir con estos términos y todas las
                leyes y regulaciones aplicables. No debes usar esta plataforma de manera
                que viole leyes, derechos de terceros, o que afecte negativamente nuestra
                operación.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900 mb-2">2. Seguridad de Cuenta</h3>
              <p>
                Eres responsable de mantener la confidencialidad de tus credenciales de
                acceso. Notifica inmediatamente sobre cualquier acceso no autorizado.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900 mb-2">3. Privacidad</h3>
              <p>
                Tus datos se tratan según nuestra Política de Privacidad. Recopilamos y
                procesamos datos necesarios para proporcionar el servicio.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900 mb-2">4. Disponibilidad</h3>
              <p>
                Nos esforzamos por proporcionar acceso continuo, pero no garantizamos
                disponibilidad 100%. Realizamos mantenimiento que puede afectar la
                disponibilidad temporalmente.
              </p>
            </section>
          </div>

          <Button
            type="button"
            onClick={() => setShowTermsDialog(false)}
            className="mt-4 bg-[#0085db] text-white hover:bg-[#0074c2]"
          >
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
