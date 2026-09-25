import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFile: () => Promise<string | null>
      readFile: (filePath: string) => Promise<{
        success: boolean
        content?: string
        error?: string
      }>
    }
  }
}
