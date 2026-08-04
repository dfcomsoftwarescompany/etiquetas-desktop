/**
 * IPC Handlers - Impressora
 */

const { ipcMain } = require('electron');

function registerPrinterHandlers(printerManager, { onConfigChange } = {}) {
  ipcMain.handle('printer:list', async () => {
    try {
      const printers = await printerManager.listPrinters();
      return { success: true, printers: printers || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('printer:printLabel', async (event, { printerName, labelData }) => {
    try {
      await printerManager.printLabel(printerName, labelData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('printer:test', async (event, { printerName }) => {
    try {
      await printerManager.printTestLabel(printerName);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('printer:status', async (event, { printerName }) => {
    try {
      const status = printerManager.getPrinterStatus(printerName);
      return { success: true, status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('printer:getConfig', () => printerManager.getConfig());
  
  ipcMain.handle('printer:setConfig', (event, config) => {
    const prev = printerManager.getConfig();
    printerManager.setConfig(config);
    const next = printerManager.getConfig();

    if (typeof onConfigChange === 'function') {
      onConfigChange(prev, next);
    }

    return next;
  });
}

module.exports = { registerPrinterHandlers };

