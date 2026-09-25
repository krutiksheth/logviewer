"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  openFile: () => electron.ipcRenderer.invoke("dialog:openFile"),
  readFile: (filePath) => electron.ipcRenderer.invoke("file:read", filePath)
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
