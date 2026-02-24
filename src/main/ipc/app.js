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
      const dataUrl = await QRCode.toDataURL(data || 'LOOPII', qrOptions);
      return { success: true, dataUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Updates agora são gerenciados automaticamente pelo update-electron-app

  // Obter IP local da máquina
  ipcMain.handle('app:getLocalIP', () => {
    try {
      const interfaces = os.networkInterfaces();
      let localIP = 'localhost';
      
      // Procurar por um IP IPv4 não-localhost
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          // Pular interfaces internas e IPv6
          if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
            break;
          }
        }
        if (localIP !== 'localhost') break;
      }
      
      return { 
        success: true, 
        ip: localIP,
        hostname: os.hostname(),
        port: 8547
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        ip: 'localhost',
        port: 8547
      };
    }
  });
}

module.exports = { registerAppHandlers };

