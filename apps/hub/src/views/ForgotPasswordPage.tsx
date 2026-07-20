'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { Mail, ArrowLeft } from 'lucide-react'

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  async function onSubmit(data: ForgotPasswordInput) {
    try {
      setErrorMessage('')
      const res = await authApi.forgotPassword(data.email)
      
      if (res.success) {
        setEmailSent(true)
      } else {
        setErrorMessage(res.error || 'Error al procesar solicitud')
      }
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error || 'Error al procesar solicitud')
    }
  }

  if (emailSent) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-white/60 bg-white/90 shadow-2xl backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-sky-100 flex items-center justify-center">
                <Mail className="h-8 w-8 text-sky-600" />
              </div>
              <CardTitle className="text-2xl">Revisa tu email</CardTitle>
              <CardDescription>
                Si el email existe en nuestro sistema, recibirás instrucciones para restablecer tu contraseña
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-sky-50 border border-sky-200">
                <p className="text-sm text-sky-700 text-center">
                  El enlace de restablecimiento expirará en 1 hora por seguridad
                </p>
              </div>
              
              <Link href="/login" className="block">
                <Button className="w-full" variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Login
                </Button>
              </Link>
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
          <h1 className="text-3xl font-bold text-slate-900">¿Olvidaste tu contraseña?</h1>
          <p className="text-slate-600 mt-2">
            Introduce tu email y te enviaremos instrucciones para restablecerla
          </p>
        </div>

        {/* Form Card */}
        <Card className="border-white/60 bg-white/90 shadow-2xl backdrop-blur">
          <CardHeader>
            <CardTitle>Restablecer contraseña</CardTitle>
            <CardDescription>Te enviaremos un enlace de restablecimiento</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
              </Button>

              {/* Back to Login */}
              <div className="text-center pt-2">
                <Link href="/login" className="text-sm text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center">
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Volver al login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-sky-600 hover:text-sky-700 font-medium hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
