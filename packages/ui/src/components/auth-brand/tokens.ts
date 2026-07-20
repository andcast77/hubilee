/** Shared brand auth surface — same layout across Hub, Pos, Workify, Techservices. */

/**
 * `!` needed so Tailwind wins over unlayered `.ui-card` / `.ui-input` SCSS when CSS is bundled
 * with PostCSS (e.g. Next.js); otherwise the library paints white `hsl(var(--card))` / inputs.
 */
export const AUTH_BRAND_CARD_CLASS =
  "!border !border-white/10 !bg-white/5 !text-white shadow-none backdrop-blur-md !ring-1 !ring-white/10";

export const AUTH_BRAND_INPUT_CLASS =
  "!rounded-md !bg-white/10 !border-white/20 !text-white placeholder:!text-white/40";

export const AUTH_BRAND_LABEL_CLASS = "!text-white/80";

/** Primary submit (login, MFA continue, register submit, etc.) */
export const AUTH_BRAND_PRIMARY_BUTTON_CLASS =
  "w-full !bg-indigo-600 hover:!bg-indigo-500 !text-white font-medium py-2 rounded-xl shadow-lg shadow-indigo-500/25 [background-image:none]";

export const AUTH_BRAND_FORGOT_LINK_CLASS =
  "text-sm text-indigo-300 hover:text-indigo-200 hover:underline";

export const AUTH_BRAND_LINK_SUBTLE_CLASS =
  "text-sm p-0 h-auto text-indigo-300 hover:text-indigo-200";

export const AUTH_BRAND_OUTLINE_BUTTON_CLASS =
  "!w-full !border-white/20 !bg-white/5 !text-white hover:!bg-white/10 [background-image:none]";

export const AUTH_BRAND_HOME_LINK_CLASS = "text-xs text-white/40 hover:text-white/60";

/** Native &lt;select&gt; in brand auth flows (e.g. multi-company) */
export const AUTH_BRAND_SELECT_CLASS =
  "w-full rounded-xl bg-white/10 border border-white/20 text-white py-2 px-3";
