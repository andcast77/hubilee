"use client";

/**
 * Next.js navigation shims with a TanStack-Router-like surface so shared
 * views/components work under the App Router (product path). Paths for the
 * authenticated webapp are prefixed with `/app` via `toAppPath`.
 */

import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { toAppPath } from "@/lib/app-paths";

const PUBLIC_PREFIXES = ["/", "/login", "/register", "/terms"] as const;

function isPublicPath(path: string): boolean {
  const pathname = path.split("?")[0] ?? path;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)),
  );
}

function applyParams(path: string, params?: Record<string, string>): string {
  if (!params) return path;
  let out = path;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(`$${key}`, encodeURIComponent(value));
  }
  return out;
}

function resolveHref(
  path: string,
  params?: Record<string, string>,
  search?: Record<string, string | undefined>,
): string {
  let resolved = applyParams(path, params);
  if (!resolved.startsWith("http") && !isPublicPath(resolved)) {
    resolved = toAppPath(resolved);
  }
  if (search && Object.keys(search).length > 0) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(search)) {
      if (v != null && v !== "") qs.set(k, v);
    }
    const q = qs.toString();
    if (q) {
      resolved += resolved.includes("?") ? `&${q}` : `?${q}`;
    }
  }
  return resolved;
}

type AppLinkProps = Omit<ComponentPropsWithoutRef<typeof NextLink>, "href"> & {
  to?: string;
  href?: string;
  params?: Record<string, string>;
  children?: ReactNode;
};

export const Link = forwardRef<HTMLAnchorElement, AppLinkProps>(
  function AppLink({ to, href, params, children, ...rest }, ref) {
    const target = to ?? href ?? "/";
    const finalHref = resolveHref(target, params);
    return (
      <NextLink ref={ref} href={finalHref} {...rest}>
        {children}
      </NextLink>
    );
  },
);

type NavigateOpts = {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string | undefined>;
  replace?: boolean;
};

export function useNavigate() {
  const router = useRouter();
  return (opts: NavigateOpts) => {
    const url = resolveHref(opts.to, opts.params, opts.search);
    if (opts.replace) router.replace(url);
    else router.push(url);
  };
}

export function useParams(_opts?: { strict?: boolean }): Record<string, string> {
  const params = useNextParams();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0];
  }
  return out;
}

export function useSearch(_opts?: { strict?: boolean }): Record<string, string> {
  const searchParams = useSearchParams();
  const out: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function useLocation(opts: {
  select: (location: { pathname: string }) => string;
}): string;
export function useLocation(): { pathname: string };
export function useLocation(opts?: {
  select?: (location: { pathname: string }) => string;
}): { pathname: string } | string {
  const pathname = usePathname() || "/";
  const location = { pathname };
  if (opts?.select) return opts.select(location);
  return location;
}

export { usePathname };
