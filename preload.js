const { contextBridge, ipcRenderer } = require('electron');

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    readRaport: () => ipcRenderer.invoke('read-raport'),
    writeRaport: (data) => ipcRenderer.invoke('write-raport', data),
    openFolderInExplorer: (data) => ipcRenderer.invoke('open-explorer', data),
    readDir: (path) => ipcRenderer.invoke('readDir', path),
    getItemStats: (data) => ipcRenderer.invoke('getItemStats', data),
    getStats: (path) => ipcRenderer.invoke('getStats', path),
    calculateDirSizes: (data) => ipcRenderer.invoke('calculateDirSizes', data)
});
