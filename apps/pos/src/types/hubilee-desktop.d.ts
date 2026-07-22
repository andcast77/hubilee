export type HubileeDesktopTokens = {
  accessToken: string;
  refreshToken: string;
};

export type HubileeDesktopBridge = {
  isElectron: true;
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setTokens(tokens: HubileeDesktopTokens): Promise<void>;
  clearTokens(): Promise<void>;
};

declare global {
  interface Window {
    hubileeDesktop?: HubileeDesktopBridge;
  }
}

export {};
