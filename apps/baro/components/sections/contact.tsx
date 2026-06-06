'use client'

import Link from 'next/link'
import { site } from '@/locales/site'
import { Reveal } from '@/components/reveal'
import { SectionTitle } from '@/components/section-title'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { type ContactState, submitContact } from '@/lib/contact-action'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const initialState: ContactState = { ok: false }

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-sm text-red-600">{message}</p>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Enviando…' : 'Enviar'}
    </Button>
  )
}

export function ContactSection() {
  const [state, formAction] = useActionState(submitContact, initialState)

  return (
    <section
      id="contacto"
      className="scroll-mt-24 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionTitle>{site.contact.title}</SectionTitle>
        </Reveal>
        <Reveal>
          <p className="mx-auto mt-8 max-w-2xl text-center text-[var(--color-muted)]">
            {site.contact.intro}
          </p>
        </Reveal>

        <Reveal className="mt-12">
          <div className="overflow-hidden rounded-[var(--radius-section)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-soft)]">
            <div className="relative aspect-[21/9] min-h-[200px] w-full sm:min-h-[280px]">
              <iframe
                title="Ubicación en Google Maps"
                src={site.contact.mapEmbedSrc}
                className="absolute inset-0 h-full w-full border-0 grayscale-[0.15] transition-[filter] duration-500 hover:grayscale-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <div className="border-t border-[var(--color-border)] px-4 py-3 text-center text-sm text-[var(--color-muted)]">
              <Link
                href={site.contact.mapHref}
                className="font-medium text-[var(--color-accent-bright)] underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Abrir en Google Maps
              </Link>
            </div>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-14 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-heading)]">Preguntas</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Completá el formulario o llamanos.
              </p>
              <div className="mt-8">
                <form action={formAction} className="space-y-4" noValidate>
                  <div>
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-[var(--color-heading)]"
                    >
                      Nombre
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      className="w-full"
                    />
                    <FieldError message={state.fieldErrors?.name} />
                  </div>
                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-[var(--color-heading)]"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className="w-full"
                    />
                    <FieldError message={state.fieldErrors?.email} />
                  </div>
                  <div>
                    <Label
                      htmlFor="subject"
                      className="text-sm font-medium text-[var(--color-heading)]"
                    >
                      Asunto
                    </Label>
                    <Input id="subject" name="subject" type="text" className="w-full" />
                    <FieldError message={state.fieldErrors?.subject} />
                  </div>
                  <div>
                    <Label
                      htmlFor="message"
                      className="text-sm font-medium text-[var(--color-heading)]"
                    >
                      Mensaje
                    </Label>
                    <Textarea id="message" name="message" rows={5} className="w-full" />
                    <FieldError message={state.fieldErrors?.message} />
                  </div>
                  {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
                  <div className="flex justify-end pt-2">
                    <SubmitButton />
                  </div>
                </form>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <div className="space-y-10">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-heading)]">Oficina</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                  {site.contact.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="font-medium text-[var(--color-accent-bright)] underline-offset-4 hover:underline"
                  >
                    {site.contact.email}
                  </a>
                </p>
                <ul className="mt-3 space-y-1 text-sm text-[var(--color-muted)]">
                  {site.contact.phones.map((p) => (
                    <li key={p}>
                      <a
                        href={`tel:${p.replace(/\s/g, '')}`}
                        className="hover:text-[var(--color-heading)] hover:underline"
                      >
                        Teléfono: {p}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-heading)]">Empleos</h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{site.contact.jobsNote}</p>
              </div>
              <div className="rounded-[var(--radius-section)] border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-[var(--shadow-soft)]">
                <h3 className="text-lg font-semibold text-[var(--color-heading)]">
                  Recibí un presupuesto
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  Llamanos al{' '}
                  <a
                    href={`tel:${site.contact.phones[1]?.replace(/\s/g, '')}`}
                    className="font-semibold text-[var(--color-cta)] underline-offset-4 hover:underline"
                  >
                    {site.contact.phones[1]}
                  </a>
                  .
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
