/**
 * Etiquetas LOOPII - Main Process
 * Aplicativo Electron para impressão de etiquetas
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Módulos
const PrinterManager = require('./modules/printer');
const APIClient = require('./modules/api');
const PrintServer = require('./modules/server');
const PrinterWsClient = require('./modules/ws-client');
const { registerAllHandlers } = require('./ipc');

// Importar módulo de updates - Usando electron-updater diretamente
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Instâncias
let mainWindow;
const printerManager = new PrinterManager();
const apiClient = new APIClient();
let printServer;
let printerWsClient;

function getPrinterSettingsPath() {
  return path.join(app.getPath('userData'), 'printer-settings.json');
}

function loadPersistedPrinterSettings() {
  try {
    const raw = fs.readFileSync(getPrinterSettingsPath(), 'utf8');
    const saved = JSON.parse(raw);
    if (typeof saved.printingEnabled === 'boolean') {
      printerManager.setConfig({ printingEnabled: saved.printingEnabled });
    }
  } catch {
    // Arquivo inexistente ou inválido — usa default
  }
}

function persistPrinterSettings(config) {
  try {
    fs.writeFileSync(
      getPrinterSettingsPath(),
      JSON.stringify({ printingEnabled: config.printingEnabled !== false }, null, 2),
      { mode: 0o600 }
    );
  } catch (error) {
    log.error('[App] Erro ao persistir printer-settings:', error);
  }
}

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
  loadPersistedPrinterSettings();

  // Criar janela
  createWindow();
  
  // Registrar handlers IPC (sem updateManager - agora é automático)
  registerAllHandlers({
    printerManager,
    apiClient,
    onPrinterConfigChange: (prev, next) => {
      if (prev.printingEnabled !== next.printingEnabled) {
        persistPrinterSettings(next);
      }

      if (!printerWsClient) return;
      if (prev.printingEnabled === next.printingEnabled) return;

      if (next.printingEnabled === false) {
        log.info('[App] Impressão desabilitada — desconectando WebSocket');
        printerWsClient.stop();
        return;
      }

      log.info('[App] Impressão habilitada — reconectando WebSocket');
      printerWsClient.start();
    }
  });

  // ==================== Auto-Updater Configuração ====================
  
  // Configurar logging
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  
  // Configurações do auto-updater
  autoUpdater.autoDownload = false; // Não baixar automaticamente
  autoUpdater.autoInstallOnAppQuit = true; // Instalar ao fechar app
  
  // ==================== Eventos do Auto-Updater ====================
  
  autoUpdater.on('checking-for-update', () => {
    log.info('🔍 Verificando atualizações...');
  });
  
  autoUpdater.on('update-available', (info) => {
    log.info('✅ Atualização disponível:', info.version);
    // Aqui você pode mostrar notificação para o usuário
    autoUpdater.downloadUpdate(); // Baixar após confirmar
  });
  
  autoUpdater.on('update-not-available', (info) => {
    log.info('ℹ️ Aplicativo está atualizado:', info.version);
  });
  
  autoUpdater.on('error', (err) => {
    log.error('❌ Erro no auto-updater:', err);
  });
  
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    log.info(`📥 Download: ${percent}%`);
    // Aqui você pode atualizar uma barra de progresso
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    log.info('✅ Update baixado, versão:', info.version);
    
    // Notificar o usuário e instalar automaticamente em 5 segundos
    const { dialog } = require('electron');
    
    const dialogOpts = {
      type: 'info',
      buttons: ['Instalar Agora', 'Mais Tarde'],
      title: 'Atualização Disponível',
      message: `Versão ${info.version} está pronta para instalar`,
      detail: 'A aplicação será reiniciada para aplicar a atualização.',
      defaultId: 0,
      cancelId: 1
    };
    
    dialog.showMessageBox(mainWindow, dialogOpts).then((result) => {
      if (result.response === 0) {
        // Força o fechamento de TODOS os processos antes de atualizar
        setImmediate(() => {
          app.removeAllListeners('window-all-closed');
          if (mainWindow) mainWindow.close();
          autoUpdater.quitAndInstall(false, true);
        });
      }
    });
  });
  
  // ==================== Inicializar Auto-Updater ====================
  
  // Só verificar updates em produção (não em desenvolvimento)
  if (app.isPackaged) {
    try {
      // Verificar na inicialização
      autoUpdater.checkForUpdatesAndNotify();
      
      // Verificar periodicamente (1 hora em produção)
      setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, 60 * 60 * 1000); // 1 hora
      
    } catch (error) {
      log.error('Erro ao inicializar auto-updater:', error);
    }
  } else {
    log.info('Desenvolvimento: Auto-updater desabilitado');
  }

  // Iniciar servidor HTTP
  printServer = new PrintServer(printerManager);
  try {
    await printServer.start();
  } catch (error) {
    console.error('[App] Erro ao iniciar servidor HTTP:', error);
  }

  printerWsClient = new PrinterWsClient(printServer);
  printServer.onTokenUpdated = () => {
    if (printerManager.getConfig().printingEnabled === false) {
      log.info('[App] Token atualizado, mas impressão está desabilitada — WS permanece desconectado');
      return;
    }
    printerWsClient.reconnect();
  };

  if (printerManager.getConfig().printingEnabled === false) {
    log.info('[App] Impressão desabilitada — WebSocket não será iniciado');
  } else {
    printerWsClient.start();
  }

  // Update automático já configurado via update-electron-app

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  if (printerWsClient) {
    printerWsClient.stop();
  }

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
