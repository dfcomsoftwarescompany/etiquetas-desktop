/**
 * Módulo de atualização automática
 * Gerencia atualizações silenciosas via GitHub Releases
 */

const { autoUpdater } = require('electron-updater');

class UpdateManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.setupListeners();
  }

  setupListeners() {
    // Configuração silenciosa
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
      console.log('[Updater] Disponível:', info.version);
    });

    autoUpdater.on('download-progress', (progress) => {
      console.log(`[Updater] Progresso: ${Math.round(progress.percent)}%`);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[Updater] Baixado:', info.version);
    });

    autoUpdater.on('error', (err) => {
      console.error('[Updater] Erro:', err.message);
    });
  }

  async checkForUpdates() {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('[Updater] Erro ao verificar:', error.message);
      return null;
    }
  }

  installUpdate() {
    autoUpdater.quitAndInstall();
  }
}

module.exports = UpdateManager;

