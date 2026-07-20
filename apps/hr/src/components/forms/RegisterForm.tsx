'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { ApiError } from '@hubilee/shared';
import {
  AuthLayout,
  AuthBrandDecorativePanel,
  AuthBrandWelcomeHeader,
  AuthBrandCard,
  AuthBrandErrorAlert,
  AuthBrandFooterCenter,
  AUTH_BRAND_INPUT_CLASS,
  AUTH_BRAND_LABEL_CLASS,
  AUTH_BRAND_PRIMARY_BUTTON_CLASS,
  AUTH_BRAND_OUTLINE_BUTTON_CLASS,
  Button,
  Input,
  Label,
} from '@hubilee/ui';
import { authApi } from '@/lib/api/client';
import { RegistrationTurnstile } from '@/components/auth/RegistrationTurnstile';

const hrRegisterPanel = (
  <AuthBrandDecorativePanel
    badge="Hr"
    title="Tu equipo, en orden"
    description="Alta de empresa y usuarios con el mismo layout de registro que el Hub y Pos; solo el texto es propio de Hr."
    quote={<>RRHH y operación, bajo la misma cuenta.</>}
  />
);

function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function sanitizeInput(value: string): string {
  return value
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .substring(0, 100);
}

type Step = 'form' | 'link-pending';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [isLoading, startTransition] = useTransition();
  const [csrfToken, setCsrfToken] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  useEffect(() => {
    setCsrfToken(generateCSRFToken());
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 100;
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8 && password.length <= 128;
  };

  const validatePasswordComplexity = (password: string): boolean => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    return hasUpperCase && hasLowerCase && hasNumbers;
  };

  const validateCompanyName = (name: string): boolean => {
    return name.length >= 2 && name.length <= 100;
  };

  const validateName = (name: string): boolean => {
    return name.length >= 1 && name.length <= 50;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);
    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));
  };

  /** Returns first error message or null if valid (PLAN-39: empresa requiere OTP antes de register). */
  function validateRegistrationFields(): string | null {
    if (!formData.firstName.trim()) return 'El nombre es requerido';
    if (!formData.lastName.trim()) return 'El apellido es requerido';
    if (!formData.companyName.trim()) return 'El nombre de la empresa es requerido';
    if (!formData.email.trim()) return 'El email es requerido';
    if (!formData.password.trim()) return 'La contraseña es requerida';
    if (!formData.confirmPassword.trim()) return 'La confirmación de contraseña es requerida';
    if (!validateName(formData.firstName)) return 'El nombre debe tener entre 1 y 50 caracteres';
    if (!validateName(formData.lastName)) return 'El apellido debe tener entre 1 y 50 caracteres';
    if (!validateCompanyName(formData.companyName))
      return 'El nombre de la empresa debe tener entre 2 y 100 caracteres';
    if (!validateEmail(formData.email)) return 'Formato de email inválido';
    if (!validatePassword(formData.password))
      return 'La contraseña debe tener entre 8 y 128 caracteres';
    if (!validatePasswordComplexity(formData.password))
      return 'La contraseña debe contener mayúsculas, minúsculas y números';
    if (formData.password !== formData.confirmPassword) return 'Las contraseñas no coinciden';
    if (!csrfToken) return 'Error de seguridad. Recarga la página e intenta de nuevo.';
    return null;
  }

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const v = validateRegistrationFields();
    if (v) {
      setError(v);
      return;
    }
    if (!captchaToken?.trim()) {
      setError('Completa la verificación anti-robots (captcha).');
      return;
    }
    startTransition(async () => {
      try {
        await authApi.post('/register/link/send', {
          email: formData.email.toLowerCase().trim(),
          captchaToken,
          verificationBaseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
          password: formData.password,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          companyName: formData.companyName.trim(),
          hrEnabled: true,
          posEnabled: false,
        });
        setStep('link-pending');
        setCaptchaToken(null);
        setTurnstileKey((k) => k + 1);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo enviar el enlace.');
      }
    });
  };

  const handleResendLink = () => {
    setError('');
    startTransition(async () => {
      try {
        await authApi.post('/register/link/send', {
          email: formData.email.toLowerCase().trim(),
          verificationBaseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
          password: formData.password,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          companyName: formData.companyName.trim(),
          hrEnabled: true,
          posEnabled: false,
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo reenviar el enlace.');
      }
    });
  };

  return (
    <AuthLayout variant="brand" contentClassName="max-w-lg" panel={hrRegisterPanel}>
      <AuthBrandWelcomeHeader
        title="Comienza ahora"
        subtitle={
          step === 'link-pending' ? 'Abre el enlace en tu correo' : 'Crea tu empresa en Hr'
        }
      />

      <AuthBrandCard
        cardTitle={step === 'link-pending' ? 'Revisa tu correo' : 'Registrarse'}
        cardDescription={
          step === 'link-pending'
            ? 'Te enviamos un enlace para finalizar el alta. Puedes abrirlo desde cualquier dispositivo o navegador.'
            : 'Completa los campos; te enviaremos un enlace de verificación.'
        }
        footer={
          <AuthBrandFooterCenter>
            <p className="text-sm text-white/50">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-indigo-300 hover:text-indigo-200 font-medium">
                Inicia sesión
              </Link>
            </p>
          </AuthBrandFooterCenter>
        }
      >
        {step === 'link-pending' ? (
          <div className="space-y-4">
            {error ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{error}</p>
              </AuthBrandErrorAlert>
            ) : null}
            <p className="text-sm text-white/70">
              Enlace enviado a <strong className="text-white">{formData.email}</strong>
            </p>
            <p className="text-sm text-white/60">
              Abre el enlace del correo para crear tu cuenta. Puedes usar otro navegador o dispositivo.
            </p>
            <div className="space-y-3 pt-2">
              <p className="text-center text-xs text-white/45">¿No recibiste el correo?</p>
              <p className="text-center text-xs text-white/50">
                Máximo 3 correos con enlace por intento (incluido el primero). Luego espera o empieza de nuevo.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={handleResendLink}
                className={AUTH_BRAND_OUTLINE_BUTTON_CLASS}
              >
                {isLoading ? 'Enviando…' : 'Reenviar enlace'}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendLink} className="flex flex-col gap-2">
            <input type="hidden" name="csrfToken" value={csrfToken} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reg-firstName" className={AUTH_BRAND_LABEL_CLASS}>
                  Nombre
                </Label>
                <Input
                  id="reg-firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  maxLength={50}
                  autoComplete="given-name"
                  className={AUTH_BRAND_INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-lastName" className={AUTH_BRAND_LABEL_CLASS}>
                  Apellido
                </Label>
                <Input
                  id="reg-lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  maxLength={50}
                  autoComplete="family-name"
                  className={AUTH_BRAND_INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-company" className={AUTH_BRAND_LABEL_CLASS}>
                Nombre de la empresa
              </Label>
              <Input
                id="reg-company"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
                disabled={isLoading}
                maxLength={100}
                autoComplete="organization"
                className={AUTH_BRAND_INPUT_CLASS}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email" className={AUTH_BRAND_LABEL_CLASS}>
                Email
              </Label>
              <Input
                id="reg-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@empresa.com"
                required
                disabled={isLoading}
                maxLength={100}
                autoComplete="email"
                className={AUTH_BRAND_INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reg-password" className={AUTH_BRAND_LABEL_CLASS}>
                  Contraseña
                </Label>
                <Input
                  id="reg-password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  maxLength={128}
                  autoComplete="new-password"
                  className={AUTH_BRAND_INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-confirm" className={AUTH_BRAND_LABEL_CLASS}>
                  Confirmar contraseña
                </Label>
                <Input
                  id="reg-confirm"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  maxLength={128}
                  autoComplete="new-password"
                  className={AUTH_BRAND_INPUT_CLASS}
                />
              </div>
            </div>

            {error ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{error}</p>
              </AuthBrandErrorAlert>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <span className="sr-only">Verificación antispam antes de enviar el enlace.</span>
              <RegistrationTurnstile key={turnstileKey} onToken={setCaptchaToken} variant="compact" />
              <Button type="submit" disabled={isLoading} className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}>
                {isLoading ? 'Registrando…' : 'Registrar empresa'}
              </Button>
            </div>
          </form>
        )}
      </AuthBrandCard>
    </AuthLayout>
  );
}
