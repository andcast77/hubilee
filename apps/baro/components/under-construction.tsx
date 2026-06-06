import { site } from '@/locales/site'
import { Mail, Phone, MapPin } from 'lucide-react'

function Logo() {
  return (
    <svg
      viewBox="0 0 512 512"
      className="size-14 sm:size-16"
      role="img"
      aria-label="Baró Construcciones SRL"
    >
      <defs>
        <style>{`
          .l-circle { fill: #141211; }
          .l-accent { fill: #c9a84c; }
          .l-stroke { fill: none; stroke: #c9a84c; stroke-linecap: round; stroke-linejoin: miter; }
          .l-ring { fill: none; stroke: #c9a84c; stroke-width: 2; opacity: 0.3; }
        `}</style>
      </defs>
      {/* Anillo exterior dorado sutil */}
      <circle className="l-ring" cx="256" cy="256" r="252" />
      <circle className="l-circle" cx="256" cy="256" r="248" />
      <path
        className="l-stroke"
        strokeWidth="3"
        d="M150 198 h30 v-22 l40-20 h22 v-28 l36-30 v78 h26"
      />
      <text
        x="256" y="326"
        textAnchor="middle"
        fill="#c9a84c"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="70"
        letterSpacing="3"
      >
        BARÓ
      </text>
      <text
        x="256" y="366"
        textAnchor="middle"
        fill="#c9a84c"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="400"
        fontSize="17"
        letterSpacing="6"
      >
        CONSTRUCCIONES SRL
      </text>
      <line x1="136" y1="380" x2="376" y2="380" className="l-stroke" strokeWidth="1.35" />
    </svg>
  )
}

export function UnderConstruction() {
  const { brand, contact, footer } = site

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#0a0a09] selection:bg-[#c9a84c]/30">
      {/* Glow decorativo central */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-0 size-[600px] -translate-x-1/2 rounded-full bg-[#c9a84c] opacity-[0.04] blur-[120px] sm:size-[800px]"
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="hidden text-sm font-semibold tracking-tight text-stone-400 sm:block">
            {brand}
          </span>
        </div>

        {footer.social.length > 0 && (
          <nav className="flex items-center gap-6">
            {footer.social.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium tracking-wider text-stone-600 uppercase transition-colors hover:text-stone-300"
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 sm:px-12">
        <div className="mx-auto w-full max-w-2xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-stone-800 bg-stone-900/60 px-4 py-1.5 backdrop-blur-sm">
            <span className="block size-1.5 rounded-full bg-[#c9a84c] shadow-[0_0_6px_#c9a84c] animate-pulse" />
            <span className="text-[11px] font-medium tracking-[0.15em] text-stone-400 uppercase">
              En construcción
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-balance text-[clamp(2.25rem,6vw,4.5rem)] font-bold leading-[1.1] tracking-tight text-white">
            Algo grande se está{' '}
            <span className="text-[#c9a84c] drop-shadow-[0_0_20px_rgba(201,168,76,0.15)]">
              construyendo
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-md text-balance text-base leading-relaxed text-stone-500">
            Estamos desarrollando una nueva experiencia digital para Baró
            Construcciones. Mientras tanto, estamos a tu disposición.
          </p>

          {/* Contacto */}
          <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#c9a84c] px-6 py-3.5 text-sm font-semibold text-[#0a0a09] shadow-lg shadow-[#c9a84c]/20 transition-all hover:bg-[#d4b35a] sm:w-auto"
            >
              <Mail className="size-4" />
              {contact.email}
            </a>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {contact.phones.map((phone) => (
                <a
                  key={phone}
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-stone-800 bg-stone-900/60 px-5 py-3.5 text-sm font-medium text-stone-300 backdrop-blur-sm transition-all hover:border-stone-700 hover:bg-stone-800/60 hover:text-white sm:w-auto"
                >
                  <Phone className="size-4" />
                  {phone}
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-900 px-6 py-5 sm:px-12">
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-stone-600">
            &copy; {new Date().getFullYear()} {site.legalName}
          </p>
          <div className="flex items-center gap-4 text-xs text-stone-600">
            {contact.addressLines && contact.addressLines.length > 0 && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3" />
                {contact.addressLines.join(' · ')}
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
