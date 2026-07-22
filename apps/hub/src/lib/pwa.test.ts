import { describe, expect, it } from "vitest";
import {
  HUB_PWA_THEME_COLOR,
  HUB_SW_SCOPE,
  HUB_SW_SCRIPT_URL,
  buildHubContentSecurityPolicy,
  buildHubWebAppManifest,
  getHubServiceWorkerRegistration,
} from "./pwa";

describe("buildHubWebAppManifest", () => {
  it("scopes installability to /dashboard/ with 192 and 512 icons", () => {
    const manifest = buildHubWebAppManifest();

    expect(manifest.name).toBe("Hubilee");
    expect(manifest.short_name).toBe("Hubilee");
    expect(manifest.start_url).toBe("/dashboard/");
    expect(manifest.scope).toBe("/dashboard/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe(HUB_PWA_THEME_COLOR);
    expect(manifest.theme_color).toBe("#6366F1");
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
    const manifest = buildHubWebAppManifest();

    expect(manifest.start_url).not.toBe("/");
    expect(manifest.scope).not.toBe("/");
    expect(manifest.start_url?.startsWith("/dashboard")).toBe(true);
    expect(manifest.scope?.startsWith("/dashboard")).toBe(true);
  });
});

describe("getHubServiceWorkerRegistration", () => {
  it("registers /sw.js with hardcoded dashboard scope", () => {
    const registration = getHubServiceWorkerRegistration();

    expect(registration.scriptUrl).toBe("/sw.js");
    expect(registration.scriptUrl).toBe(HUB_SW_SCRIPT_URL);
    expect(registration.options).toEqual({ scope: "/dashboard/" });
    expect(registration.options.scope).toBe(HUB_SW_SCOPE);
  });

  it("never uses root scope", () => {
    const { options } = getHubServiceWorkerRegistration();
    expect(options.scope).not.toBe("/");
  });
});

describe("buildHubContentSecurityPolicy", () => {
  it("explicitly allows same-origin workers", () => {
    const csp = buildHubContentSecurityPolicy();
    expect(csp).toContain("worker-src 'self'");
  });

  it("keeps default-src self and does not loosen frame-ancestors", () => {
    const csp = buildHubContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
