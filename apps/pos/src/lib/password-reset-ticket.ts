/**
 * Short-lived client handoff after OTP verify → reset password page.
 * Keeps the ticket out of the URL.
 */
const STORAGE_KEY = "pos.passwordResetTicket";

type StoredTicket = {
  email: string;
  resetTicket: string;
};

export function storePasswordResetTicket(email: string, resetTicket: string): void {
  if (typeof window === "undefined") return;
  const payload: StoredTicket = {
    email: email.trim().toLowerCase(),
    resetTicket,
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readPasswordResetTicket(expectedEmail?: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTicket;
    if (!parsed?.email || !parsed?.resetTicket) return null;
    if (expectedEmail) {
      const normalized = expectedEmail.trim().toLowerCase();
      if (parsed.email !== normalized) return null;
    }
    return parsed.resetTicket;
  } catch {
    return null;
  }
}

export function clearPasswordResetTicket(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
