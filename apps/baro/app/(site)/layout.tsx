import '../globals.css'

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-full flex flex-col bg-[var(--color-background)] font-sans">{children}</div>
}
