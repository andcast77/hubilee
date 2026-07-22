import { describe, expect, it } from "vitest";
import {
  POS_PWA_THEME_COLOR,
  POS_SW_SCOPE,
  POS_SW_SCRIPT_URL,
  buildPosContentSecurityPolicy,
  buildPosWebAppManifest,
  getPosServiceWorkerRegistration,
} from "../pwa";

describe("buildPosWebAppManifest", () => {
  it("scopes installability to /app/ with 192 and 512 icons", () => {
    const manifest = buildPosWebAppManifest();

    expect(manifest.name).toBe("Pos");
    expect(manifest.short_name).toBe("Pos");
    expect(manifest.start_url).toBe("/app/");
    expect(manifest.scope).toBe("/app/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe(POS_PWA_THEME_COLOR);
    expect(manifest.theme_color).toBe("#2563eb");
    expect(manifest.icons).toEqual([
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ]);
  });

  it("does not claim marketing / as the install start or scope", () => {
    const manifest = buildPosWebAppManifest();

    expect(manifest.start_url).not.toBe("/");
    expect(manifest.scope).not.toBe("/");
    expect(manifest.start_url?.startsWith("/app")).toBe(true);
    expect(manifest.scope?.startsWith("/app")).toBe(true);
  });
});

describe("getPosServiceWorkerRegistration", () => {
  it("registers /sw.js with hardcoded /app/ scope", () => {
    const registration = getPosServiceWorkerRegistration();

    expect(registration.scriptUrl).toBe("/sw.js");
    expect(registration.scriptUrl).toBe(POS_SW_SCRIPT_URL);
    expect(registration.options).toEqual({ scope: "/app/" });
    expect(registration.options.scope).toBe(POS_SW_SCOPE);
  });

  it("never uses root scope", () => {
    const { options } = getPosServiceWorkerRegistration();
    expect(options.scope).not.toBe("/");
  });
});

describe("buildPosContentSecurityPolicy", () => {
  it("explicitly allows same-origin workers", () => {
    const csp = buildPosContentSecurityPolicy();
    expect(csp).toContain("worker-src 'self'");
  });

  it("keeps default-src self and does not loosen frame-ancestors", () => {
    const csp = buildPosContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
