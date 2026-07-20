"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardSessionGate } from "@/components/auth/DashboardSessionGate";
import { PosModuleGuard } from "@/components/layout/POSModuleGuard";
import { CompanyContextBootstrap } from "@/components/providers/CompanyContextBootstrap";
import { StoreProvider } from "@/components/providers/StoreContext";

export default function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardSessionGate>
        <PosModuleGuard>
          <CompanyContextBootstrap>
            <StoreProvider>
              <div className="flex min-h-screen flex-col lg:flex-row">
                <Sidebar />
                <div className="min-h-0 min-w-0 flex-1">{children}</div>
              </div>
            </StoreProvider>
          </CompanyContextBootstrap>
        </PosModuleGuard>
      </DashboardSessionGate>
    </ProtectedRoute>
  );
}
