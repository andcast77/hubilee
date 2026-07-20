"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@hubilee/shared";
import { authApi } from "@/lib/api-client";
import { shouldCallMeForLoggedInCheck } from "@/lib/auth-session-probe";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { RegistrationTurnstile } from "@/components/auth/RegistrationTurnstile";
import {
  AuthLayout,
  AuthBrandDecorativePanel,
  AuthBrandWelcomeHeader,
  AuthBrandErrorAlert,
  AuthBrandFooterCenter,
  AUTH_BRAND_CARD_CLASS,
  AUTH_BRAND_INPUT_CLASS,
  AUTH_BRAND_LABEL_CLASS,
  AUTH_BRAND_PRIMARY_BUTTON_CLASS,
  AUTH_BRAND_OUTLINE_BUTTON_CLASS,
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from "@hubilee/ui";

type RegisterStep = "form" | "link-pending";

export function RegisterPage() {
  const router = useRouter();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [step, setStep] = useState<RegisterStep>("form");
  const [pendingRegistration, setPendingRegistration] = useState<RegisterInput | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const termsAccepted = watch("termsAccepted");
  const privacyAccepted = watch("privacyAccepted");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!(await shouldCallMeForLoggedInCheck())) return;
        await authApi.meGuestProbe();
        router.replace("/dashboard");
      } catch {
        // Not logged in, stay on register page
      }
    };

    checkAuth();
  }, [router]);

  const sendLinkWithCaptcha = handleSubmit(async (data: RegisterInput) => {
    setErrorMessage("");
    if (!captchaToken?.trim()) {
      setErrorMessage("Completa la verificación anti-robots (captcha) antes de continuar.");
      return;
    }
    try {
      await authApi.sendRegistrationLink({
        email: data.email.trim().toLowerCase(),
        captchaToken,
        verificationBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        companyName: data.companyName.trim(),
      });
      setPendingRegistration(data);
      setStep("link-pending");
      setCaptchaToken(null);
      setTurnstileResetKey((k) => k + 1);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo enviar el enlace.";
      setErrorMessage(msg);
    }
  });

  async function resendLink() {
    if (!pendingRegistration) return;
    setErrorMessage("");
    const d = pendingRegistration;
    try {
      await authApi.sendRegistrationLink({
        email: d.email.trim().toLowerCase(),
        verificationBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        password: d.password,
        firstName: d.firstName.trim(),
        lastName: d.lastName.trim(),
        companyName: d.companyName.trim(),
      });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo reenviar el enlace.";
      setErrorMessage(msg);
    }
  }

  const decorativePanel = (
    <AuthBrandDecorativePanel
      badge={
        <>
          <span>🚀</span>
          <span>Hubilee</span>
        </>
      }
      title="Tu negocio listo para crecer"
      description="Accede a todas las herramientas que necesitas para gestionar y hacer crecer tu negocio con claridad."
      quote={<>Empieza rápido, crece con claridad.</>}
    />
  );

  return (
    <>
      <AuthLayout variant="brand" contentClassName="max-w-lg" panel={decorativePanel}>
        <AuthBrandWelcomeHeader
          title="Comienza ahora"
          subtitle={
            step === "link-pending"
              ? "Abre el enlace que enviamos a tu correo"
              : "Crea tu empresa en el Hub"
          }
        />

              <Card className={AUTH_BRAND_CARD_CLASS}>
                <CardHeader>
                  <CardTitle className="text-white">
                    {step === "link-pending" ? "Revisa tu correo" : "Registrarse"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {step === "link-pending" ? (
                    <div className="space-y-4">
                      {errorMessage ? (
                        <AuthBrandErrorAlert variant="error">
                          <p className="text-sm text-red-200">{errorMessage}</p>
                        </AuthBrandErrorAlert>
                      ) : null}
                      <p className="text-sm text-white/70">
                        Enlace enviado a{" "}
                        <strong className="text-white">{pendingRegistration?.email}</strong>
                      </p>
                      <p className="text-sm text-white/60">
                        Haz clic en el enlace del correo para crear tu cuenta. Usa «Reenviar enlace» si no
                        llega el correo.
                      </p>
                      <div className="space-y-3 pt-2">
                        <p className="text-center text-xs text-white/45">¿No recibiste el correo?</p>
                        <p className="text-center text-xs text-white/50">
                          Máximo 3 correos con enlace por intento de registro (incluido el primero). Luego espera o
                          empieza de nuevo.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void resendLink()}
                          className={AUTH_BRAND_OUTLINE_BUTTON_CLASS}
                        >
                          Reenviar enlace
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={sendLinkWithCaptcha} className="flex flex-col gap-2">
                      {/* Error Message */}
                      {errorMessage ? (
                        <AuthBrandErrorAlert variant="error">
                          <p className="text-sm text-red-200">{errorMessage}</p>
                        </AuthBrandErrorAlert>
                      ) : null}
                    <div className="space-y-2.5">
                    {/* Two-column layout for names on medium+ screens */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* First Name */}
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className={AUTH_BRAND_LABEL_CLASS}>Nombre</Label>
                        <Input
                          id="firstName"
                          placeholder="Juan"
                          {...register("firstName")}
                          className={`${AUTH_BRAND_INPUT_CLASS} ${errors.firstName ? "border-red-400" : ""}`}
                        />
                        {errors.firstName && (
                          <p className="text-xs text-red-300">{errors.firstName.message}</p>
                        )}
                      </div>

                      {/* Last Name */}
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className={AUTH_BRAND_LABEL_CLASS}>Apellido</Label>
                        <Input
                          id="lastName"
                          placeholder="Pérez"
                          {...register("lastName")}
                          className={`${AUTH_BRAND_INPUT_CLASS} ${errors.lastName ? "border-red-400" : ""}`}
                        />
                        {errors.lastName && (
                          <p className="text-xs text-red-300">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Company Name */}
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className={AUTH_BRAND_LABEL_CLASS}>Nombre de la empresa</Label>
                      <Input
                        id="companyName"
                        placeholder="Mi Empresa S.L."
                        {...register("companyName")}
                        className={`${AUTH_BRAND_INPUT_CLASS} ${errors.companyName ? "border-red-400" : ""}`}
                      />
                      {errors.companyName && (
                        <p className="text-sm text-red-300">{errors.companyName.message}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className={AUTH_BRAND_LABEL_CLASS}>Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@empresa.com"
                        {...register("email")}
                        className={`${AUTH_BRAND_INPUT_CLASS} ${errors.email ? "border-red-400" : ""}`}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-300">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Two-column layout for passwords on medium+ screens */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Password */}
                      <div className="space-y-2">
                        <Label htmlFor="password" className={AUTH_BRAND_LABEL_CLASS}>Contraseña</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          {...register("password")}
                          className={`${AUTH_BRAND_INPUT_CLASS} ${errors.password ? "border-red-400" : ""}`}
                        />
                        {errors.password && (
                          <p className="text-xs text-red-300">{errors.password.message}</p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className={AUTH_BRAND_LABEL_CLASS}>Confirmar contraseña</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          {...register("confirmPassword")}
                          className={`${AUTH_BRAND_INPUT_CLASS} ${errors.confirmPassword ? "border-red-400" : ""}`}
                        />
                        {errors.confirmPassword && (
                          <p className="text-xs text-red-300">{errors.confirmPassword.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Terms Checkbox */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <input
                          id="terms"
                          type="checkbox"
                          {...register("termsAccepted")}
                          className="mt-1 accent-indigo-500"
                        />
                        <label htmlFor="terms" className="text-sm text-white/80">
                          Acepto los{" "}
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="text-indigo-300 hover:text-indigo-200 font-medium underline"
                          >
                            términos y condiciones
                          </button>
                        </label>
                      </div>
                      {errors.termsAccepted && (
                        <p className="text-sm text-red-300">{errors.termsAccepted.message}</p>
                      )}
                    </div>

                    {/* Privacy Policy Checkbox */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <input
                          id="privacy"
                          type="checkbox"
                          {...register("privacyAccepted")}
                          className="mt-1 accent-indigo-500"
                        />
                        <label htmlFor="privacy" className="text-sm text-white/80">
                          He leído y acepto la{" "}
                          <button
                            type="button"
                            onClick={() => setShowPrivacyModal(true)}
                            className="text-indigo-300 hover:text-indigo-200 font-medium underline"
                          >
                            política de privacidad
                          </button>{" "}
                          y el tratamiento de mis datos personales
                        </label>
                      </div>
                      {errors.privacyAccepted && (
                        <p className="text-sm text-red-300">{errors.privacyAccepted.message}</p>
                      )}
                    </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <RegistrationTurnstile
                        key={turnstileResetKey}
                        onToken={setCaptchaToken}
                        variant="compact"
                      />
                      <Button
                        type="submit"
                        disabled={isSubmitting || !termsAccepted || !privacyAccepted}
                        className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}
                      >
                        {isSubmitting ? "Registrando…" : "Registrar empresa"}
                      </Button>
                    </div>
                  </form>
                  )}

                <AuthBrandFooterCenter>
                  <p className="text-sm text-white/50">
                    ¿Ya tienes cuenta?{" "}
                    <Link href="/login" className="text-indigo-300 hover:text-indigo-200 font-medium">
                      Inicia sesión
                    </Link>
                  </p>
                </AuthBrandFooterCenter>
              </CardContent>
            </Card>
      </AuthLayout>

      {/* Terms & Conditions Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Términos y Condiciones</DialogTitle>
            <DialogDescription>
              Revisa nuestros términos antes de crear tu cuenta
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-6 pr-6">
            <div className="space-y-4 text-sm text-slate-600">
              <section>
                <h3 className="font-semibold text-slate-900 mb-2">1. Uso del Servicio</h3>
                <p>
                  Al usar Hubilee, aceptas cumplir con estos términos y todas las
                  leyes y regulaciones aplicables. No debes usar esta plataforma de manera
                  que viole leyes, derechos de terceros, o que afecte negativamente nuestra
                  operación.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">2. Seguridad de Cuenta</h3>
                <p>
                  Eres responsable de mantener la confidencialidad de tus credenciales de
                  acceso. Notifica inmediatamente sobre cualquier acceso no autorizado. No
                  compartirás tu cuenta con terceros.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">3. Datos y Privacidad</h3>
                <p>
                  Tus datos se tratan según nuestra Política de Privacidad. Recopilamos y
                  procesamos datos necesarios para proporcionar el servicio. Tienes derechos
                  sobre tus datos según la legislación aplicable.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">4. Disponibilidad del Servicio</h3>
                <p>
                  Nos esforzamos por proporcionar acceso continuo, pero no garantizamos
                  disponibilidad 100%. Realizamos mantenimiento y actualizaciones que pueden
                  afectar la disponibilidad temporalmente.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">5. Cambios en los Términos</h3>
                <p>
                  Nos reservamos el derecho de modificar estos términos en cualquier momento.
                  Los cambios significativos serán comunicados con anticipación. El uso
                  continuado implica aceptación de los cambios.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">6. Contacto</h3>
                <p>
                  Para preguntas sobre estos términos, contacta a nuestro equipo a través de
                  los canales de soporte disponibles en la plataforma.
                </p>
              </section>
            </div>
          </ScrollArea>

          <Button
            onClick={() => setShowTermsModal(false)}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 mt-4"
          >
            Entendido
          </Button>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Política de Privacidad</DialogTitle>
            <DialogDescription>
              Cómo recopilamos, usamos y protegemos tus datos personales
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-6 pr-6">
            <div className="space-y-4 text-sm text-slate-600">
              <section>
                <h3 className="font-semibold text-slate-900 mb-2">1. Responsable del Tratamiento</h3>
                <p>
                  Hubilee es el responsable del tratamiento de tus datos personales,
                  en cumplimiento del RGPD (UE 2016/679), la Ley Argentina 25.326 y la
                  LFPDPPP mexicana.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">2. Datos que Recopilamos</h3>
                <p>Recopilamos los siguientes datos para prestarte el servicio:</p>
                <ul className="mt-2 ml-4 space-y-1 list-disc">
                  <li><strong>Identificación:</strong> nombre, apellido y dirección de email</li>
                  <li><strong>Cuenta:</strong> contraseña (almacenada con hash bcrypt), empresa</li>
                  <li><strong>Actividad:</strong> registros de auditoría e historial de acciones</li>
                  <li><strong>Técnicos:</strong> dirección IP y agente de usuario en cada sesión</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">3. Finalidad y Base Legal</h3>
                <p>
                  Tus datos se tratan para la ejecución del contrato de servicio, el cumplimiento
                  de obligaciones legales y, con tu consentimiento explícito, para la mejora
                  continua de la plataforma. La base legal es el Art. 6(1)(b) y (a) del RGPD.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">4. Retención de Datos</h3>
                <ul className="mt-1 ml-4 space-y-1 list-disc">
                  <li>Sesiones: eliminadas al expirar o al cerrar sesión</li>
                  <li>Registros de auditoría: 12 meses</li>
                  <li>Datos de perfil: durante la vigencia de la cuenta + 30 días post-baja</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">5. Tus Derechos</h3>
                <p>
                  Tienes derecho de acceso, rectificación, supresión, portabilidad y oposición
                  al tratamiento de tus datos. Puedes ejercerlos desde tu perfil
                  (<em>Mi cuenta → Mis datos</em>) o contactando a nuestro equipo de soporte.
                  Para Argentina: derechos según Ley 25.326. Para México: derechos ARCO según LFPDPPP.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">6. Transferencias Internacionales</h3>
                <p>
                  Tus datos pueden ser procesados en servidores ubicados fuera de tu país de
                  residencia. En todos los casos se aplican garantías adecuadas conforme a la
                  normativa aplicable (cláusulas contractuales tipo o equivalentes).
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">7. Seguridad</h3>
                <p>
                  Aplicamos cifrado en tránsito (TLS), contraseñas con hash bcrypt,
                  cifrado de campos sensibles en base de datos, y controles de acceso
                  basados en roles para proteger tus datos.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-900 mb-2">8. Contacto</h3>
                <p>
                  Para cualquier consulta sobre privacidad o para ejercer tus derechos,
                  contacta a nuestro equipo a través de los canales de soporte de la plataforma.
                </p>
              </section>
            </div>
          </ScrollArea>

          <Button
            onClick={() => setShowPrivacyModal(false)}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 mt-4"
          >
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
