'use server'

import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  email: z.string().trim().email('Ingresá un email válido.'),
  subject: z.string().trim().min(1, 'El asunto es obligatorio.'),
  message: z.string().trim().min(1, 'El mensaje es obligatorio.'),
})

export type ContactState = {
  ok: boolean
  error?: string
  fieldErrors?: Partial<Record<'name' | 'email' | 'subject' | 'message', string>>
}

export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  })

  if (!parsed.success) {
    const fieldErrors: ContactState['fieldErrors'] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (key === 'name' || key === 'email' || key === 'subject' || key === 'message') {
        fieldErrors[key] = issue.message
      }
    }
    return { ok: false, fieldErrors }
  }

  console.info('[contact]', {
    ...parsed.data,
    at: new Date().toISOString(),
  })

  return { ok: true }
}
