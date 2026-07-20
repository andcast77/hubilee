"use client";

import { useEffect, type ComponentProps } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar as SidebarComponent } from "@hubilee/ui";
import {
  LayoutDashboard,
  Settings,
  Users,
  Building2,
  Shield,
  Timer,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { CompanySelector } from "@/components/features/CompanySelector";
import { clearTokenCookie } from "@/lib/auth";
import { authApi } from "@/lib/api-client";
import { InAppNotificationBell } from "@hubilee/ui";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";

type SidebarComponentProps = ComponentProps<typeof SidebarComponent>;

const navGroups: SidebarComponentProps["navGroups"] = [
  {
    title: "Principal",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Gestión",
    items: [
      { title: "Miembros", href: "/dashboard/members", icon: Users },
      { title: "Configuración", href: "/dashboard/settings", icon: Settings },
    ],
  },
  {
    title: "Seguridad",
    items: [
      { title: "Auditoría", href: "/dashboard/audit", icon: Shield },
    ],
  },
  {
    title: "Automatización",
    items: [
      { title: "Historial de Jobs", href: "/dashboard/jobs", icon: Timer },
    ],
  },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useUser();

  /** Must run every render (before any early return) — hook count must stay stable (React #310). */
  const posEnabled = user?.company?.modules?.pos === true;
  const notif = useInAppNotifications(user?.id, user?.companyId, posEnabled);

  useEffect(() => {
    if (!isLoading && (error || !user)) {
      router.replace("/login");
    }
  }, [user, isLoading, error, router]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // proceed even if the API call fails
    }
    clearTokenCookie();
    await queryClient.clear();
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const sidebarUser: NonNullable<SidebarComponentProps["user"]> = {
    name: user.name || user.email,
    email: user.email,
    role: user.membershipRole || user.role,
  };

  // Only show company selector for superusers or users with multiple companies
  const showCompanySelector = user.isSuperuser || false; // Will be enhanced with multi-company check

  return (
    <div className="flex h-screen">
      <SidebarComponent
        navGroups={navGroups}
        user={sidebarUser}
        branding={{
          name: "Hubilee",
          shortName: "HUB",
          logo: <Building2 className="h-6 w-6" />,
        }}
        companySelector={
          showCompanySelector ? (
            <CompanySelector
              currentCompanyId={user.companyId}
              isSuperuser={user.isSuperuser}
            />
          ) : undefined
        }
        navigation={{
          Link,
          usePathname: () => pathname,
        }}
        userProfileHref="/dashboard/account"
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto">
        {posEnabled ? (
          <div className="sticky top-0 z-30 flex justify-end border-b border-slate-100 bg-white/90 px-4 py-2 backdrop-blur-sm">
            <InAppNotificationBell
              unreadCount={notif.unreadCount}
              items={notif.items}
              loading={notif.isLoading}
              onOpen={notif.refetch}
              onMarkRead={notif.markRead}
              onMarkAllRead={notif.markAllRead}
            />
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
