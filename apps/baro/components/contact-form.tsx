'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { type ContactState, submitContact } from '@/lib/contact-action'

const initialState: ContactState = { ok: false }

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-sm text-red-600">{message}</p>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-[var(--color-cta)] px-6 py-2.5 text-sm font-semibold text-[var(--color-cta-foreground)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--color-cta-hover)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Enviando…' : 'Enviar'}
    </button>
  )
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContact, initialState)

  if (state.ok) {
    return (
      <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
        ¡Gracias! Recibimos tu mensaje. Te contactaremos a la brevedad.
      </p>
    )
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="text-sm font-medium text-[var(--color-heading)]">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] outline-none transition-shadow focus:border-[var(--color-accent-bright)] focus:ring-2 focus:ring-[var(--color-accent-bright)]/25"
        />
        <FieldError message={state.fieldErrors?.name} />
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-[var(--color-heading)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] outline-none transition-shadow focus:border-[var(--color-accent-bright)] focus:ring-2 focus:ring-[var(--color-accent-bright)]/25"
        />
        <FieldError message={state.fieldErrors?.email} />
      </div>
      <div>
        <label htmlFor="subject" className="text-sm font-medium text-[var(--color-heading)]">
          Asunto
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] outline-none transition-shadow focus:border-[var(--color-accent-bright)] focus:ring-2 focus:ring-[var(--color-accent-bright)]/25"
        />
        <FieldError message={state.fieldErrors?.subject} />
      </div>
      <div>
        <label htmlFor="message" className="text-sm font-medium text-[var(--color-heading)]">
          Mensaje
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] outline-none transition-shadow focus:border-[var(--color-accent-bright)] focus:ring-2 focus:ring-[var(--color-accent-bright)]/25"
        />
        <FieldError message={state.fieldErrors?.message} />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
