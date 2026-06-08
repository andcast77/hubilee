import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { UnderConstruction } from '@/components/under-construction'
import { AboutSection } from '@/components/sections/about'
import { ClientsSection } from '@/components/sections/clients'
import { ContactSection } from '@/components/sections/contact'
import { HeroSection } from '@/components/sections/hero'
import { ProjectsSection } from '@/components/sections/projects'
import { ServicesSection } from '@/components/sections/services'

export default function HomePage() {
  if (process.env.NEXT_PUBLIC_SITE_UNDER_CONSTRUCTION === 'true') {
    return <UnderConstruction />
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <ServicesSection />
        <AboutSection />
        <ProjectsSection />
        <ClientsSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  )
}
