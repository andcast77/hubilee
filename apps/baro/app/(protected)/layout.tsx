import { AccountProvider } from '@/components/app/account-context'
import { AppSessionGate } from '@/components/app/app-session-gate'
import { AppShell } from '@/components/app/app-shell'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AccountProvider>
      <AppSessionGate>
        <TooltipProvider delayDuration={200}>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </AppSessionGate>
    </AccountProvider>
  )
}
