/**
 * Etiquetas DFCOM - Main Process
 * Aplicativo Electron para impressão de etiquetas
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Módulos
const PrinterManager = require('./modules/printer');
const APIClient = require('./modules/api');
const UpdateManager = require('./modules/updater');
const { registerAllHandlers } = require('./ipc');

// Instâncias
let mainWindow;
const printerManager = new PrinterManager();
const apiClient = new APIClient();
let updateManager;

// ==================== Window ====================

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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Inicializar UpdateManager após criar janela
  updateManager = new UpdateManager(mainWindow);
}

// ==================== App Lifecycle ====================

app.whenReady().then(() => {
  // Registrar handlers IPC
  registerAllHandlers({ printerManager, apiClient, updateManager });
  
  // Criar janela
  createWindow();

  // Verificar atualizações (produção)
  if (!process.argv.includes('--dev')) {
    setTimeout(() => {
      updateManager?.checkForUpdates();
      console.log('[App] Verificando atualizações...');
    }, 5000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  console.log('[App] Fechando...');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
