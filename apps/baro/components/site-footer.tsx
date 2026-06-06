import { site } from '@/locales/site'

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-[var(--color-muted)]">
          © {year} {site.legalName}
        </p>
        <ul className="flex flex-wrap gap-4">
          {site.footer.social.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                className="text-sm font-medium text-[var(--color-muted)] underline-offset-4 transition-colors hover:text-[var(--color-accent-bright)] hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
