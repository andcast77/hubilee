import { z } from 'zod'

export const authCredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email('Ingresá un email válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
})

export type AuthCredentials = z.infer<typeof authCredentialsSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual.'),
    newPassword: z.string().min(8, 'La contraseña nueva debe tener al menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirmá la nueva contraseña.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas nuevas no coinciden.',
    path: ['confirmPassword'],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
