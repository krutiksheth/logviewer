import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFile'),
  readFile: (
    filePath: string
  ): Promise<{ success: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke('file:read', filePath)
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
