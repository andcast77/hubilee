/**
 * Electron preload — exposes a minimal desktop bridge to the renderer.
 * Tokens are stored in the main process via safeStorage + IPC.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hubileeDesktop", {
  isElectron: true,
  getAccessToken: () => ipcRenderer.invoke("auth:getAccessToken"),
  getRefreshToken: () => ipcRenderer.invoke("auth:getRefreshToken"),
  setTokens: (tokens) => ipcRenderer.invoke("auth:setTokens", tokens),
  clearTokens: () => ipcRenderer.invoke("auth:clearTokens"),
});
