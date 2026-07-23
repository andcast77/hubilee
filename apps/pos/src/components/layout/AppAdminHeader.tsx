"use client";

import { Menu, Bell, User } from "lucide-react";
import { Button } from "@hubilee/ui";

export interface AppAdminHeaderProps {
  /** Hamburger click handler for mobile overlay. */
  onMenuToggle?: () => void;
  /** Unread notification count (0 = no badge). */
  unreadCount?: number;
  /** Notification bell click handler. */
  onBellClick?: () => void;
  /** User menu click handler. */
  onUserClick?: () => void;
  /** User display name (shown when present). */
  userName?: string;
  /** Whether to show a mobile menu button. */
  showMenuButton?: boolean;
}

/**
 * Light Hubilee admin header for `/app/*` shell.
 *
 * Renders a minimal header with:
 * - Optional hamburger menu toggle (mobile overlay)
 * - Notification bell with unread badge
 * - User indicator
 *
 * No fake search, theme toggle, language switcher, or cart.
 */
export function AppAdminHeader({
  onMenuToggle,
  unreadCount = 0,
  onBellClick,
  onUserClick,
  userName,
  showMenuButton = false,
}: AppAdminHeaderProps) {
  return (
    <header
      data-testid="admin-header"
      className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6"
    >
      <div className="flex items-center gap-3">
        {showMenuButton ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            aria-label="Abrir menú"
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        ) : null}
        {/* Title area reserved for page-level breadcrumbs rendered by PageFrame */}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBellClick}
          aria-label={
            unreadCount > 0
              ? `Notificaciones, ${unreadCount} sin leer`
              : "Notificaciones"
          }
          className="relative"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 ? (
            <span
              data-testid="notification-badge"
              className="admin-header-notification-badge absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onUserClick}
          aria-label={userName ? `Usuario: ${userName}` : "Usuario"}
        >
          <User className="h-5 w-5 text-slate-600" />
        </Button>
      </div>
    </header>
  );
}
