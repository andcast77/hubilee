import { site } from '@/locales/site'
import { Reveal } from '@/components/reveal'
import { SectionTitle } from '@/components/section-title'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function ServicesSection() {
  return (
    <section
      id="servicios"
      className="scroll-mt-24 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionTitle>{site.services.title}</SectionTitle>
        </Reveal>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {site.services.items.map((item) => (
            <Reveal key={item.title}>
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-[var(--color-heading)]">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <CardDescription className="text-sm leading-relaxed text-[var(--color-muted)]">
                    {item.description}
                  </CardDescription>
                </CardContent>
                <CardFooter className="pt-4">
                  {/* Optional: Add a "Learn more" link or button here if needed */}
                </CardFooter>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
