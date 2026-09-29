import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { readFileSync } from 'fs'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'

let activeDockerProcess: ChildProcessWithoutNullStreams | null = null
let dockerLineBuffer = ''

function stopDockerProcess(): void {
  if (activeDockerProcess) {
    activeDockerProcess.kill()
    activeDockerProcess = null
  }
  dockerLineBuffer = ''
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Log Viewer',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => stopDockerProcess())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.logviewer.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Log Files', extensions: ['log', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (canceled || filePaths.length === 0) return null
    return filePaths[0]
  })

  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const content = readFileSync(filePath, 'utf-8')
      return { success: true, content }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('docker:listContainers', async () => {
    return new Promise((resolve) => {
      const proc = spawn('docker', [
        'ps',
        '--no-trunc',
        '--format',
        '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}'
      ])
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      proc.on('close', (code) => {
        if (code !== 0) {
          resolve({ success: false, error: stderr.trim() || 'docker ps failed' })
          return
        }
        const containers = stdout
          .split('\n')
          .filter((l) => l.trim())
          .map((line) => {
            const [id, name, image, ...rest] = line.split('\t')
            return { id, name: name.replace(/^\//, ''), image, status: rest.join('\t') }
          })
        resolve({ success: true, containers })
      })
      proc.on('error', (err) => {
        resolve({ success: false, error: err.message })
      })
    })
  })

  ipcMain.handle('docker:startStream', async (event, containerId: string) => {
    stopDockerProcess()
    return new Promise((resolve) => {
      const proc = spawn('docker', ['logs', '-f', '--timestamps', containerId])
      activeDockerProcess = proc

      const handleChunk = (chunk: Buffer): void => {
        dockerLineBuffer += chunk.toString()
        const lines = dockerLineBuffer.split('\n')
        dockerLineBuffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!event.sender.isDestroyed()) {
            event.sender.send('docker:logLine', line)
          }
        }
      }

      proc.stdout.on('data', handleChunk)
      proc.stderr.on('data', handleChunk)

      proc.on('close', () => {
        if (dockerLineBuffer.trim() && !event.sender.isDestroyed()) {
          event.sender.send('docker:logLine', dockerLineBuffer.trim())
        }
        dockerLineBuffer = ''
        activeDockerProcess = null
        if (!event.sender.isDestroyed()) {
          event.sender.send('docker:streamEnd')
        }
      })

      proc.on('error', (err) => {
        activeDockerProcess = null
        resolve({ success: false, error: err.message })
      })

      // Resolve immediately — log lines arrive asynchronously via events
      setTimeout(() => resolve({ success: true }), 100)
    })
  })

  ipcMain.handle('docker:stopStream', async () => {
    stopDockerProcess()
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
