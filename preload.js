const { contextBridge, ipcRenderer } = require('electron');

// Безопасный мост для renderer -> main
contextBridge.exposeInMainWorld('electronAPI', {
  // Окно
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Файлы
  openFiles: () => ipcRenderer.invoke('open-files'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  getAudioFilesInFolder: (folder) => ipcRenderer.invoke('get-audio-files-in-folder', folder),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  
  // Данные
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  loadData: () => ipcRenderer.invoke('load-data'),
});