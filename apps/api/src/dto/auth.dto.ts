import { z } from 'zod'

/**
 * Unified login: either globally unique userCode OR email (when the user has one).
 * Captcha is required for userCode after failed attempts (same policy as former floor-login).
 */
export const loginBodySchema = z
  .object({
    email: z.string().email().optional(),
    userCode: z
      .string()
      .trim()
      .min(1, 'El código de usuario es requerido')
      .max(32)
      .optional(),
    password: z.string().min(1),
    companyId: z.string().uuid().optional(),
    captchaToken: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasEmail = Boolean(data.email?.trim())
    const hasCode = Boolean(data.userCode?.trim())
    if (hasEmail === hasCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indicá email o código de usuario (uno solo).',
        path: hasEmail ? ['userCode'] : ['email'],
      })
    }
  })

export type LoginBody = z.infer<typeof loginBodySchema>

/**
 * Alias of code+password login (POST /v1/auth/floor-login).
 * Prefer POST /v1/auth/login with userCode; this route stays for POS clients.
 */
export const floorLoginBodySchema = z.object({
  userCode: z.string().trim().min(1, 'El código de usuario es requerido').max(32),
  password: z.string().min(1),
  captchaToken: z.string().min(1).optional(),
})

export type FloorLoginBody = z.infer<typeof floorLoginBodySchema>

export const mfaVerifyTotpSchema = z.object({
  tempToken: z.string().min(1),
  companyId: z.string().uuid().optional(),
  totpCode: z.string().min(1),
})

export type MfaVerifyTotpBody = z.infer<typeof mfaVerifyTotpSchema>

export const mfaVerifyBackupSchema = z.object({
  tempToken: z.string().min(1),
  companyId: z.string().uuid().optional(),
  backupCode: z.string().min(1),
})

export type MfaVerifyBackupBody = z.infer<typeof mfaVerifyBackupSchema>

/** Input DTO: register — con `companyName` no vacío se exige `registrationTicket` (PLAN-39). */
export const registerBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    registrationTicket: z.string().min(1).optional(),
    hrEnabled: z.boolean().optional(),
    posEnabled: z.boolean().optional(),
    technicalServicesEnabled: z.boolean().optional(),
  })

export type RegisterBody = z.infer<typeof registerBodySchema>

export const registerOtpSendBodySchema = z.object({
  email: z.string().email(),
  captchaToken: z.string().min(1),
})

export type RegisterOtpSendBody = z.infer<typeof registerOtpSendBodySchema>

export const registerOtpVerifyBodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
})

export type RegisterOtpVerifyBody = z.infer<typeof registerOtpVerifyBodySchema>

/** PLAN-40: magic link — payload de alta en Redis hasta consumir el enlace (cualquier navegador). */
export const registerLinkSendBodySchema = z.object({
  email: z.string().email(),
  /** Obligatorio en el primer envío; omitir en reenvíos (misma sesión en Redis, máx. 3 envíos). */
  captchaToken: z.string().min(1).optional(),
  verificationBaseUrl: z.string().trim().max(2048).optional(),
  password: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  hrEnabled: z.boolean().optional(),
  posEnabled: z.boolean().optional(),
  technicalServicesEnabled: z.boolean().optional(),
})

export type RegisterLinkSendBody = z.infer<typeof registerLinkSendBodySchema>

export const registerLinkVerifyBodySchema = z.object({
  email: z.string().email(),
  token: z.string().min(32, 'Token de enlace inválido'),
})

export type RegisterLinkVerifyBody = z.infer<typeof registerLinkVerifyBodySchema>

export const verifyEmailQuerySchema = z.object({
  token: z.string().min(1),
})

export const resendVerificationBodySchema = z.object({
  email: z.string().email(),
})

/** Authenticated user changes their own password. */
export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá la contraseña actual'),
    newPassword: z.string().min(8, 'La contraseña nueva debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmá la contraseña nueva'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas nuevas no coinciden',
    path: ['confirmPassword'],
  })

export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>

/** Google OAuth start query. */
export const googleOAuthStartQuerySchema = z.object({
  returnOrigin: z.string().min(1),
  intent: z.enum(['login', 'register']).optional(),
  next: z.string().optional(),
  /** Popup returns HTML bridge; page (default) keeps Pos 302. */
  display: z.enum(['popup', 'page']).optional(),
})

export type GoogleOAuthStartQuery = z.infer<typeof googleOAuthStartQuerySchema>

/** Google OAuth callback query. */
export const googleOAuthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
})

export type GoogleOAuthCallbackQuery = z.infer<typeof googleOAuthCallbackQuerySchema>

/** Input DTO: verify token */
export const verifyTokenSchema = z.object({
  token: z.string().min(1),
})

/**
 * Input DTO: refresh body — ADDITIVE for desktop clients (web-desktop-vite-tauri PR1).
 * Web (cookie) clients never send a body; the refresh token still comes from the
 * `ms_refresh` cookie for them. Desktop (`X-Client: desktop`) clients have no cookie
 * store and send the refresh token here instead.
 */
export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
})

export type RefreshBody = z.infer<typeof refreshBodySchema>

/** Input DTO: set context (switch company) */
export const setContextSchema = z.object({
  companyId: z.string().uuid(),
})

/** Input DTO: create session */
export const createSessionSchema = z.object({
  userId: z.string().uuid(),
  sessionToken: z.string().min(1),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  expiresAt: z.string().optional(),
})

/** Input DTO: terminate other sessions — `currentSessionToken` opcional si hay cookie `ms_refresh`. */
export const terminateOthersSessionsSchema = z.object({
  userId: z.string().uuid(),
  currentSessionToken: z.string().min(1).optional(),
})

/** Input DTO: validate session query */
export const validateSessionQuerySchema = z.object({
  token: z.string().min(1),
})

/** Input DTO: list sessions query — sin `userId` se usa el usuario autenticado. */
export const listSessionsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
})

/** Response DTO: user summary */
export type AuthUserResponse = {
  id: string
  email: string | null
  name: string
  role: string
  isSuperuser?: boolean
  companyId?: string
}

/** Response DTO: company with modules */
export type AuthCompanyResponse = {
  id: string
  name: string
  modules: { hr: boolean; pos: boolean; tech: boolean }
}
