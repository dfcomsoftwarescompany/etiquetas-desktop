/**
 * Módulo de atualização automática
 * Gerencia atualizações via GitHub Releases com melhores práticas
 */

const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

class UpdateManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.setupLogger();
    this.setupUpdater();
    this.setupListeners();
  }

  setupLogger() {
    // Configurar logs (salvos em %APPDATA%/etiquetas-desktop/logs/)
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    log.info('[Updater] Inicializado');
  }

  setupUpdater() {
    // MELHOR PRÁTICA: Download manual (usuário escolhe)
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    // Permitir downgrade para testes (desabilitar em produção final)
    autoUpdater.allowDowngrade = false;
  }

  setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      log.info('[Updater] Verificando atualizações...');
      this.sendToWindow('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('[Updater] Atualização disponível:', info.version);
      this.sendToWindow('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
      
      // Iniciar download automaticamente
      // (pode mudar para perguntar ao usuário depois)
      autoUpdater.downloadUpdate();
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info('[Updater] Nenhuma atualização disponível');
      this.sendToWindow('update-not-available', info);
    });

    autoUpdater.on('download-progress', (progress) => {
      const percent = Math.round(progress.percent);
      log.info(`[Updater] Progresso: ${percent}%`);
      this.sendToWindow('update-download-progress', {
        percent,
        transferred: progress.transferred,
        total: progress.total,
        speed: progress.bytesPerSecond
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('[Updater] Atualização baixada:', info.version);
      this.sendToWindow('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes
      });
    });

    autoUpdater.on('error', (err) => {
      log.error('[Updater] Erro:', err);
      this.sendToWindow('update-error', {
        message: err.message,
        stack: err.stack
      });
    });
  }

  sendToWindow(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  async checkForUpdates() {
    try {
      log.info('[Updater] Iniciando verificação manual');
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('[Updater] Erro ao verificar:', error);
      return null;
    }
  }

  downloadUpdate() {
    log.info('[Updater] Iniciando download');
    return autoUpdater.downloadUpdate();
  }

  installUpdate() {
    log.info('[Updater] Instalando e reiniciando...');
    // false = não forçar fechar, true = reiniciar após instalar
    autoUpdater.quitAndInstall(false, true);
  }
}

module.exports = UpdateManager;

