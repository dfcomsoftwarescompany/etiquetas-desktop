/**
 * Etiquetas DFCOM - Servidor HTTP
 * Interface para monitorar fila de impressão
 */

// ==================== Helpers ====================

const UI = {
  showToast(container, message, type = 'info') {
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
  }
};

// ==================== App ====================

class ServerApp {
  constructor() {
    this.init();
  }

  async init() {
    this.getElements();
    this.bindEvents();
    await this.loadVersion();
    await this.loadPrinters();
    await this.checkTokenStatus();
    this.startPolling();
  }

  getElements() {
    this.el = {
      printerSelect: document.getElementById('printer-select'),
      btnRefresh: document.getElementById('btn-refresh'),
      btnConfig: document.getElementById('btn-config'),
      printerName: document.getElementById('printer-name'),
      printerStatusBadge: document.getElementById('printer-status-badge'),
      serverStatusBadge: document.getElementById('server-status-badge'),
      tokenStatus: document.getElementById('token-status'),
      appVersion: document.getElementById('app-version'),
      toastContainer: document.getElementById('toast-container'),
      configModal: document.getElementById('config-modal'),
      btnConfigClose: document.getElementById('btn-config-close'),
      btnConfigCancel: document.getElementById('btn-config-cancel'),
      configToken: document.getElementById('config-token'),
      btnGenerateToken: document.getElementById('btn-generate-token'),
      btnCopyToken: document.getElementById('btn-copy-token'),
      tokenStatusBadge: document.getElementById('token-status-badge')
    };
  }

