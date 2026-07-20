'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/lib/api-client'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hubilee/ui'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  async function onSubmit(data: ResetPasswordInput) {
    if (!token) {
      setErrorMessage('Token de restablecimiento no válido')
      return
    }

    try {
      setErrorMessage('')
      const res = await authApi.resetPassword(token, data.newPassword)
      
      if (res.success) {
        setResetSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.replace('/login')
        }, 3000)
      } else {
        setErrorMessage(res.error || 'Error al restablecer contraseña')
      }
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error || 'Error al restablecer contraseña')
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-white/60 bg-white/90 shadow-2xl backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Token inválido</CardTitle>
              <CardDescription>
                El enlace de restablecimiento no es válido o ha expirado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/forgot-password" className="block">
                <Button className="w-full">
                  Solicitar nuevo enlace
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (resetSuccess) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-white/60 bg-white/90 shadow-2xl backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl">¡Contraseña actualizada!</CardTitle>
              <CardDescription>
                Tu contraseña ha sido restablecida exitosamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm text-green-700 text-center">
                  Ya puedes iniciar sesión con tu nueva contraseña
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-4">
                  Serás redirigido al login en 3 segundos...
                </p>
                <Button
                  onClick={() => router.replace('/login')}
                  className="w-full"
                >
                  Ir al Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Nueva contraseña</h1>
          <p className="text-slate-600 mt-2">
            Introduce tu nueva contraseña
          </p>
        </div>

        {/* Form Card */}
        <Card className="border-white/60 bg-white/90 shadow-2xl backdrop-blur">
          <CardHeader>
            <CardTitle>Restablecer contraseña</CardTitle>
            <CardDescription>Elige una contraseña segura</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}

              {/* New Password Field */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    {...register('newPassword')}
                    className={errors.newPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-red-600">{errors.newPassword.message}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repite tu contraseña"
                    {...register('confirmPassword')}
                    className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-medium text-slate-700 mb-1">
                  Requisitos de contraseña:
                </p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Mínimo 8 caracteres</li>
                  <li>• Al menos un número</li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>

              {/* Back to Login */}
              <div className="text-center pt-2">
                <Link href="/login" className="text-sm text-sky-600 hover:text-sky-700 hover:underline">
                  Volver al login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
