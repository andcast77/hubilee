"use client";

export interface SoftStatusPillProps {
  /** Status key used to determine color. */
  status: string;
  /** Optional override for the display label. Falls back to the status value. */
  label?: string;
}

/**
 * Pastel status/role pill using Hubilee soft-status CSS variables
 * (see `apps/pos/src/app/globals.css`).
 */
export function SoftStatusPill({ status, label }: SoftStatusPillProps) {
  const normalized = status.toLowerCase();
  const displayLabel = label ?? status;

  return (
    <span
      data-testid="soft-status-pill"
      data-status={normalized}
      className="soft-status-pill"
    >
      <span className="soft-status-pill__dot" aria-hidden />
      {displayLabel}
    </span>
  );
}
