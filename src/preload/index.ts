import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFile'),
  readFile: (
    filePath: string
  ): Promise<{ success: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke('file:read', filePath),
  listContainers: (): Promise<{
    success: boolean
    containers?: DockerContainer[]
    error?: string
  }> => ipcRenderer.invoke('docker:listContainers'),
  startDockerStream: (containerId: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('docker:startStream', containerId),
  stopDockerStream: (): Promise<void> => ipcRenderer.invoke('docker:stopStream'),
  onDockerLogLine: (cb: (line: string) => void): void => {
    ipcRenderer.on('docker:logLine', (_event, line: string) => cb(line))
  },
  onDockerStreamEnd: (cb: () => void): void => {
    ipcRenderer.on('docker:streamEnd', cb)
  },
  removeDockerLogListeners: (): void => {
    ipcRenderer.removeAllListeners('docker:logLine')
    ipcRenderer.removeAllListeners('docker:streamEnd')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
