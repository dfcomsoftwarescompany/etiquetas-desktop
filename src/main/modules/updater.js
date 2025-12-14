/**
 * Módulo de atualização automática
 * Gerencia atualizações via GitHub Releases
 */

const { autoUpdater } = require('electron-updater');
const { app, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
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
    this.installerPath = null;
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
      
      // Tentar encontrar o arquivo do instalador
      this.findInstallerPath(info);
      
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

  findInstallerPath(info) {
    // Locais possíveis onde o electron-updater salva os arquivos
    const possiblePaths = [
      path.join(require('os').tmpdir(), `${app.getName()}-updater`, 'pending', `Etiquetas-DFCOM-Setup-${info.version}.exe`),
      path.join(require('os').homedir(), 'AppData', 'Local', `${app.getName()}-updater`, 'pending', `Etiquetas-DFCOM-Setup-${info.version}.exe`),
      path.join(require('os').homedir(), 'AppData', 'Local', 'etiquetas-desktop-updater', 'pending', `Etiquetas-DFCOM-Setup-${info.version}.exe`)
    ];

    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          this.installerPath = filePath;
          log.info('[Updater] Instalador encontrado em:', filePath);
          log.info('[Updater] Tamanho do arquivo:', fs.statSync(filePath).size);
          return;
        }
      } catch (error) {
        log.debug('[Updater] Erro ao verificar caminho:', filePath, error.message);
      }
    }
    
    log.warn('[Updater] Instalador não encontrado nos caminhos esperados');
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

  async installUpdate() {
    log.info('[Updater] installUpdate() chamado');
    log.info('[Updater] updateDownloaded:', this.updateDownloaded);
    log.info('[Updater] updateInfo:', this.updateInfo);
    log.info('[Updater] installerPath:', this.installerPath);
    log.info('[Updater] autoInstallOnAppQuit:', autoUpdater.autoInstallOnAppQuit);
    
    if (!this.updateDownloaded) {
      log.warn('[Updater] Nenhuma atualização baixada para instalar');
      return;
    }

    // Tentar 3 métodos diferentes de instalação
    const success = await this.tryInstallMethod1() || 
                   await this.tryInstallMethod2() || 
                   await this.tryInstallMethod3();

    if (!success) {
      log.error('[Updater] ❌ Todos os métodos de instalação falharam');
      this.sendToWindow('update:error', { 
        message: 'Falha na instalação. Tente reiniciar o aplicativo.' 
      });
    }
  }

  // Método 1: quitAndInstall padrão
  async tryInstallMethod1() {
    log.info('[Updater] 🔄 Tentativa 1: quitAndInstall padrão');
    
    return new Promise((resolve) => {
      try {
        // Garantir que não instale automaticamente ao fechar
        autoUpdater.autoInstallOnAppQuit = false;
        
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          log.info('[Updater] Fechando janela principal...');
          
          this.mainWindow.once('closed', () => {
            log.info('[Updater] Janela fechada, executando quitAndInstall...');
            setTimeout(() => {
              try {
                log.info('[Updater] Executando autoUpdater.quitAndInstall(false, true)');
                autoUpdater.quitAndInstall(false, true);
                resolve(true);
              } catch (error) {
                log.error('[Updater] Método 1 falhou:', error.message);
                resolve(false);
              }
            }, 1000);
          });
          
          this.mainWindow.close();
        } else {
          setTimeout(() => {
            try {
              autoUpdater.quitAndInstall(false, true);
              resolve(true);
            } catch (error) {
              log.error('[Updater] Método 1 falhou:', error.message);
              resolve(false);
            }
          }, 1000);
        }
        
        // Timeout de segurança
        setTimeout(() => resolve(false), 5000);
        
      } catch (error) {
        log.error('[Updater] Método 1 falhou:', error.message);
        resolve(false);
      }
    });
  }

  // Método 2: Executar instalador manualmente com spawn
  async tryInstallMethod2() {
    log.info('[Updater] 🔄 Tentativa 2: Executar instalador manualmente');
    
    if (!this.installerPath || !fs.existsSync(this.installerPath)) {
      log.warn('[Updater] Método 2: Instalador não encontrado');
      return false;
    }

    return new Promise((resolve) => {
      try {
        log.info('[Updater] Executando:', this.installerPath);
        
        // Executar instalador como processo separado
        const installer = spawn(this.installerPath, [], {
          detached: true,
          stdio: 'ignore'
        });

        installer.unref(); // Permitir que o processo pai termine
        
        log.info('[Updater] Instalador iniciado, finalizando aplicativo...');
        
        setTimeout(() => {
          app.quit();
        }, 1000);
        
        resolve(true);
        
      } catch (error) {
        log.error('[Updater] Método 2 falhou:', error.message);
        resolve(false);
      }
    });
  }

  // Método 3: autoInstallOnAppQuit como fallback
  async tryInstallMethod3() {
    log.info('[Updater] 🔄 Tentativa 3: autoInstallOnAppQuit fallback');
    
    try {
      autoUpdater.autoInstallOnAppQuit = true;
      log.info('[Updater] Configurado para instalar ao fechar, finalizando app...');
      
      setTimeout(() => {
        app.quit();
      }, 1000);
      
      return true;
      
    } catch (error) {
      log.error('[Updater] Método 3 falhou:', error.message);
      return false;
    }
  }

  // Método de emergência: abrir instalador com shell
  async openInstallerManually() {
    if (this.installerPath && fs.existsSync(this.installerPath)) {
      log.info('[Updater] 🚨 Abrindo instalador manualmente com shell');
      try {
        await shell.openPath(this.installerPath);
        setTimeout(() => app.quit(), 2000);
        return true;
      } catch (error) {
        log.error('[Updater] Erro ao abrir instalador:', error.message);
      }
    }
    return false;
  }

  isUpdateDownloaded() {
    return this.updateDownloaded;
  }

  getUpdateInfo() {
    return this.updateInfo;
  }

  getInstallerPath() {
    return this.installerPath;
  }
}

module.exports = UpdateManager;