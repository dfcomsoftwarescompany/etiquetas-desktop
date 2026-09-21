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
const {
  buildPersistedSettings,
  resolveConfigFromPersisted,
} = require('./modules/printer-settings');
const { getRuntimeConfig } = require('./modules/runtime-config');
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
    const config = resolveConfigFromPersisted(saved);

    if (Object.keys(config).length > 0) {
      printerManager.setConfig(config);
    }
  } catch {
    // Arquivo inexistente ou inválido — usa default
  }
}

function persistPrinterSettings(config) {
  try {
    fs.writeFileSync(
      getPrinterSettingsPath(),
      JSON.stringify(buildPersistedSettings(config), null, 2),
      { mode: 0o600 }
    );
  } catch (error) {
    log.error('[App] Erro ao persistir printer-settings:', error);
  }
}

function syncWebSocketWithPrintingConfig() {
  if (!printerWsClient) return;

  if (printerManager.isAnyPrintingEnabled()) {
    log.info('[App] Ao menos um tipo de impressão habilitado — WebSocket conectado');
    printerWsClient.start();
    return;
  }

  log.info('[App] Etiqueta e cupom desabilitados — desconectando WebSocket');
  printerWsClient.stop();
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
      const flagsChanged =
        prev.labelPrintingEnabled !== next.labelPrintingEnabled ||
        prev.couponPrintingEnabled !== next.couponPrintingEnabled ||
        prev.printingEnabled !== next.printingEnabled;

      const printersChanged =
        prev.defaultPrinter !== next.defaultPrinter ||
        prev.couponPrinter !== next.couponPrinter;

      const tenantChanged = prev.tenant_name !== next.tenant_name;

      if (flagsChanged || printersChanged || tenantChanged) {
        persistPrinterSettings(next);
      }

      if (flagsChanged || tenantChanged) {
        syncWebSocketWithPrintingConfig();
      }
    }
  });

  // ==================== Auto-Updater Configuração ====================
  
  // Configurar logging
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  
  // Configurações do auto-updater
  autoUpdater.autoDownload = false; // Não baixar automaticamente
  autoUpdater.autoInstallOnAppQuit = true; // Instalar ao fechar app

  // Builds TEST/BETA só atualizam dentro do próprio canal (env-test / env-beta)
  const runtimeConfig = getRuntimeConfig();
  log.info(`[App] Canal: ${runtimeConfig.channel} | socket: ${runtimeConfig.printerWsUrl}`);

  if (runtimeConfig.allowPrerelease) {
    autoUpdater.channel = runtimeConfig.updateChannel;
    autoUpdater.allowPrerelease = true;
  }
  
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
    if (!printerManager.isAnyPrintingEnabled()) {
      log.info('[App] Token atualizado, mas nenhum tipo de impressão está habilitado — WS permanece desconectado');
      return;
    }
    printerWsClient.reconnect();
  };
  printServer.onTenantUpdated = (tenant_name) => {
    log.info(`[App] tenant_name atualizado: ${tenant_name}`);
    persistPrinterSettings(printerManager.getConfig());
    if (!printerManager.isAnyPrintingEnabled()) {
      log.info('[App] Tenant salvo, mas nenhum tipo de impressão está habilitado — WS permanece desconectado');
      return;
    }
    printerWsClient.reconnect();
  };

  syncWebSocketWithPrintingConfig();

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
