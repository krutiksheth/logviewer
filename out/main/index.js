"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const fs = require("fs");
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "Log Viewer",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.logviewer.app");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.handle("dialog:openFile", async () => {
    const { canceled, filePaths } = await electron.dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Log Files", extensions: ["log", "txt"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (canceled || filePaths.length === 0) return null;
    return filePaths[0];
  });
  electron.ipcMain.handle("file:read", async (_event, filePath) => {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
