/**
 * Electron main process — hosts Next UI and persists auth tokens with safeStorage.
 *
 * Dev: load ELECTRON_START_URL or http://localhost:3002/app/
 * Prod: load ELECTRON_START_URL (packaged Next standalone URL / host).
 */
const { app, BrowserWindow, ipcMain, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");

const TOKEN_FILE = "auth-tokens.bin";

function tokenPath() {
  return path.join(app.getPath("userData"), TOKEN_FILE);
}

function readTokens() {
  try {
    const file = tokenPath();
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file);
    if (!safeStorage.isEncryptionAvailable()) {
      return JSON.parse(raw.toString("utf8"));
    }
    const decrypted = safeStorage.decryptString(raw);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

function writeTokens(tokens) {
  const payload = JSON.stringify(tokens);
  const file = tokenPath();
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(file, safeStorage.encryptString(payload));
  } else {
    fs.writeFileSync(file, payload, "utf8");
  }
}

function clearTokensFile() {
  const file = tokenPath();
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const startUrl =
    process.env.ELECTRON_START_URL ||
    process.env.NEXT_PUBLIC_POS_URL ||
    "http://localhost:3002/app/";

  void win.loadURL(startUrl.endsWith("/") ? startUrl : `${startUrl}/`);
}

app.whenReady().then(() => {
  ipcMain.handle("auth:getAccessToken", () => readTokens()?.accessToken ?? null);
  ipcMain.handle("auth:getRefreshToken", () => readTokens()?.refreshToken ?? null);
  ipcMain.handle("auth:setTokens", (_event, tokens) => {
    writeTokens(tokens);
  });
  ipcMain.handle("auth:clearTokens", () => {
    clearTokensFile();
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
