const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const appConfig = require('./config');

let mainWindow;
const DATA_PATH = path.join(app.getPath('userData'), 'topmusic-data.json');

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

// ===== IPC Handlers =====

// Открыть файлы
ipcMain.handle('open-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите аудиофайлы',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio', extensions: appConfig.supportedFormats }],
  });
  return result.canceled ? [] : result.filePaths;
});

// Открыть папку
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите папку с музыкой',
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// Получить аудиофайлы в папке
ipcMain.handle('get-audio-files-in-folder', async (_, folderPath) => {
  try {
    const files = await fs.readdir(folderPath);
    return files
      .filter(f => {
        const ext = path.extname(f).toLowerCase().slice(1);
        return appConfig.supportedFormats.includes(ext);
      })
      .map(f => path.join(folderPath, f));
  } catch {
    return [];
  }
});

// Проверить существование файла
ipcMain.handle('check-file-exists', async (_, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

// Сохранить данные
ipcMain.handle('save-data', async (_, data) => {
  try {
    // Преобразуем Sets в массивы для JSON
    const serializable = JSON.parse(JSON.stringify(data, (key, value) =>
      value instanceof Set ? Array.from(value) : value
    ));
    await fs.writeFile(DATA_PATH, JSON.stringify(serializable, null, 2));
    return true;
  } catch (e) {
    console.error('Save error:', e);
    return false;
  }
});

// Загрузить данные
ipcMain.handle('load-data', async () => {
  try {
    const content = await fs.readFile(DATA_PATH, 'utf-8');
    const data = JSON.parse(content);
    // Преобразуем массивы обратно в Sets для плейлистов
    if (data.playlists) {
      Object.values(data.playlists).forEach(p => {
        if (p.trackPaths) p.trackPaths = new Set(p.trackPaths);
      });
    }
    return data;
  } catch {
    return null;
  }
});

// Управление окном
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());
ipcMain.handle('window-is-maximized', () => mainWindow.isMaximized());