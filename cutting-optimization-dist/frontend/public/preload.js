const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Otimização de corte
  optimizeCutting: (config) => ipcRenderer.invoke('optimize-cutting', config),
  
  // Gerenciamento de arquivos
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  exportResults: (results) => ipcRenderer.invoke('export-results', results),
  
  // Informações da aplicação
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  
  // Eventos
  onOptimizationProgress: (callback) => {
    ipcRenderer.on('optimization-progress', callback);
  },
  
  onOptimizationComplete: (callback) => {
    ipcRenderer.on('optimization-complete', callback);
  },
  
  onError: (callback) => {
    ipcRenderer.on('error', callback);
  }
});

