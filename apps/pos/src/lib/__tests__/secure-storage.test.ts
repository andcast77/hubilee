import { afterEach, describe, expect, it } from "vitest";
import {
  createElectronTokenStorage,
  createInMemoryTokenStorage,
} from "../secure-storage";

describe("createInMemoryTokenStorage", () => {
  it("starts empty", async () => {
    const storage = createInMemoryTokenStorage();
    expect(await storage.getAccessToken()).toBeNull();
    expect(await storage.getRefreshToken()).toBeNull();
  });

  it("stores and returns the access/refresh pair", async () => {
    const storage = createInMemoryTokenStorage();
    await storage.setTokens({ accessToken: "a1", refreshToken: "r1" });
    expect(await storage.getAccessToken()).toBe("a1");
    expect(await storage.getRefreshToken()).toBe("r1");
  });

  it("clears both tokens", async () => {
    const storage = createInMemoryTokenStorage();
    await storage.setTokens({ accessToken: "a1", refreshToken: "r1" });
    await storage.clear();
    expect(await storage.getAccessToken()).toBeNull();
    expect(await storage.getRefreshToken()).toBeNull();
  });

  it("overwrites a previously stored pair on rotation", async () => {
    const storage = createInMemoryTokenStorage();
    await storage.setTokens({ accessToken: "a1", refreshToken: "r1" });
    await storage.setTokens({ accessToken: "a2", refreshToken: "r2" });
    expect(await storage.getAccessToken()).toBe("a2");
    expect(await storage.getRefreshToken()).toBe("r2");
  });
});

describe("createElectronTokenStorage", () => {
  afterEach(() => {
    delete window.hubileeDesktop;
  });

  it("falls back to in-memory when the Electron bridge is unavailable", async () => {
    const storage = createElectronTokenStorage();
    await expect(
      storage.setTokens({ accessToken: "a1", refreshToken: "r1" }),
    ).resolves.toBeUndefined();
    expect(await storage.getAccessToken()).toBe("a1");
    expect(await storage.getRefreshToken()).toBe("r1");
  });

  it("uses hubileeDesktop IPC when present", async () => {
    let tokens: { accessToken: string; refreshToken: string } | null = null;
    window.hubileeDesktop = {
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

    const storage = createElectronTokenStorage();
    await storage.setTokens({ accessToken: "ea", refreshToken: "er" });
    expect(await storage.getAccessToken()).toBe("ea");
    expect(await storage.getRefreshToken()).toBe("er");
    await storage.clear();
    expect(await storage.getAccessToken()).toBeNull();
  });

  it("does not export Tauri storage helpers", async () => {
    const mod = await import("../secure-storage");
    expect("createTauriTokenStorage" in mod).toBe(false);
    expect(typeof mod.createElectronTokenStorage).toBe("function");
  });
});
