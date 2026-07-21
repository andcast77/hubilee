import { describe, expect, it } from "vitest";
import {
  AUTH_DISALLOW_PATHS,
  AUTH_NOINDEX_METADATA,
  buildHubRobotsConfig,
  buildHubRootMetadata,
  buildHubSitemapEntries,
  resolveHubMetadataBaseUrl,
} from "./seo";

describe("resolveHubMetadataBaseUrl", () => {
  it("uses a valid absolute NEXT_PUBLIC_HUB_URL", () => {
    const url = resolveHubMetadataBaseUrl("https://hub.example.com");
    expect(url.href).toBe("https://hub.example.com/");
  });

  it("falls back to localhost:3001 when env is missing or invalid", () => {
    expect(resolveHubMetadataBaseUrl(undefined).href).toBe(
      "http://localhost:3001/",
    );
    expect(resolveHubMetadataBaseUrl("").href).toBe("http://localhost:3001/");
    expect(resolveHubMetadataBaseUrl("not-a-url").href).toBe(
      "http://localhost:3001/",
    );
  });
});

describe("buildHubRootMetadata", () => {
  it("exposes metadataBase, title template, description, OG and Twitter", () => {
    const base = new URL("https://hub.example.com");
    const metadata = buildHubRootMetadata(base);

    expect(metadata.metadataBase).toEqual(base);
    expect(metadata.applicationName).toBe("Hubilee");
    expect(metadata.title).toEqual({
      default: "Hubilee",
      template: "%s · Hubilee",
    });
    expect(metadata.description).toContain("Hubilee");
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      locale: "es",
      siteName: "Hubilee",
      title: "Hubilee",
      description: metadata.description,
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary",
      title: "Hubilee",
      description: metadata.description,
    });
    expect(metadata.icons).toEqual({ icon: "/favicon.ico" });
  });
});

describe("buildHubRobotsConfig", () => {
  it("allows marketing / and disallows auth routes", () => {
    const robots = buildHubRobotsConfig();

    expect(robots.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: [...AUTH_DISALLOW_PATHS],
    });
    expect(AUTH_DISALLOW_PATHS).toEqual([
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ]);
  });
});

describe("buildHubSitemapEntries", () => {
  it("lists only absolute marketing / under the metadata base", () => {
    const entries = buildHubSitemapEntries(new URL("https://hub.example.com"));
    expect(entries).toEqual([{ url: "https://hub.example.com/" }]);
  });

  it("never includes auth paths", () => {
    const entries = buildHubSitemapEntries(new URL("http://localhost:3001"));
    const urls = entries.map((entry) => entry.url);
    expect(urls).toEqual(["http://localhost:3001/"]);
    for (const path of AUTH_DISALLOW_PATHS) {
      expect(urls.some((url) => url.includes(path))).toBe(false);
    }
  });
});

describe("AUTH_NOINDEX_METADATA", () => {
  it("marks auth pages as noindex nofollow", () => {
    expect(AUTH_NOINDEX_METADATA).toEqual({
      robots: { index: false, follow: false },
    });
  });
});
