/**
 * Módulo de atualização automática
 * Gerencia atualizações via GitHub Releases
 */

const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// ============================================================
// TOKEN PARA REPOSITÓRIO PRIVADO
// ============================================================
const GITHUB_TOKEN = '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';
// ============================================================

class UpdateManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.updateDownloaded = false;
    this.setupLogger();
    this.setupUpdater();
    this.setupListeners();
    log.info('[Updater] Módulo inicializado');
  }

  setupLogger() {
    log.transports.file.level = 'debug';
    autoUpdater.logger = log;
  }

  setupUpdater() {
    // Baixar automaticamente quando encontrar atualização
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;

    // Configurar autenticação para repositório privado
    if (GITHUB_TOKEN) {
      log.info('[Updater] Usando token para repositório privado');
      autoUpdater.requestHeaders = {
        'Authorization': `token ${GITHUB_TOKEN}`
      };
      
      // Configurar URL do feed para repositório privado
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'dfcomsoftwarescompany',
        repo: 'etiquetas-desktop',
        private: true,
        token: GITHUB_TOKEN
      });
    }
  }

  setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      log.info('[Updater] Verificando atualizações...');
      this.sendToWindow('update:checking');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('[Updater] ✅ Atualização disponível:', info.version);
      this.sendToWindow('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info('[Updater] Nenhuma atualização disponível. Versão atual:', info.version);
      this.sendToWindow('update:not-available', info);
    });

    autoUpdater.on('download-progress', (progress) => {
      const percent = Math.round(progress.percent);
      log.info(`[Updater] Download: ${percent}%`);
      this.sendToWindow('update:progress', {
        percent,
        transferred: progress.transferred,
        total: progress.total,
        speed: progress.bytesPerSecond
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('[Updater] ✅ Atualização baixada:', info.version);
      this.updateDownloaded = true;
      this.sendToWindow('update:downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes
      });
    });

    autoUpdater.on('error', (err) => {
      log.error('[Updater] ❌ Erro:', err.message);
      log.error('[Updater] Stack:', err.stack);
      this.sendToWindow('update:error', {
        message: err.message
      });
    });
  }

  sendToWindow(channel, data = {}) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      log.info(`[Updater] Enviando evento: ${channel}`, data);
      this.mainWindow.webContents.send(channel, data);
    }
  }

  async checkForUpdates() {
    try {
      log.info('[Updater] Iniciando verificação de atualizações...');
      const result = await autoUpdater.checkForUpdatesAndNotify();
      log.info('[Updater] Resultado da verificação:', result);
      return result;
    } catch (error) {
      log.error('[Updater] Erro ao verificar:', error.message);
      return null;
    }
  }

  downloadUpdate() {
    log.info('[Updater] Iniciando download manual');
    return autoUpdater.downloadUpdate();
  }

  installUpdate() {
    if (this.updateDownloaded) {
      log.info('[Updater] Instalando atualização e reiniciando...');
      autoUpdater.quitAndInstall(false, true);
    } else {
      log.warn('[Updater] Nenhuma atualização baixada para instalar');
    }
  }

  isUpdateDownloaded() {
    return this.updateDownloaded;
  }
}

module.exports = UpdateManager;
