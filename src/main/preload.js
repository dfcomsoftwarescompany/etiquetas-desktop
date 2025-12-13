const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Ponte segura entre renderer e main process
 * Expõe APIs específicas para impressão de etiquetas Argox OS-2140
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== Printer ====================
  printer: {
    list: () => ipcRenderer.invoke('printer:list'),
    printLabel: (printerName, labelData) => 
      ipcRenderer.invoke('printer:printLabel', { printerName, labelData }),
    test: (printerName) => ipcRenderer.invoke('printer:test', { printerName }),
    status: (printerName) => ipcRenderer.invoke('printer:status', { printerName }),
    getConfig: () => ipcRenderer.invoke('printer:getConfig'),
    setConfig: (config) => ipcRenderer.invoke('printer:setConfig', config)
  },

  // ==================== QR Code ====================
  qrcode: {
    generate: (data, options) => ipcRenderer.invoke('qrcode:generate', { data, options })
  },

  // ==================== App ====================
  app: {
    getVersion: () => ipcRenderer.invoke('app:version'),
    getSystemInfo: () => ipcRenderer.invoke('app:systemInfo')
  },

  // ==================== API Externa ====================
  api: {
    setBaseURL: (url) => ipcRenderer.invoke('api:setBaseURL', url),
    setMockMode: (enabled) => ipcRenderer.invoke('api:setMockMode', enabled),
    buscarProdutos: (filters) => ipcRenderer.invoke('api:buscarProdutos', filters),
    buscarProdutoPorCodigo: (codigo) => ipcRenderer.invoke('api:buscarProdutoPorCodigo', codigo),
    buscarProdutoPorNome: (termo) => ipcRenderer.invoke('api:buscarProdutoPorNome', termo),
    testarConexao: () => ipcRenderer.invoke('api:testarConexao'),
    registrarImpressao: (labelData) => ipcRenderer.invoke('api:registrarImpressao', labelData)
  },

  // ==================== Updates ====================
  updates: {
    check: () => ipcRenderer.invoke('update:check'),
    install: () => ipcRenderer.invoke('update:install'),
    
    // Listeners para eventos de atualização
    onChecking: (callback) => {
      ipcRenderer.on('update:checking', (event, data) => callback(data));
    },
    onAvailable: (callback) => {
      ipcRenderer.on('update:available', (event, data) => callback(data));
    },
    onNotAvailable: (callback) => {
      ipcRenderer.on('update:not-available', (event, data) => callback(data));
    },
    onProgress: (callback) => {
      ipcRenderer.on('update:progress', (event, data) => callback(data));
    },
    onDownloaded: (callback) => {
      ipcRenderer.on('update:downloaded', (event, data) => callback(data));
    },
    onError: (callback) => {
      ipcRenderer.on('update:error', (event, data) => callback(data));
    }
  }
});
