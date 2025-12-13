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
const PrintServer = require('./modules/server');
const { registerAllHandlers } = require('./ipc');

// Instâncias
let mainWindow;
const printerManager = new PrinterManager();
const apiClient = new APIClient();
let updateManager;
let printServer;

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

app.whenReady().then(async () => {
  // Registrar handlers IPC
  registerAllHandlers({ printerManager, apiClient, updateManager });
  
  // Criar janela
  createWindow();

  // Iniciar servidor HTTP
  printServer = new PrintServer(printerManager);
  try {
    await printServer.start();
  } catch (error) {
    console.error('[App] Erro ao iniciar servidor HTTP:', error);
  }

  // Verificar atualizações (apenas em produção)
  if (app.isPackaged) {
    // Verificação inicial após 5 segundos
    setTimeout(() => {
      updateManager?.checkForUpdates();
    }, 5000);

    // Verificação periódica a cada 4 horas
    setInterval(() => {
      updateManager?.checkForUpdates();
    }, 4 * 60 * 60 * 1000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  // Parar servidor HTTP
  if (printServer) {
    printServer.stop();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
