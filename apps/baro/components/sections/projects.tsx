import { site } from '@/locales/site'
import { Reveal } from '@/components/reveal'
import { SectionTitle } from '@/components/section-title'

const TINTS = [
  'from-amber-200/70 via-stone-400/80 to-stone-600/90',
  'from-stone-400/80 via-amber-100/60 to-stone-500/85',
  'from-neutral-500/75 via-stone-300/70 to-amber-200/65',
  'from-stone-500/80 via-neutral-600/75 to-stone-300/70',
  'from-amber-100/70 via-stone-500/80 to-neutral-700/85',
  'from-stone-600/85 via-amber-50/50 to-stone-400/80',
]

export function ProjectsSection() {
  return (
    <section
      id="proyectos"
      className="scroll-mt-24 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionTitle>{site.projects.title}</SectionTitle>
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {site.projects.items.map((p, i) => (
            <Reveal key={p.title}>
              <figure className="group overflow-hidden rounded-[var(--radius-section)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-soft)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br transition-transform duration-500 ease-out group-hover:scale-105 ${TINTS[i % TINTS.length]}`}
                    aria-hidden
                  />
                  <div
                    className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  >
                    <span className="text-center text-sm font-semibold uppercase tracking-wide text-white">
                      {p.title}
                    </span>
                  </div>
                </div>
                <figcaption className="px-4 py-4 text-center text-sm font-semibold uppercase tracking-wide text-[var(--color-heading)] transition-colors group-hover:text-[var(--color-accent-bright)]">
                  {p.title}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
