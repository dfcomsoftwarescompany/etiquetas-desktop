/**
 * IPC Handlers - App (versão, sistema, QR Code, updates)
 */

const { ipcMain, app } = require('electron');
const os = require('os');
const QRCode = require('qrcode');

function registerAppHandlers(updateManager) {
  // Versão do app
  ipcMain.handle('app:version', () => app.getVersion());

  // Informações do sistema
  ipcMain.handle('app:systemInfo', () => ({
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron
  }));

  // Gerar QR Code
  ipcMain.handle('qrcode:generate', async (event, { data, options = {} }) => {
    try {
      const qrOptions = {
        width: options.width || 150,
        margin: options.margin || 1,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      };
      const dataUrl = await QRCode.toDataURL(data || 'DFCOM', qrOptions);
      return { success: true, dataUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Updates
  ipcMain.handle('update:check', async () => {
    try {
      const result = await updateManager?.checkForUpdates();
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update:install', async () => {
    console.log('[IPC] update:install chamado');
    if (updateManager) {
      try {
        await updateManager.installUpdate();
        return { success: true };
      } catch (error) {
        console.error('[IPC] Erro na instalação:', error);
        return { success: false, error: error.message };
      }
    } else {
      console.error('[IPC] updateManager não disponível');
      return { success: false, error: 'UpdateManager não inicializado' };
    }
  });
}

module.exports = { registerAppHandlers };

