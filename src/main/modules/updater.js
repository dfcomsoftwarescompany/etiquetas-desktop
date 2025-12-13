/**
 * Módulo de atualização automática
 * Gerencia atualizações via GitHub Releases
 */

const { autoUpdater } = require('electron-updater');
const { app } = require('electron');
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
    this.updateInfo = null;
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
    // NÃO instalar automaticamente ao sair - vamos controlar manualmente
    autoUpdater.autoInstallOnAppQuit = false;
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
      this.updateInfo = info;
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
    log.info('[Updater] installUpdate() chamado');
    log.info('[Updater] updateDownloaded:', this.updateDownloaded);
    log.info('[Updater] updateInfo:', this.updateInfo);
    
    if (this.updateDownloaded) {
      log.info('[Updater] Preparando para instalar atualização...');
      log.info('[Updater] Versão a instalar:', this.updateInfo?.version);
      
      // Fechar a janela principal primeiro
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        log.info('[Updater] Fechando janela principal...');
        this.mainWindow.close();
      }
      
      // Aguardar um pouco para garantir que tudo fechou
      setTimeout(() => {
        log.info('[Updater] Executando quitAndInstall...');
        log.info('[Updater] Parâmetros: isSilent=false, isForceRunAfter=true');
        try {
          // isSilent = false (mostrar instalador)
          // isForceRunAfter = true (reiniciar app após instalar)
          autoUpdater.quitAndInstall(false, true);
        } catch (error) {
          log.error('[Updater] Erro ao executar quitAndInstall:', error);
        }
      }, 1000);
      
    } else {
      log.warn('[Updater] Nenhuma atualização baixada para instalar');
      log.warn('[Updater] Estado atual:', {
        updateDownloaded: this.updateDownloaded,
        updateInfo: this.updateInfo
      });
    }
  }

  // Método alternativo: instalar ao fechar o app
  installOnQuit() {
    if (this.updateDownloaded) {
      log.info('[Updater] Configurando instalação ao fechar...');
      autoUpdater.autoInstallOnAppQuit = true;
      app.quit();
    }
  }

  isUpdateDownloaded() {
    return this.updateDownloaded;
  }

  getUpdateInfo() {
    return this.updateInfo;
  }
}

module.exports = UpdateManager;
