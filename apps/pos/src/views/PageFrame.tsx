"use client";

import { Link } from "@/lib/next-nav";
import { AppBreadcrumb } from "@hubilee/ui";

export type PageFrameBreadcrumb = { label: string; href?: string };

export function PageFrame({
  title,
  breadcrumbs,
  children,
}: {
  title: string;
  breadcrumbs?: PageFrameBreadcrumb[];
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <AppBreadcrumb items={breadcrumbs} Link={Link} className="mb-1" />
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      </header>
      {children}
    </main>
  );
}
