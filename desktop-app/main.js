const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const http = require('http')
const { spawn } = require('child_process')
const fs = require('fs')

let mainWindow = null
let serverProcess = null
const PORT = 8085

function checkServerReady(port, retries = 20, delayMs = 250) {
  return new Promise((resolve) => {
    let attempts = 0
    const check = () => {
      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true)
        } else {
          retry()
        }
      })
      req.on('error', () => retry())
      req.setTimeout(250, () => {
        req.destroy()
        retry()
      })
    }

    const retry = () => {
      attempts++
      if (attempts >= retries) {
        resolve(false)
      } else {
        setTimeout(check, delayMs)
      }
    }

    check()
  })
}

function startBackendServer() {
  checkServerReady(PORT, 2, 100).then((isReady) => {
    if (isReady) {
      console.log('TweetVault server is already running on port', PORT)
      return
    }

    let binaryPath = path.join(__dirname, 'bin', 'TweetVault-Server.exe')
    if (app.isPackaged) {
      binaryPath = path.join(process.resourcesPath, 'bin', 'TweetVault-Server.exe')
    }

    if (!fs.existsSync(binaryPath)) {
      console.error('Binary not found at:', binaryPath)
      return
    }

    console.log('Spawning TweetVault Go server from:', binaryPath)
    serverProcess = spawn(binaryPath, [], {
      env: {
        ...process.env,
        PORT: String(PORT),
      },
      windowsHide: true,
      stdio: 'ignore',
    })

    serverProcess.on('error', (err) => {
      console.error('Failed to spawn server process:', err)
    })
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0a0d14',
    title: 'TweetVault',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Load local bundled dist/index.html first for instant 0ms launch & no 404s
  const localIndex = path.join(__dirname, 'dist', 'index.html')
  if (fs.existsSync(localIndex)) {
    mainWindow.loadFile(localIndex)
  } else {
    mainWindow.loadURL(`http://localhost:${PORT}`)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  startBackendServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', () => {
  if (serverProcess) {
    try {
      serverProcess.kill()
    } catch (e) {
      console.error('Error killing server process:', e)
    }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
