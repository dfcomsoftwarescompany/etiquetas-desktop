import { contextBridge, ipcRenderer } from 'electron';

// Definir tipos para o API exposta
export interface ElectronAPI {
  // Impressoras
  getPrinters: () => Promise<Electron.PrinterInfo[]>;
  
  // Configurações
  saveSettings: (settings: any) => Promise<{ success: boolean }>;
  getSettings: () => Promise<any>;
  
  // Templates
  saveTemplate: (template: any) => Promise<{ success: boolean; id: string }>;
  getTemplates: () => Promise<any[]>;
  deleteTemplate: (templateId: string) => Promise<{ success: boolean }>;
  
  // Eventos
  onNewLabel: (callback: () => void) => void;
  onOpenTemplate: (callback: () => void) => void;
  onShowAbout: (callback: () => void) => void;
  
  // Remover listeners
  removeAllListeners: (channel: string) => void;
}

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
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
} as ElectronAPI);
