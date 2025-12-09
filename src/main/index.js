const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { autoUpdater } = require('electron-updater');
const QRCode = require('qrcode');
const PrinterManager = require('./printer');

let mainWindow;
const printerManager = new PrinterManager();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 900,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '../../assets/icon.ico'),
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#0a0a0b'
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Mostra a janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // DevTools em modo dev
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// ==================== IPC Handlers - Printer ====================

// Listar impressoras disponíveis
ipcMain.handle('printer:list', async () => {
  try {
    console.log('[Main] Iniciando listagem de impressoras...');
    
    const printers = await printerManager.listPrinters();
    
    console.log(`[Main] Total de impressoras: ${printers ? printers.length : 0}`);
    return { success: true, printers: printers || [] };
  } catch (error) {
    console.error('[Main] Erro ao listar impressoras:', error.message);
    return { success: false, error: error.message };
  }
});

// Imprimir etiqueta completa com QR Code
ipcMain.handle('printer:printLabel', async (event, { printerName, labelData }) => {
  try {
    console.log('[Main] Imprimindo etiqueta:', labelData);
    await printerManager.printLabel(printerName, labelData);
    return { success: true };
  } catch (error) {
    console.error('[Main] Erro ao imprimir etiqueta:', error.message);
    return { success: false, error: error.message };
  }
});

// Teste de impressão "Olá Mundo"
ipcMain.handle('printer:test', async (event, { printerName }) => {
  try {
    console.log('[Main] Imprimindo teste em:', printerName);
    await printerManager.printTestLabel(printerName);
    return { success: true };
  } catch (error) {
    console.error('[Main] Erro ao imprimir teste:', error.message);
    return { success: false, error: error.message };
  }
});

// Status da impressora
ipcMain.handle('printer:status', async (event, { printerName }) => {
  try {
    const status = printerManager.getPrinterStatus(printerName);
    return { success: true, status };
  } catch (error) {
    console.error('[Main] Erro ao obter status:', error.message);
    return { success: false, error: error.message };
  }
});

// Obter configurações
ipcMain.handle('printer:getConfig', () => {
  return printerManager.getConfig();
});

// Atualizar configurações
ipcMain.handle('printer:setConfig', (event, config) => {
  printerManager.setConfig(config);
  return printerManager.getConfig();
});

// ==================== IPC Handlers - QR Code ====================

// Gera QR Code como Data URL para preview
ipcMain.handle('qrcode:generate', async (event, { data, options = {} }) => {
  try {
    const qrOptions = {
      width: options.width || 150,
      margin: options.margin || 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    };

    const dataUrl = await QRCode.toDataURL(data || 'DFCOM', qrOptions);
    return { success: true, dataUrl };
  } catch (error) {
    console.error('[Main] Erro ao gerar QR Code:', error.message);
    return { success: false, error: error.message };
  }
});

// ==================== IPC Handlers - App ====================

// Obter versão do app
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

// Obter informações do sistema
ipcMain.handle('app:systemInfo', () => {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron
  };
});

// ==================== Auto Updater ====================

autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('update:available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update:downloaded');
});

ipcMain.handle('update:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall();
});

// ==================== App Lifecycle ====================

app.whenReady().then(() => {
  createWindow();

  // Verifica atualizações após iniciar (apenas em produção)
  if (!process.argv.includes('--dev')) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
