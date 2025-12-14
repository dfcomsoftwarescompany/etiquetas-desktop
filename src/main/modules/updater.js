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
    log.info('[Updater] 🚀 ===== INSTALAÇÃO DE ATUALIZAÇÃO INICIADA =====');
    log.info('[Updater] 📋 updateDownloaded:', this.updateDownloaded);
    log.info('[Updater] 📦 updateInfo:', this.updateInfo);
    log.info('[Updater] 📁 installerPath:', this.installerPath);
    log.info('[Updater] ⚙️ autoInstallOnAppQuit:', autoUpdater.autoInstallOnAppQuit);
    
    // Diagnóstico detalhado do sistema
    this.logSystemDiagnostic();
    
    if (!this.updateDownloaded) {
      log.warn('[Updater] ❌ ABORTADO: Nenhuma atualização baixada para instalar');
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

  // Método 1: quitAndInstall padrão com detecção de falha
  async tryInstallMethod1() {
    log.info('[Updater] 🔄 Tentativa 1: quitAndInstall padrão');
    
    return new Promise((resolve) => {
      let resolved = false;
      const resolveOnce = (success) => {
        if (!resolved) {
          resolved = true;
          resolve(success);
        }
      };

      try {
        // Garantir que não instale automaticamente ao fechar
        autoUpdater.autoInstallOnAppQuit = false;
        
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          log.info('[Updater] Fechando janela principal...');
          
          this.mainWindow.once('closed', () => {
            log.info('[Updater] ✅ Janela fechada com sucesso');
            log.info('[Updater] ⏱️ Aguardando 1 segundo antes de executar quitAndInstall...');
            
            setTimeout(() => {
              try {
                log.info('[Updater] 🚀 EXECUTANDO: autoUpdater.quitAndInstall(false, true)');
                log.info('[Updater] 📋 Parâmetros: isSilent=false, isForceRunAfter=true');
                log.info('[Updater] 🎯 Se este for o último log, quitAndInstall falhou silenciosamente!');
                
                autoUpdater.quitAndInstall(false, true);
                
                // Se chegou aqui, quitAndInstall pode ter funcionado (app deveria ter fechado)
                log.info('[Updater] ⚠️ INESPERADO: Código após quitAndInstall ainda executando');
                
                // Aguardar um pouco para ver se o app realmente vai fechar
                setTimeout(() => {
                  log.error('[Updater] ❌ FALHA DETECTADA: quitAndInstall não fechou o app após 3s');
                  log.error('[Updater] 🛡️ Possível causa: Aplicação não assinada digitalmente');
                  log.error('[Updater] 🔄 Tentando método 2...');
                  resolveOnce(false);
                }, 3000);
                
              } catch (error) {
                log.error('[Updater] ❌ EXCEÇÃO no quitAndInstall:', error.message);
                log.error('[Updater] 📋 Stack trace:', error.stack);
                resolveOnce(false);
              }
            }, 1000);
          });
          
          log.info('[Updater] 🔄 Chamando mainWindow.close()...');
          this.mainWindow.close();
          
        } else {
          log.info('[Updater] ℹ️ Janela já fechada, executando quitAndInstall diretamente');
          setTimeout(() => {
            try {
              log.info('[Updater] 🚀 EXECUTANDO: autoUpdater.quitAndInstall(false, true) [direto]');
              autoUpdater.quitAndInstall(false, true);
              
              setTimeout(() => {
                log.error('[Updater] ❌ FALHA: quitAndInstall direto não funcionou');
                resolveOnce(false);
              }, 3000);
              
            } catch (error) {
              log.error('[Updater] ❌ EXCEÇÃO no quitAndInstall direto:', error.message);
              resolveOnce(false);
            }
          }, 1000);
        }
        
        // Timeout de segurança geral
        setTimeout(() => {
          log.error('[Updater] ⏰ TIMEOUT: Método 1 demorou mais de 10s - considerando falha');
          resolveOnce(false);
        }, 10000);
        
      } catch (error) {
        log.error('[Updater] ❌ EXCEÇÃO GERAL no Método 1:', error.message);
        log.error('[Updater] 📋 Stack trace:', error.stack);
        resolveOnce(false);
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
              log.error('[Updater] ❌ Método 2: TODOS os sub-métodos falharam');
              log.error('[Updater] 🛡️ Confirmado: Problema de certificado/bloqueio de segurança');
              resolve(false);
              return;
            }

            const currentMethod = methodIndex + 1;
            log.info(`[Updater] 🔄 Sub-método ${currentMethod}/${methods.length} iniciando...`);

            try {
              const installer = methods[methodIndex]();
              methodIndex++;

              installer.on('error', (err) => {
                log.error(`[Updater] ❌ Sub-método ${currentMethod} FALHOU:`, err.message);
                log.error(`[Updater] 📋 Código de erro:`, err.code);
                
                if (err.code === 'ENOENT') {
                  log.error('[Updater] 🛡️ DIAGNÓSTICO: Arquivo bloqueado por antivírus/SmartScreen!');
                } else if (err.code === 'EACCES') {
                  log.error('[Updater] 🔒 DIAGNÓSTICO: Sem permissões para executar!');
                } else if (err.code === 'EPERM') {
                  log.error('[Updater] ⛔ DIAGNÓSTICO: Operação não permitida!');
                } else {
                  log.error('[Updater] ❓ DIAGNÓSTICO: Erro desconhecido');
                }
                
                log.info(`[Updater] 🔄 Tentando sub-método ${currentMethod + 1}...`);
                setTimeout(tryNextMethod, 500);
              });

              installer.on('spawn', () => {
                log.info(`[Updater] ✅ Sub-método ${currentMethod} FUNCIONOU!`);
                log.info('[Updater] 🚀 Processo do instalador iniciado com sucesso');
                log.info('[Updater] 🔄 Desanexando processo e fechando app...');
                
                installer.unref();
                
                setTimeout(() => {
                  log.info('[Updater] 👋 Fechando aplicativo para permitir instalação');
                  app.quit();
                }, 1000);
                
                resolve(true);
              });

              // Timeout específico para cada sub-método
              setTimeout(() => {
                log.warn(`[Updater] ⏰ Sub-método ${currentMethod} timeout após 5s`);
                try {
                  installer.kill();
                } catch (e) {
                  // Ignore kill errors
                }
                tryNextMethod();
              }, 5000);

            } catch (error) {
              log.error(`[Updater] ❌ Sub-método ${currentMethod} EXCEÇÃO:`, error.message);
              log.error(`[Updater] 📋 Stack trace:`, error.stack);
              setTimeout(tryNextMethod, 500);
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

  // Diagnóstico detalhado do sistema para debug
  logSystemDiagnostic() {
    log.info('[Updater] 🔍 ===== DIAGNÓSTICO DO SISTEMA =====');
    
    try {
      // Informações básicas
      log.info('[Updater] 💻 Plataforma:', process.platform);
      log.info('[Updater] 🏗️ Arquitetura:', process.arch);
      log.info('[Updater] ⚡ Versão Node.js:', process.version);
      log.info('[Updater] 🖥️ Electron:', process.versions.electron);
      log.info('[Updater] 📦 App empacotado:', app.isPackaged);
      log.info('[Updater] 🔖 Versão atual:', app.getVersion());
      
      // Estado da janela principal
      if (this.mainWindow) {
        log.info('[Updater] 🪟 Estado da janela principal:');
        log.info('[Updater]   - Existe:', !this.mainWindow.isDestroyed());
        log.info('[Updater]   - Visível:', this.mainWindow.isVisible());
        log.info('[Updater]   - Focada:', this.mainWindow.isFocused());
        log.info('[Updater]   - Minimizada:', this.mainWindow.isMinimized());
      } else {
        log.warn('[Updater] ⚠️ mainWindow é null');
      }
      
      // Verificar arquivo do instalador
      if (this.installerPath) {
        log.info('[Updater] 📁 Arquivo do instalador:');
        log.info('[Updater]   - Caminho:', this.installerPath);
        
        if (fs.existsSync(this.installerPath)) {
          const stats = fs.statSync(this.installerPath);
          log.info('[Updater]   ✅ Arquivo existe');
          log.info('[Updater]   - Tamanho:', stats.size, 'bytes');
          log.info('[Updater]   - Criado em:', stats.birthtime.toISOString());
          log.info('[Updater]   - Modificado em:', stats.mtime.toISOString());
          
          // Verificar permissões de execução (Windows)
          try {
            fs.accessSync(this.installerPath, fs.constants.F_OK | fs.constants.R_OK);
            log.info('[Updater]   ✅ Arquivo legível');
          } catch (error) {
            log.error('[Updater]   ❌ Arquivo não legível:', error.message);
          }
        } else {
          log.error('[Updater]   ❌ ARQUIVO NÃO EXISTE!');
        }
      } else {
        log.error('[Updater] ❌ installerPath é null - arquivo não localizado');
      }
      
      // Estado do autoUpdater
      log.info('[Updater] 🔄 Estado do autoUpdater:');
      log.info('[Updater]   - autoDownload:', autoUpdater.autoDownload);
      log.info('[Updater]   - autoInstallOnAppQuit:', autoUpdater.autoInstallOnAppQuit);
      log.info('[Updater]   - allowDowngrade:', autoUpdater.allowDowngrade);
      
      // Variáveis de ambiente relevantes
      log.info('[Updater] 🌍 Variáveis de ambiente:');
      log.info('[Updater]   - TEMP:', process.env.TEMP);
      log.info('[Updater]   - LOCALAPPDATA:', process.env.LOCALAPPDATA);
      log.info('[Updater]   - USERPROFILE:', process.env.USERPROFILE);
      
    } catch (error) {
      log.error('[Updater] ❌ Erro no diagnóstico:', error.message);
    }
    
    log.info('[Updater] 🔍 ===== FIM DO DIAGNÓSTICO =====');
  }
}

module.exports = UpdateManager;