  bindEvents() {
    console.log('[App] Vinculando eventos...');
    this.el.btnRefresh.addEventListener('click', () => this.loadPrinters());
    this.el.printerSelect.addEventListener('change', (e) => this.selectPrinter(e.target.value));
    this.el.btnConfig.addEventListener('click', () => {
      console.log('[App] Botão config clicado');
      this.openConfigModal();
    });
    this.el.btnConfigClose.addEventListener('click', () => this.closeConfigModal());
    this.el.btnConfigCancel.addEventListener('click', () => this.closeConfigModal());
    this.el.configModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeConfigModal());
    this.el.btnGenerateToken.addEventListener('click', () => {
      console.log('[App] Botão gerar token clicado');
      this.generateToken();
    });
    this.el.btnCopyToken.addEventListener('click', () => this.copyToken());
    this.el.btnClearQueue.addEventListener('click', () => this.clearQueue());
    console.log('[App] Eventos vinculados com sucesso');
  }

  async loadVersion() {
    const version = await window.electronAPI.app.getVersion();
    this.el.appVersion.textContent = `v${version}`;
  }

  async   async loadPrinters() {
    try {
      console.log('[App] Carregando impressoras...');
      this.el.printerName.textContent = 'Carregando...';
      this.el.printerStatusBadge.textContent = '⏳ Verificando';
      this.el.printerStatusBadge.className = 'status-badge';

      const result = await window.electronAPI.printer.list();
      if (!result.success) throw new Error(result.error);

      const printers = result.printers || [];
      console.log(`[App] ${printers.length} impressora(s) encontrada(s)`);

      if (printers.length === 0) {
        this.el.printerName.textContent = 'Nenhuma impressora';
        this.el.printerStatusBadge.textContent = '❌ Não encontrada';
        this.el.printerStatusBadge.classList.add('error');
        return;
      }

      const argox = printers.find(p => p.Name.toLowerCase().includes('argox'));
      const selected = argox || printers[0];

      this.el.printerName.textContent = selected.Name;
      this.el.printerStatusBadge.textContent = '✅ Conectada';
      this.el.printerStatusBadge.classList.add('success');

      console.log(`[App] Impressora selecionada: ${selected.Name}`);
    } catch (error) {
      console.error('[App] Erro ao carregar impressoras:', error);
      this.el.printerName.textContent = 'Erro ao carregar';
      this.el.printerStatusBadge.textContent = '❌ Erro';
      this.el.printerStatusBadge.classList.add('error');
      UI.showToast(this.el.toastContainer, 'Erro ao carregar impressoras', 'error');
    }
  }

  selectPrinter(name) {
    console.log('[App] Impressora selecionada:', name);
    if (name) {
      this.el.printerName.textContent = name;
    }
  }

  async checkTokenStatus() {
    console.log('[App] Verificando status do token...');
    try {
      const response = await fetch('http://localhost:8547/token/status');
      console.log('[App] Status response:', response.status);

      const data = await response.json();
      console.log('[App] Token status:', data);

      if (data.configured) {
        console.log('[App] Token configurado');
        this.el.tokenStatus.textContent = 'Token configurado';
        this.el.tokenStatus.style.color = 'var(--text-secondary)';
        this.el.configToken.value = data.token;
        this.el.tokenStatusBadge.innerHTML = '<span class="badge success">✅ Configurado</span>';
      } else {
        console.log('[App] Token não configurado');
        this.el.tokenStatus.textContent = 'Token não configurado';
        this.el.tokenStatus.style.color = '#fbbf24';
        this.el.tokenStatusBadge.innerHTML = '<span class="badge warning">⚠️ Não configurado</span>';
      }
    } catch (error) {
      console.error('[App] Erro ao verificar token:', error);
      this.el.tokenStatus.textContent = 'Erro ao verificar';
      this.el.tokenStatus.style.color = '#ef4444';
      this.el.tokenStatusBadge.innerHTML = '<span class="badge error">❌ Erro</span>';
    }
  }

  async generateToken() {
    console.log('[App] Gerando token...');
    try {
      console.log('[App] Fazendo requisição para http://localhost:8547/token/generate');
      const response = await fetch('http://localhost:8547/token/generate', {
        method: 'POST'
      });
      console.log('[App] Resposta recebida:', response.status);
      
      const data = await response.json();
      console.log('[App] Dados:', data);
      
      if (data.success) {
        console.log('[App] Token gerado:', data.token);
        this.el.configToken.value = data.token;
        this.el.tokenStatus.innerHTML = '<span class="badge badge-success">✅ Token gerado com sucesso!</span>';
        UI.showToast(this.el.toastContainer, 'Token gerado com sucesso!', 'success');
        await this.checkTokenStatus();
      } else {
        console.error('[App] Erro na resposta:', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('[App] Erro ao gerar token:', error);
      UI.showToast(this.el.toastContainer, 'Erro: ' + error.message, 'error');
    }
  }

  async copyToken() {
    const token = this.el.configToken.value;
    if (!token) {
      UI.showToast(this.el.toastContainer, 'Nenhum token para copiar', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(token);
      UI.showToast(this.el.toastContainer, 'Token copiado!', 'success');
    } catch (error) {
      UI.showToast(this.el.toastContainer, 'Erro ao copiar token', 'error');
    }
  }

  openConfigModal() {
    console.log('[App] Abrindo modal de configuração');
    console.log('[App] Modal element:', this.el.configModal);
    if (!this.el.configModal) {
      console.error('[App] Modal não encontrado!');
      UI.showToast(this.el.toastContainer, 'Erro: Modal não encontrado', 'error');
      return;
    }
    
    // Forçar exibição
    this.el.configModal.style.display = 'flex';
    this.el.configModal.classList.add('active');
    this.el.configModal.style.opacity = '1';
    this.el.configModal.style.visibility = 'visible';
    
    console.log('[App] Modal aberto');
    console.log('[App] Classes:', this.el.configModal.className);
    console.log('[App] Styles:', {
      display: this.el.configModal.style.display,
      opacity: this.el.configModal.style.opacity,
      visibility: this.el.configModal.style.visibility
    });
  }

  closeConfigModal() {
    console.log('[App] Fechando modal');
    this.el.configModal.classList.remove('active');
    this.el.configModal.style.display = '';
    this.el.configModal.style.opacity = '';
    this.el.configModal.style.visibility = '';
  }


  startPolling() {
    // Verificar status periodicamente
    setInterval(() => {
      this.checkTokenStatus();
    }, 30000); // A cada 30 segundos
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ServerApp();
});

