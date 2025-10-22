const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Impressoras
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  
  // Configurações
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  // Templates
  saveTemplate: (template) => ipcRenderer.invoke('save-template', template),
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  deleteTemplate: (templateId) => ipcRenderer.invoke('delete-template', templateId),
  
  // Eventos
  onNewLabel: (callback) => ipcRenderer.on('new-label', callback),
  onOpenTemplate: (callback) => ipcRenderer.on('open-template', callback),
  onShowAbout: (callback) => ipcRenderer.on('show-about', callback),
  
  // Remover listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Impressão
  printLabel: (printData) => ipcRenderer.invoke('print-label', printData),
  generatePreview: (previewData) => ipcRenderer.invoke('generate-preview', previewData)
});