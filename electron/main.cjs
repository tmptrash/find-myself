const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      contextIsolation: true
    }
  })

  //
  // A freshly launched window is not always the key window on macOS, and then
  // no key event reaches the page until the player clicks it.
  //
  win.webContents.once('did-finish-load', () => focusWindow(win))
  win.loadFile(path.join(__dirname, '../dist/index.html'))
}

function focusWindow (win) {
  process.platform === 'darwin' && app.focus({ steal: true })
  win.show()
  win.focus()
  win.webContents.focus()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})
