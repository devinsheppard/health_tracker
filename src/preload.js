const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('healthApi', {
  getAll: () => ipcRenderer.invoke('data:getAll'),
  saveProfile: (profile) => ipcRenderer.invoke('data:saveProfile', profile),
  saveSettings: (settings) => ipcRenderer.invoke('data:settings', settings),
  add: (table, row) => ipcRenderer.invoke('data:add', table, row),
  update: (table, id, row) => ipcRenderer.invoke('data:update', table, id, row),
  delete: (table, id) => ipcRenderer.invoke('data:delete', table, id),
  clearAll: () => ipcRenderer.invoke('data:clearAll'),
  backup: () => ipcRenderer.invoke('db:backup'),
  restore: () => ipcRenderer.invoke('db:restore'),
  exportJson: (payload) => ipcRenderer.invoke('app:exportJson', payload),
  exportFullJson: () => ipcRenderer.invoke('app:exportFullJson'),
  importFullJson: () => ipcRenderer.invoke('app:importFullJson')
});
