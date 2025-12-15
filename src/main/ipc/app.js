/**
 * IPC Handlers - App (versão, sistema, QR Code, updates)
 */

const { ipcMain, app } = require('electron');
const os = require('os');
const QRCode = require('qrcode');

function registerAppHandlers() {
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

  // Updates agora são gerenciados automaticamente pelo update-electron-app
}

module.exports = { registerAppHandlers };

