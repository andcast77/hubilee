import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/** Must match `apps/api/src/core/session-cookie.ts` */
const AUTH_SESSION_COOKIE = "ms_session";
const AUTH_REFRESH_COOKIE = "ms_refresh";

/**
 * True if the browser sent auth cookies to Pos. Used to skip `GET /v1/auth/me` for guests
 * (avoids a noisy 401 in DevTools when probing “already logged in?” on login/register).
 * Only meaningful when API traffic is same-origin (dev rewrite or equivalent); if the API is
 * on another host, the client falls back to always calling `/v1/auth/me`.
 */
export async function GET() {
  const jar = await cookies();
  const hasAuthCookies = Boolean(
    jar.get(AUTH_SESSION_COOKIE)?.value || jar.get(AUTH_REFRESH_COOKIE)?.value,
  );
  return NextResponse.json({ hasAuthCookies });
}
