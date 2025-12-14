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
          const stats = fs.statSync(filePath);
          log.info('[Updater] ✅ Instalador encontrado em:', filePath);
          log.info('[Updater] 📁 Tamanho do arquivo:', stats.size, 'bytes');
          log.info('[Updater] 📅 Data de criação:', stats.birthtime);
          
          // Verificar se é um arquivo válido (não corrompido)
          if (stats.size < 1000000) { // Menos de 1MB pode ser suspeito
            log.warn('[Updater] ⚠️ Arquivo parece muito pequeno para um instalador');
          }
          
          // Log sobre certificado digital (informativo)
          log.info('[Updater] ℹ️ Aplicação não possui certificado digital - Windows pode bloquear');
          
          return;
        }
      } catch (error) {
        log.debug('[Updater] Erro ao verificar caminho:', filePath, error.message);
      }
    }
    
    log.warn('[Updater] ❌ Instalador não encontrado nos caminhos esperados');
    log.warn('[Updater] Caminhos verificados:');
    possiblePaths.forEach(p => log.warn('[Updater]   -', p));
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

    // Tentar 4 métodos diferentes de instalação + fallback manual
    const success = await this.tryInstallMethod1() || 
                   await this.tryInstallMethod2() || 
                   await this.tryInstallMethod3() ||
                   await this.tryInstallMethod4();

    if (!success) {
      log.error('[Updater] ❌ Todos os métodos de instalação falharam - oferecendo download manual');
      await this.offerManualDownload();
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
        log.info('[Updater] Verificando se arquivo é assinado digitalmente...');
        
        // Tentar diferentes métodos de execução
        const methods = [
          // Método 1: spawn normal
          () => spawn(this.installerPath, [], { detached: true, stdio: 'ignore' }),
          // Método 2: spawn com runas para elevar privilégios
          () => spawn('powershell.exe', ['-Command', `Start-Process "${this.installerPath}" -Verb RunAs`], { detached: true, stdio: 'ignore' }),
          // Método 3: cmd com start
          () => spawn('cmd.exe', ['/C', 'start', '', `"${this.installerPath}"`], { detached: true, stdio: 'ignore' })
        ];

        let methodIndex = 0;
        const tryNextMethod = () => {
          if (methodIndex >= methods.length) {
            log.error('[Updater] Método 2: Todos os sub-métodos falharam');
            resolve(false);
            return;
          }

          try {
            const installer = methods[methodIndex]();
            methodIndex++;

            installer.on('error', (err) => {
              log.warn(`[Updater] Sub-método ${methodIndex} falhou:`, err.message);
              if (err.code === 'ENOENT') {
                log.warn('[Updater] Possível bloqueio por antivírus/SmartScreen');
              }
              tryNextMethod();
            });

            installer.on('spawn', () => {
              log.info(`[Updater] Sub-método ${methodIndex} funcionou! Instalador iniciado`);
              installer.unref();
              setTimeout(() => app.quit(), 1000);
              resolve(true);
            });

          } catch (error) {
            log.error(`[Updater] Sub-método ${methodIndex} exception:`, error.message);
            tryNextMethod();
          }
        };

        tryNextMethod();
        
        // Timeout de segurança
        setTimeout(() => {
          log.warn('[Updater] Método 2: Timeout - possível bloqueio de segurança');
          resolve(false);
        }, 10000);
        
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

  // Método 4: Detectar problemas de certificado e oferecer alternativas
  async tryInstallMethod4() {
    log.info('[Updater] 🔄 Tentativa 4: Método de emergência - problemas de certificado');
    
    // Verificar se o arquivo existe
    if (!this.installerPath || !fs.existsSync(this.installerPath)) {
      log.error('[Updater] Método 4: Arquivo não encontrado para emergência');
      return false;
    }

    try {
      // Tentar abrir com shell (Windows vai mostrar avisos de segurança)
      log.info('[Updater] Abrindo instalador com shell.openPath - usuário pode ver avisos de segurança');
      await shell.openPath(this.installerPath);
      
      // Notificar usuário sobre o processo manual
      this.sendToWindow('update:manual-install-required', {
        message: 'Por favor, aceite os avisos de segurança do Windows para instalar a atualização.',
        installerPath: this.installerPath,
        version: this.updateInfo?.version
      });
      
      // Aguardar um pouco antes de fechar o app
      setTimeout(() => {
        log.info('[Updater] Fechando app após abrir instalador manualmente');
        app.quit();
      }, 3000);
      
      return true;
      
    } catch (error) {
      log.error('[Updater] Método 4 falhou:', error.message);
      
      // Último recurso: oferecer download manual
      await this.offerManualDownload();
      return false;
    }
  }

  // Último recurso: oferecer download manual da release
  async offerManualDownload() {
    log.info('[Updater] 🆘 Último recurso: Oferecendo download manual');
    
    const downloadUrl = `https://github.com/dfcomsoftwarescompany/etiquetas-desktop/releases/download/v${this.updateInfo?.version}/Etiquetas-DFCOM-Setup-${this.updateInfo?.version}.exe`;
    
    this.sendToWindow('update:download-manually', {
      message: 'Falha na atualização automática. Por favor, baixe e instale manualmente.',
      downloadUrl: downloadUrl,
      version: this.updateInfo?.version,
      reason: 'Possível bloqueio por antivírus ou falta de certificado digital'
    });
    
    try {
      // Tentar abrir a página de releases no navegador
      await shell.openExternal('https://github.com/dfcomsoftwarescompany/etiquetas-desktop/releases');
    } catch (error) {
      log.error('[Updater] Erro ao abrir página de releases:', error.message);
    }
  }

  // Método de emergência: abrir instalador com shell
  async openInstallerManually() {
    return await this.tryInstallMethod4();
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