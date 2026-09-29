import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface DockerContainer {
    id: string
    name: string
    image: string
    status: string
  }

  interface Window {
    electron: ElectronAPI
    api: {
      openFile: () => Promise<string | null>
      readFile: (filePath: string) => Promise<{
        success: boolean
        content?: string
        error?: string
      }>
      listContainers: () => Promise<{
        success: boolean
        containers?: DockerContainer[]
        error?: string
      }>
      startDockerStream: (containerId: string) => Promise<{ success: boolean; error?: string }>
      stopDockerStream: () => Promise<void>
      onDockerLogLine: (cb: (line: string) => void) => void
      onDockerStreamEnd: (cb: () => void) => void
      removeDockerLogListeners: () => void
    }
  }
}
