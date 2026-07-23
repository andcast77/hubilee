"use client";

import { Search, Plus } from "lucide-react";
import { Input, Button } from "@hubilee/ui";
import { Link } from "@/lib/next-nav";

export type AdminListToolbarProps = {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
  };
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  filters?: React.ReactNode;
};

/**
 * Shared admin list toolbar: search input + optional primary CTA + optional filters.
 *
 * Designed to replace inline search/CTA rows in scoped POS lists.
 */
export function AdminListToolbar({
  search,
  primaryAction,
  filters,
}: AdminListToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {search ? (
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              className="pl-10"
            />
          </div>
        ) : null}
        {filters ? <div className="flex items-center gap-2">{filters}</div> : null}
      </div>
      {primaryAction ? (
        primaryAction.href ? (
          <Link to={primaryAction.href}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {primaryAction.label}
            </Button>
          </Link>
        ) : (
          <Button onClick={primaryAction.onClick}>
            <Plus className="mr-2 h-4 w-4" />
            {primaryAction.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
