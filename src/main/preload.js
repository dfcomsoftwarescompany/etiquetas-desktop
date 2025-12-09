const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Ponte segura entre renderer e main process
 * Expõe APIs específicas para impressão de etiquetas Argox OS-2140
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== Printer ====================
  printer: {
    /**
     * Lista impressoras disponíveis no sistema
     * @returns {Promise<{success: boolean, printers?: Array, error?: string}>}
     */
    list: () => ipcRenderer.invoke('printer:list'),

    /**
     * Imprime etiqueta completa com QR Code
     * @param {string} printerName - Nome da impressora
     * @param {object} labelData - Dados da etiqueta
     */
    printLabel: (printerName, labelData) => 
      ipcRenderer.invoke('printer:printLabel', { printerName, labelData }),

    /**
     * Imprime etiqueta de teste "Olá Mundo"
     * @param {string} printerName - Nome da impressora
     */
    test: (printerName) => ipcRenderer.invoke('printer:test', { printerName }),

    /**
     * Obtém status de uma impressora
     * @param {string} printerName - Nome da impressora
     */
    status: (printerName) => ipcRenderer.invoke('printer:status', { printerName }),

    /**
     * Obtém configurações da impressora
     */
    getConfig: () => ipcRenderer.invoke('printer:getConfig'),

    /**
     * Atualiza configurações da impressora
     */
    setConfig: (config) => ipcRenderer.invoke('printer:setConfig', config)
  },

  // ==================== QR Code ====================
  qrcode: {
    /**
     * Gera QR Code como Data URL para preview
     * @param {string} data - Dados para o QR Code
     * @param {object} options - Opções (width, margin, etc)
     */
    generate: (data, options) => ipcRenderer.invoke('qrcode:generate', { data, options })
  },

  // ==================== App ====================
  app: {
    /**
     * Obtém a versão atual do aplicativo
     */
    getVersion: () => ipcRenderer.invoke('app:version'),

    /**
     * Obtém informações do sistema
     */
    getSystemInfo: () => ipcRenderer.invoke('app:systemInfo')
  },

  // ==================== Updates ====================
  updates: {
    /**
     * Verifica se há atualizações disponíveis
     */
    check: () => ipcRenderer.invoke('update:check'),

    /**
     * Instala atualização baixada e reinicia o app
     */
    install: () => ipcRenderer.invoke('update:install'),

    /**
     * Listener para quando uma atualização está disponível
     */
    onAvailable: (callback) => {
      ipcRenderer.on('update:available', callback);
    },

    /**
     * Listener para quando a atualização foi baixada
     */
    onDownloaded: (callback) => {
      ipcRenderer.on('update:downloaded', callback);
    }
  }
});
