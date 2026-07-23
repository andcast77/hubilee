"use client";

import { User } from "lucide-react";

export interface IdentityCellProps {
  /** Primary display name. */
  title: string;
  /** Secondary text (email, role, etc.). */
  subtitle?: string;
  /** Avatar image URL. When omitted, renders initials or fallback icon. */
  avatar?: string;
}

/**
 * Identity display cell: avatar circle + title + optional subtitle.
 *
 * Renders a compact identity layout suitable for table cells and list items.
 * Falls back to initials (derived from title) or a User icon when no avatar is provided.
 */
export function IdentityCell({ title, subtitle, avatar }: IdentityCellProps) {
  const initials = title
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      {avatar ? (
        <img
          src={avatar}
          alt={title}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {initials || <User className="h-4 w-4" />}
        </span>
      )}
      {/* Name + subtitle */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-900">{title}</span>
        {subtitle ? (
          <span className="text-xs text-slate-500">{subtitle}</span>
        ) : null}
      </div>
    </div>
  );
}
