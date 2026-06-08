import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { site } from '@/locales/site'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: `${site.brand} | Construcción y proyectos`,
    template: `%s | ${site.brand}`,
  },
  description: site.hero.subtitle,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  )
}
