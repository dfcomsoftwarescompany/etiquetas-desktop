const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Ponte segura entre renderer e main process
 * Expõe APIs específicas sem dar acesso direto ao Node.js
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
     * Imprime comandos PPLA
     * @param {string} printerName - Nome da impressora
     * @param {string} text - Texto/comandos a imprimir
     */
    print: (printerName, text) => ipcRenderer.invoke('printer:print', { printerName, text }),

    /**
     * Imprime etiqueta de teste "Olá Mundo"
     * @param {string} printerName - Nome da impressora
     */
    test: (printerName) => ipcRenderer.invoke('printer:test', { printerName }),

    /**
     * Imprime direto na porta (USB001, COM1, LPT1, etc)
     * @param {string} portName - Nome da porta
     */
    printToPort: (portName) => ipcRenderer.invoke('printer:printToPort', { portName })
  },

  // ==================== App ====================
  app: {
    /**
     * Obtém a versão atual do aplicativo
     */
    getVersion: () => ipcRenderer.invoke('app:version')
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

