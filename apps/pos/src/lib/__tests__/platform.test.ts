import { afterEach, describe, expect, it } from "vitest";
import {
  clearDesktopSession,
  createApiClientOptions,
  createAuthTransport,
  getTokenStorage,
  isDesktop,
} from "../platform";

function memoryBridge(): NonNullable<Window["hubileeDesktop"]> {
  let tokens: { accessToken: string; refreshToken: string } | null = null;
  return {
    isElectron: true,
    async getAccessToken() {
      return tokens?.accessToken ?? null;
    },
    async getRefreshToken() {
      return tokens?.refreshToken ?? null;
    },
    async setTokens(next) {
      tokens = next;
    },
    async clearTokens() {
      tokens = null;
    },
  };
}

function setDesktop(on: boolean) {
  if (on) {
    window.hubileeDesktop = memoryBridge();
  } else {
    delete window.hubileeDesktop;
  }
}

describe("platform.isDesktop", () => {
  afterEach(() => {
    setDesktop(false);
  });

  it("returns false in a plain browser/web context", () => {
    expect(isDesktop()).toBe(false);
  });

  it("returns true when hubileeDesktop.isElectron is true", () => {
    setDesktop(true);
    expect(isDesktop()).toBe(true);
  });

  it("does not treat __TAURI_INTERNALS__ as desktop", () => {
    ;(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ =
      {};
    expect(isDesktop()).toBe(false);
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });
});

describe("platform.createAuthTransport (Electron Bearer wiring)", () => {
  afterEach(async () => {
    setDesktop(true);
    await clearDesktopSession();
    setDesktop(false);
  });

  it("returns cookie mode on web", () => {
    setDesktop(false);
    expect(createAuthTransport()).toEqual({ mode: "cookie" });
  });

  it("returns a bearer transport backed by Electron storage on desktop", async () => {
    setDesktop(true);
    const transport = createAuthTransport();
    expect(transport.mode).toBe("bearer");
    if (transport.mode !== "bearer") throw new Error("unreachable");

    expect(await transport.getAccessToken()).toBeNull();

    await transport.onRotated({ accessToken: "a1", refreshToken: "r1" });
    expect(await transport.getAccessToken()).toBe("a1");
    expect(await transport.getRefreshToken()).toBe("r1");

    await transport.onAuthCleared();
    expect(await transport.getAccessToken()).toBeNull();
    expect(await transport.getRefreshToken()).toBeNull();
  });
});

describe("platform.createApiClientOptions", () => {
  afterEach(async () => {
    setDesktop(true);
    await clearDesktopSession();
    setDesktop(false);
  });

  it("returns refreshOn401 on web (cookie silent refresh)", () => {
    setDesktop(false);
    expect(createApiClientOptions()).toEqual({ refreshOn401: true });
  });

  it("returns refreshOn401 + bearer authTransport on desktop", () => {
    setDesktop(true);
    const options = createApiClientOptions();
    expect(options.refreshOn401).toBe(true);
    expect(options.authTransport?.mode).toBe("bearer");
  });
});

describe("platform.clearDesktopSession", () => {
  afterEach(() => {
    setDesktop(false);
  });

  it("is a no-op on web", async () => {
    await expect(clearDesktopSession()).resolves.toBeUndefined();
  });

  it("clears the shared desktop token storage", async () => {
    setDesktop(true);
    const transport = createAuthTransport();
    if (transport.mode === "bearer") {
      await transport.onRotated({ accessToken: "a1", refreshToken: "r1" });
    }

    await clearDesktopSession();

    expect(await getTokenStorage().getAccessToken()).toBeNull();
  });
});
