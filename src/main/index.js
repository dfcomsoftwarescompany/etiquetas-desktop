const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const PrinterManager = require('./printer');

let mainWindow;
const printerManager = new PrinterManager();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '../../assets/icon.ico'),
    titleBarStyle: 'default',
    show: false
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

// ==================== IPC Handlers ====================

// Listar impressoras disponíveis
ipcMain.handle('printer:list', async () => {
  try {
    const printers = await printerManager.listPrinters();
    return { success: true, printers };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Imprimir texto (PPLA)
ipcMain.handle('printer:print', async (event, { printerName, text }) => {
  try {
    await printerManager.printPPLA(printerName, text);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Teste de impressão "Olá Mundo"
ipcMain.handle('printer:test', async (event, { printerName }) => {
  try {
    await printerManager.printTestLabel(printerName);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Obter versão do app
ipcMain.handle('app:version', () => {
  return app.getVersion();
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

