/**
 * When Pos and the API share the same browser origin (typical local/dev with `/v1` rewrite),
 * we can detect missing session cookies server-side and skip `GET /v1/auth/me` for guests
 * (no 401 noise). If the API is on another origin, we must still call `/v1/auth/me` because
 * httpOnly cookies are not visible on Pos.
 *
 * Mirrors client `API_URL`: empty string on the browser when `NEXT_PUBLIC_API_URL` is unset
 * (rewrite proxy); absolute URL when set.
 */
export async function shouldCallMeForLoggedInCheck(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  const sameOrigin = base === "" || base === window.location.origin;
  if (!sameOrigin) return true;

  const r = await fetch("/api/auth/has-session-cookie", { credentials: "include" });
  const data = (await r.json()) as { hasAuthCookies?: boolean };
  return Boolean(data.hasAuthCookies);
}
