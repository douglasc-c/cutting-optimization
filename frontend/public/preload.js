const { contextBridge, ipcRenderer } = require('electron');
const subscribe = (channel, callback) => {
  const listener = (_event, data) => callback(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('electronAPI', {
  optimizeCutting: (config, jobId) =>
    ipcRenderer.invoke('optimize-cutting', config, jobId),
  cancelOptimization: jobId => ipcRenderer.invoke('cancel-optimization', jobId),
  saveConfig: (config, existingPath) =>
    ipcRenderer.invoke('save-config', config, existingPath),
  loadConfig: requestedPath => ipcRenderer.invoke('load-config', requestedPath),
  saveSvg: svg => ipcRenderer.invoke('save-svg', svg),
  exportResults: (results, format) =>
    ipcRenderer.invoke('export-results', results, format),
  loadWorkspace: () => ipcRenderer.invoke('load-workspace'),
  saveWorkspace: data => ipcRenderer.invoke('save-workspace', data),
  getRecentProjects: () => ipcRenderer.invoke('get-recent-projects'),
  setDocumentState: state => ipcRenderer.invoke('set-document-state', state),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  showExportInFolder: file => ipcRenderer.invoke('show-export-in-folder', file),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  onMenuAction: callback => subscribe('menu-action', callback),
  onOptimizationProgress: callback =>
    subscribe('optimization-progress', callback),
});
