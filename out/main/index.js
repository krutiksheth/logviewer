"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const fs = require("fs");
const child_process = require("child_process");
let activeDockerProcess = null;
let dockerLineBuffer = "";
function stopDockerProcess() {
  if (activeDockerProcess) {
    activeDockerProcess.kill();
    activeDockerProcess = null;
  }
  dockerLineBuffer = "";
}
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
  mainWindow.on("closed", () => stopDockerProcess());
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
  electron.ipcMain.handle("docker:listContainers", async () => {
    return new Promise((resolve) => {
      const proc = child_process.spawn("docker", [
        "ps",
        "--no-trunc",
        "--format",
        "{{.ID}}	{{.Names}}	{{.Image}}	{{.Status}}"
      ]);
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => {
        stdout += d.toString();
      });
      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });
      proc.on("close", (code) => {
        if (code !== 0) {
          resolve({ success: false, error: stderr.trim() || "docker ps failed" });
          return;
        }
        const containers = stdout.split("\n").filter((l) => l.trim()).map((line) => {
          const [id, name, image, ...rest] = line.split("	");
          return { id, name: name.replace(/^\//, ""), image, status: rest.join("	") };
        });
        resolve({ success: true, containers });
      });
      proc.on("error", (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  });
  electron.ipcMain.handle("docker:startStream", async (event, containerId) => {
    stopDockerProcess();
    return new Promise((resolve) => {
      const proc = child_process.spawn("docker", ["logs", "-f", "--timestamps", containerId]);
      activeDockerProcess = proc;
      const handleChunk = (chunk) => {
        dockerLineBuffer += chunk.toString();
        const lines = dockerLineBuffer.split("\n");
        dockerLineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!event.sender.isDestroyed()) {
            event.sender.send("docker:logLine", line);
          }
        }
      };
      proc.stdout.on("data", handleChunk);
      proc.stderr.on("data", handleChunk);
      proc.on("close", () => {
        if (dockerLineBuffer.trim() && !event.sender.isDestroyed()) {
          event.sender.send("docker:logLine", dockerLineBuffer.trim());
        }
        dockerLineBuffer = "";
        activeDockerProcess = null;
        if (!event.sender.isDestroyed()) {
          event.sender.send("docker:streamEnd");
        }
      });
      proc.on("error", (err) => {
        activeDockerProcess = null;
        resolve({ success: false, error: err.message });
      });
      setTimeout(() => resolve({ success: true }), 100);
    });
  });
  electron.ipcMain.handle("docker:stopStream", async () => {
    stopDockerProcess();
  });
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
