import Link from 'next/link'
import { IconCompass } from '@/components/app/icons'
import { site } from '@/locales/site'
import { Button } from '@/components/ui/button'

export default function SoportePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
          Soporte y contacto
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--background)]/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)] sm:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-heading)]">Soporte del panel</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Esta versión es una demo. Si encontrás un error o necesitás una función, escribinos
              por los medios de contacto del estudio (sección siguiente) o desde el formulario del
              sitio público.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--muted-bg)]/40 px-3 py-2.5 text-sm text-[var(--color-muted)]">
              <span className="flex items-center gap-2 font-medium text-[var(--color-heading)]">
                <IconCompass className="h-4 w-4 shrink-0 text-[var(--accent-bright)]" />
                Herramientas del panel
              </span>
              <Button type="button" variant="outline" title="Próximamente" className="shrink-0">
                Abrir
              </Button>
            </div>
          </section>

          <section className="border-t border-[var(--color-border)] pt-6">
            <h2 className="text-lg font-semibold text-[var(--color-heading)]">
              Contacto del estudio
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{site.contact.intro}</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <span className="font-medium text-[var(--color-heading)]">Teléfonos</span>
                <div className="mt-1 text-[var(--color-muted)]">
                  {site.contact.phones.map((p) => (
                    <a
                      key={p}
                      href={`tel:${p.replace(/\s/g, '')}`}
                      className="mr-3 font-semibold text-[var(--accent-bright)] underline-offset-4 hover:underline"
                    >
                      {p}
                    </a>
                  ))}
                </div>
              </li>
              <li>
                <span className="font-medium text-[var(--color-heading)]">Email</span>
                <div className="mt-1">
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="font-semibold text-[var(--accent-bright)] underline-offset-4 hover:underline"
                  >
                    {site.contact.email}
                  </a>
                </div>
              </li>
              <li>
                <span className="font-medium text-[var(--color-heading)]">Dirección</span>
                <p className="mt-1 text-[var(--color-muted)]">
                  {site.contact.addressLines.join(' · ')}
                </p>
                <a
                  href={site.contact.mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-[var(--accent-bright)] underline-offset-4 hover:underline"
                >
                  Ver en mapa
                </a>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-5">
              <Button variant="outline" asChild>
                <Link href="/#contacto">Formulario en el sitio público</Link>
              </Button>
              <Button variant="default" asChild>
                <Link href="/">Ir al inicio público</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
