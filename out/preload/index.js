"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  openFile: () => electron.ipcRenderer.invoke("dialog:openFile"),
  readFile: (filePath) => electron.ipcRenderer.invoke("file:read", filePath),
  listContainers: () => electron.ipcRenderer.invoke("docker:listContainers"),
  startDockerStream: (containerId) => electron.ipcRenderer.invoke("docker:startStream", containerId),
  stopDockerStream: () => electron.ipcRenderer.invoke("docker:stopStream"),
  onDockerLogLine: (cb) => {
    electron.ipcRenderer.on("docker:logLine", (_event, line) => cb(line));
  },
  onDockerStreamEnd: (cb) => {
    electron.ipcRenderer.on("docker:streamEnd", cb);
  },
  removeDockerLogListeners: () => {
    electron.ipcRenderer.removeAllListeners("docker:logLine");
    electron.ipcRenderer.removeAllListeners("docker:streamEnd");
  }
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
