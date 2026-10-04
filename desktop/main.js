// EAR desktop: a native window around the live EAR web app (accounts, inbox, rounds). Cookies persist between launches.
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

const SITE = (process.env.EAR_URL || "https://ear-8ii9.onrender.com").replace(/\/$/, "");
const ORIGIN = new URL(SITE).origin;
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: "#0b0a14",
    title: "EAR",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true }
  });
  if (process.platform !== "darwin") Menu.setApplicationMenu(null);

  const load = () => win.loadURL(`${SITE}/inbox`);
  // Links to other sites open in the normal browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try { if (new URL(url).origin === ORIGIN) return { action: "allow" }; } catch { /* fall through */ }
    void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    try { if (new URL(url).origin === ORIGIN || url.startsWith("file:")) return; } catch { /* block */ }
    e.preventDefault();
    void shell.openExternal(url);
  });
  // No network / server asleep: show a calm retry page instead of a blank window.
  win.webContents.on("did-fail-load", (_e, code, _d, _u, isMainFrame) => {
    if (isMainFrame && code !== -3) void win.loadFile(path.join(__dirname, "offline.html"));
  });
  load();
  win.on("closed", () => { win = null; });
  win.webContents.on("did-finish-load", () => {
    if (win && win.webContents.getURL().startsWith("file:")) {
      win.webContents.executeJavaScript(`window.__site = ${JSON.stringify(SITE + "/inbox")}`).catch(() => undefined);
    }
  });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(createWindow);
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
