"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@hubilee/ui";
import { CheckCircle2, Circle } from "lucide-react";
import type { Company, CompanyStats } from "@/types/company";
import { isModuleEnabled } from "@/types/company";
import { shopflowStoresApi } from "@/lib/api-client";

const MS_PER_DAY = 86_400_000;

type CheckItem = {
  id: string;
  done: boolean;
  label: string;
  hint: string;
  to?: string;
  externalHref?: string;
};

type Props = {
  company: Company;
  stats: CompanyStats | undefined;
  shopflowUrl: string;
};

export function OnboardingChecklist({ company, stats, shopflowUrl }: Props) {
  const { data: storesRes } = useQuery({
    queryKey: ["hubShopflowStores", company.id],
    queryFn: async () => {
      const res = await shopflowStoresApi.list();
      if (!res.success) throw new Error(res.error || "stores");
      return res.data ?? [];
    },
    enabled: isModuleEnabled(company, "shopflow"),
    staleTime: 60_000,
  });

  const created = new Date(company.createdAt).getTime();
  const isYoungCompany = Date.now() - created < 14 * MS_PER_DAY;
  const profileOk = Boolean(company.taxId?.trim()) && Boolean(company.name?.trim());
  const modulesOk =
    isModuleEnabled(company, "workify") ||
    isModuleEnabled(company, "shopflow") ||
    isModuleEnabled(company, "techservices");
  const teamOk = (stats?.totalMembers ?? 0) >= 2;
  const stores = storesRes ?? [];
  const activeStores = stores.filter((s) => s.active !== false);
  const storeOk =
    !isModuleEnabled(company, "shopflow") || activeStores.length >= 1;

  const items: CheckItem[] = [
    {
      id: "profile",
      done: profileOk,
      label: "Completar perfil de empresa",
      hint: "Nombre fiscal y RFC o tax ID en configuración.",
      to: "/dashboard/settings",
    },
    {
      id: "modules",
      done: modulesOk,
      label: "Activar módulos",
      hint: "Habilita al menos un módulo (Workify, Shopflow o Tech Services).",
      to: "/dashboard/settings",
    },
    {
      id: "team",
      done: teamOk,
      label: "Invitar al primer miembro del equipo",
      hint: "Desde Miembros, agrega a otro usuario a la empresa.",
      to: "/dashboard/members",
    },
    {
      id: "store",
      done: storeOk,
      label: "Configurar primer local / tienda",
      hint: isModuleEnabled(company, "shopflow")
        ? "Crea tu primer local en Shopflow."
        : "Activa Shopflow y configura locales desde el módulo de ventas.",
      ...(isModuleEnabled(company, "shopflow")
        ? { externalHref: `${shopflowUrl.replace(/\/$/, "")}/admin/settings` }
        : { to: "/dashboard/settings" }),
    },
  ];

  const allDone = items.every((i) => i.done);

  if (!isYoungCompany || allDone) return null;

  return (
    <Card className="border-indigo-200 bg-indigo-50/40">
      <CardHeader>
        <CardTitle className="text-lg text-indigo-950">Primeros pasos</CardTitle>
        <CardDescription>
          Tu empresa es reciente: completa estos pasos cuando puedas (no bloquean el uso del panel).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3">
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 mt-0.5" aria-hidden />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-indigo-400 mt-0.5" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${item.done ? "text-slate-500 line-through" : "text-slate-900"}`}>
                  {item.label}
                </p>
                <p className="text-sm text-slate-600">{item.hint}</p>
                {!item.done && item.externalHref ? (
                  <a
                    href={item.externalHref}
                    className="mt-1 inline-block text-sm font-medium text-indigo-700 hover:underline"
                  >
                    Ir a Shopflow
                  </a>
                ) : null}
                {!item.done && item.to ? (
                  <Link
                    href={item.to}
                    className="mt-1 inline-block text-sm font-medium text-indigo-700 hover:underline"
                  >
                    Abrir
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
