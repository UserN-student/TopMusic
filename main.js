const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const appConfig = require('./config'); // Импорт конфига

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: appConfig.minWindowWidth,
    minHeight: appConfig.minWindowHeight,
    frame: false,
    backgroundColor: '#0a0a0a',
    title: `${appConfig.appName} v${appConfig.version}`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile('index.html');
  
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('open-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите аудиофайлы',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio', extensions: appConfig.supportedFormats },
    ],
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());
ipcMain.handle('window-is-maximized', () => mainWindow.isMaximized());