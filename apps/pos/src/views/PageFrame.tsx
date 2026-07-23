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
    <main>
      <header className="mb-6">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <AppBreadcrumb items={breadcrumbs} Link={Link} className="mb-1" />
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      </header>
      <div
        data-testid="content-card"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {children}
      </div>
    </main>
  );
}
