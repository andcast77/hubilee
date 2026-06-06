import { site } from '@/locales/site'
import { Reveal } from '@/components/reveal'
import { SectionTitle } from '@/components/section-title'

export function ClientsSection() {
  return (
    <section
      id="clientes"
      className="scroll-mt-24 bg-[var(--color-background)] px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionTitle>{site.clients.title}</SectionTitle>
        </Reveal>
        <Reveal className="mt-14">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {site.clients.names.map((name) => (
              <div
                key={name}
                className="card-lift flex h-24 min-w-[160px] flex-1 items-center justify-center rounded-[var(--radius-section)] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 shadow-[var(--shadow-soft)] sm:min-w-[180px] sm:flex-none"
              >
                <span className="text-center text-sm font-bold uppercase tracking-[0.18em] text-[var(--color-heading)]">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
