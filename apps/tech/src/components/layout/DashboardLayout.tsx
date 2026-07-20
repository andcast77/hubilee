"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authApi, techServicesApi } from "@/lib/api/client";

type TechUser = {
  id: string;
  email: string;
  name: string;
  companyId?: string;
  membershipRole?: string;
  isSuperuser?: boolean;
  company?: {
    id: string;
    name: string;
    technicalServicesEnabled: boolean;
  };
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TechUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    techServicesApi
      .get<{ success: boolean; user?: TechUser }>("/me")
      .then((data) => {
        if (!data?.user) {
          window.location.href = "/login";
          return;
        }
        setUser(data.user);
      })
      .catch(() => {
        window.location.href = "/login";
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.post("/logout");
    } catch {
      // ignore
    }
    if (typeof document !== "undefined") {
      document.cookie = "token=; path=/; max-age=0";
    }
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (user.company?.technicalServicesEnabled === false && !user.isSuperuser && user.companyId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-amber-50">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-amber-900 mb-2">Modulo no activo</h1>
          <p className="text-amber-800">
            El modulo de servicios tecnicos no esta activo para esta empresa.
          </p>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Activos", href: "/assets" },
    { name: "Ordenes", href: "/work-orders" },
    { name: "Agenda", href: "/schedule" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white">
        <div className="flex h-16 items-center justify-center border-b border-slate-800">
          <h1 className="text-lg font-semibold">Servicios Tecnicos</h1>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <div className="text-xs text-slate-400">{user.company?.name || "Empresa"}</div>
          <div className="text-sm font-medium">{user.name}</div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
      <main className="min-h-screen pl-64">
        <div className="px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
