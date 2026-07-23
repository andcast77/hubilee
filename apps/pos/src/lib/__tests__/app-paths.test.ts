import { describe, expect, it } from "vitest";
import {
  POS_APP_BASE,
  buildPosLegacyAppRedirects,
  toAppPath,
} from "../app-paths";

describe("toAppPath", () => {
  it("prefixes authenticated paths with /app", () => {
    expect(toAppPath("/dashboard")).toBe("/app/dashboard");
    expect(toAppPath("/products")).toBe("/app/products");
    expect(toAppPath("pos")).toBe("/app/pos");
  });

  it("preserves nested paths and query strings", () => {
    expect(toAppPath("/sales/abc-123")).toBe("/app/sales/abc-123");
    expect(toAppPath("/products?filter=low-stock")).toBe(
      "/app/products?filter=low-stock",
    );
  });

  it("is idempotent for already-prefixed paths", () => {
    expect(toAppPath("/app/dashboard")).toBe("/app/dashboard");
    expect(toAppPath("/app/products/new")).toBe("/app/products/new");
  });

  it("defaults bare root to app dashboard", () => {
    expect(toAppPath("/")).toBe("/app/dashboard");
    expect(toAppPath("")).toBe("/app/dashboard");
  });
});

describe("buildPosLegacyAppRedirects", () => {
  it("redirects /products and nested /products/* to /app", () => {
    const redirects = buildPosLegacyAppRedirects();
    expect(redirects).toContainEqual({
      source: "/products",
      destination: "/app/products",
      permanent: true,
    });
    expect(redirects).toContainEqual({
      source: "/products/:path*",
      destination: "/app/products/:path*",
      permanent: true,
    });
  });

  it("redirects /sales/:id style paths", () => {
    const redirects = buildPosLegacyAppRedirects();
    expect(redirects).toContainEqual({
      source: "/sales/:path*",
      destination: "/app/sales/:path*",
      permanent: true,
    });
  });

  it("does not redirect public auth paths", () => {
    const sources = buildPosLegacyAppRedirects().map((r) => r.source);
    expect(sources).not.toContain("/login");
    expect(sources).not.toContain("/register");
    expect(sources).not.toContain("/terms");
    expect(sources).not.toContain("/forgot-password");
    expect(sources).not.toContain("/reset-password");
    expect(sources.every((s) => s.startsWith("/") && !s.startsWith(POS_APP_BASE))).toBe(
      true,
    );
  });
});
