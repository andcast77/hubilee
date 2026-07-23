"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppAdminHeader } from "@/components/layout/AppAdminHeader";
import { AdminMobileNavOverlay } from "@/components/layout/AdminMobileNavOverlay";
import { DashboardSessionGate } from "@/components/auth/DashboardSessionGate";
import { CompanyProfileGate } from "@/components/auth/CompanyProfileGate";
import { PosModuleGuard } from "@/components/layout/POSModuleGuard";
import { CompanyContextBootstrap } from "@/components/providers/CompanyContextBootstrap";
import { StoreProvider } from "@/components/providers/StoreContext";
import { useRegisterPosServiceWorker } from "@/hooks/useRegisterPosServiceWorker";
import { useUser } from "@/hooks/useUser";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";
import { useNavigate } from "@/lib/next-nav";

function AppShellChrome({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: user } = useUser();
  const navigate = useNavigate();
  const { unreadCount } = useInAppNotifications(user?.id, user?.companyId ?? undefined);
  const displayName = user?.name?.trim() || user?.email;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppAdminHeader
          showMenuButton
          onMenuToggle={() => setMobileNavOpen((open) => !open)}
          unreadCount={unreadCount}
          userName={displayName || undefined}
          onUserClick={() => {
            void navigate({ to: "/account" });
          }}
        />
        <div
          data-testid="admin-canvas"
          className="flex-1 bg-slate-100 p-4 lg:p-6"
        >
          {children}
        </div>
      </div>
      <AdminMobileNavOverlay
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </div>
  );
}

export default function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRegisterPosServiceWorker();

  return (
    <ProtectedRoute>
      <DashboardSessionGate>
        <CompanyProfileGate>
          <PosModuleGuard>
            <CompanyContextBootstrap>
              <StoreProvider>
                <AppShellChrome>{children}</AppShellChrome>
              </StoreProvider>
            </CompanyContextBootstrap>
          </PosModuleGuard>
        </CompanyProfileGate>
      </DashboardSessionGate>
    </ProtectedRoute>
  );
}
