"use client";

import { X } from "lucide-react";
import { Button } from "@hubilee/ui";
import { Link } from "@/lib/next-nav";
import { useUser } from "@/hooks/useUser";
import { canAccessModule, Module } from "@/lib/permissions";
import type { UserRole } from "@/types";
import { posNavGroups } from "./posNavGroups";

export interface AdminMobileNavOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Pos-local Spike-style mobile drawer. Keeps `@hubilee/ui` Sidebar API stable.
 */
export function AdminMobileNavOverlay({ open, onClose }: AdminMobileNavOverlayProps) {
  const { data: user } = useUser();
  const role = user?.role as UserRole | undefined;

  if (!open) return null;

  return (
    <div
      data-testid="admin-mobile-nav"
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-slate-200 bg-white shadow-xl">
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <span className="text-sm font-semibold text-slate-900">Menú</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Navegación móvil">
          {posNavGroups.map((group) => {
            const visible = group.items.filter((item) => {
              if (!item.module) return true;
              if (!role) return true;
              return canAccessModule(role, item.module as Module);
            });
            if (visible.length === 0) return null;
            return (
              <div key={group.title} className="mb-4">
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {group.title}
                </p>
                <ul className="space-y-0.5">
                  {visible.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          href={item.href}
                          onClick={onClose}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
