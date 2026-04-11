const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
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

// === НОВОЕ: Открыть папку с выделенным файлом ===
ipcMain.handle('open-folder-with-file', async (_, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return true;
  } catch (e) {
    console.error('Show item error:', e);
    return false;
  }
});

// Сохранить данные
ipcMain.handle('save-data', async (_, data) => {
  try {
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

// Чтение метаданных аудио (ID3)
ipcMain.handle('get-audio-metadata', async (_, filePath) => {
  try {
    const data = await fs.readFile(filePath);
    return parseID3(data);
  } catch {
    return null;
  }
});

function parseID3(buffer) {
  try {
    if (buffer[0] !== 0x49 || buffer[1] !== 0x44 || buffer[2] !== 0x33) return null;
    const size = ((buffer[6] & 0x7f) << 21) | ((buffer[7] & 0x7f) << 14) | ((buffer[8] & 0x7f) << 7) | (buffer[9] & 0x7f);
    let offset = 10;
    const result = {};
    while (offset < size + 10 && offset + 10 < buffer.length) {
      const frameId = buffer.slice(offset, offset + 4).toString('ascii');
      if (!frameId.trim() || frameId[0] < 'A' || frameId[0] > 'Z') break;
      const frameSize = buffer.readUInt32BE(offset + 4);
      if (frameSize <= 0 || offset + 10 + frameSize > buffer.length) break;
      offset += 10;
      const frameData = buffer.slice(offset, offset + frameSize);
      if (frameId === 'TIT2') result.title = frameData.slice(1).toString('utf8').replace(/\0/g, '').trim();
      if (frameId === 'TPE1') result.artist = frameData.slice(1).toString('utf8').replace(/\0/g, '').trim();
      if (frameId === 'TALB') result.album = frameData.slice(1).toString('utf8').replace(/\0/g, '').trim();
      if (frameId === 'APIC') {
        try {
          let i = 1;
          // Read MIME type
          let mimeEnd = i;
          while (mimeEnd < frameData.length && frameData[mimeEnd] !== 0) mimeEnd++;
          const mimeType = frameData.slice(i, mimeEnd).toString('ascii').toLowerCase() || 'image/jpeg';
          i = mimeEnd + 1; // skip mime null
          i++; // skip picture type
          while (i < frameData.length && frameData[i] !== 0) i++;
          i++; // skip description null
          const imgData = frameData.slice(i);
          if (imgData.length > 0) {
            const mime = mimeType.includes('png') ? 'image/png' : mimeType.includes('gif') ? 'image/gif' : 'image/jpeg';
            result.cover = `data:${mime};base64,` + imgData.toString('base64');
          }
        } catch {}
      }
      offset += frameSize;
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch { return null; }
}