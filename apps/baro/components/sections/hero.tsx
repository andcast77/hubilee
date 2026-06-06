import Image from 'next/image'
import Link from 'next/link'
import { site } from '@/locales/site'
import { Reveal } from '@/components/reveal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=80'

export function HeroSection() {
  return (
    <section
      id="inicio"
      className="scroll-mt-24 overflow-hidden bg-[var(--color-background)] px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12"
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <Reveal className="order-2 text-center lg:order-1 lg:text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-bright)]">
            {site.brand}
          </p>
          <h1 className="mt-4 text-balance text-3xl font-semibold uppercase leading-tight tracking-tight text-[var(--color-accent-bright)] sm:text-4xl md:text-5xl">
            {site.hero.title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-[var(--color-muted)] lg:mx-0">
            {site.hero.subtitle}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <Button variant="outline" asChild size="lg">
              <a href="#servicios">Servicios</a>
            </Button>
            <Button variant="default" asChild size="lg">
              <a href="#contacto">Contacto</a>
            </Button>
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--color-muted)] underline-offset-4 hover:text-[var(--color-heading)] hover:underline md:hidden"
            >
              Ingresar
            </Link>
          </div>
        </Reveal>
        <Reveal className="order-1 lg:order-2">
          <Card className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-section)] shadow-[var(--shadow-card)] ring-1 ring-black/5 lg:aspect-[5/4]">
            <CardContent className="p-0">
              <Image
                src={HERO_IMAGE}
                alt="Obra y proyectos de construcción"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"
                aria-hidden
              />
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}
