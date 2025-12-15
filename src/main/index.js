/**
 * Etiquetas DFCOM - Main Process
 * Aplicativo Electron para impressão de etiquetas
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Módulos
const PrinterManager = require('./modules/printer');
const APIClient = require('./modules/api');
const PrintServer = require('./modules/server');
const { registerAllHandlers } = require('./ipc');

// Importar módulo de updates
const { updateElectronApp } = require('update-electron-app');

// Instâncias
let mainWindow;
const printerManager = new PrinterManager();
const apiClient = new APIClient();
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

  // Update Manager oficial do Electron já está ativo
}

// ==================== App Lifecycle ====================

app.whenReady().then(async () => {
  // Criar janela
  createWindow();
  
  // Registrar handlers IPC (sem updateManager - agora é automático)
  registerAllHandlers({ printerManager, apiClient });

  // Inicializar updates após app estar pronto
  updateElectronApp({
    updateInterval: '5 minutes',
    logger: require('electron-log'),
    notifyUser: true
  });

  // Iniciar servidor HTTP
  printServer = new PrintServer(printerManager);
  try {
    await printServer.start();
  } catch (error) {
    console.error('[App] Erro ao iniciar servidor HTTP:', error);
  }

  // Update automático já configurado via update-electron-app

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
