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
      btnConfigLarge: document.getElementById('btn-config-large'),
      printerNameDisplay: document.getElementById('printer-name-display'),
      printerStatusBadge: document.getElementById('printer-status-badge'),
      tokenBadge: document.getElementById('token-badge'),
      appVersion: document.getElementById('app-version'),
      toastContainer: document.getElementById('toast-container'),
      configModal: document.getElementById('config-modal'),
      btnConfigClose: document.getElementById('btn-config-close'),
      btnConfigCancel: document.getElementById('btn-config-cancel'),
      configToken: document.getElementById('config-token'),
      btnGenerateToken: document.getElementById('btn-generate-token'),
      btnCopyToken: document.getElementById('btn-copy-token'),
      tokenStatus: document.getElementById('token-status')
    };
  }

  bindEvents() {
    this.el.btnRefresh.addEventListener('click', () => this.loadPrinters());
    this.el.printerSelect.addEventListener('change', (e) => this.selectPrinter(e.target.value));
    this.el.btnConfig.addEventListener('click', () => {
      this.openConfigModal();
    });
    this.el.btnConfigLarge.addEventListener('click', () => {
      this.openConfigModal();
    });
    this.el.btnConfigClose.addEventListener('click', () => this.closeConfigModal());
    this.el.btnConfigCancel.addEventListener('click', () => this.closeConfigModal());
    this.el.configModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeConfigModal());
    this.el.btnGenerateToken.addEventListener('click', () => {
      this.generateToken();
    });
    this.el.btnCopyToken.addEventListener('click', () => this.copyToken());
  }

  async loadVersion() {
    const version = await window.electronAPI.app.getVersion();
    this.el.appVersion.textContent = `v${version}`;
  }

  async loadPrinters() {
    try {
      this.el.printerSelect.disabled = true;
      this.el.printerSelect.innerHTML = '<option value="">Carregando...</option>';
      this.el.printerNameDisplay.textContent = 'Carregando...';
      this.el.printerStatusBadge.textContent = '⏳ Verificando';
      this.el.printerStatusBadge.className = 'badge badge-warning';

      const result = await window.electronAPI.printer.list();
      if (!result.success) throw new Error(result.error);

      const printers = result.printers || [];

      if (printers.length === 0) {
        this.el.printerSelect.innerHTML = '<option value="">Nenhuma impressora</option>';
        this.el.printerNameDisplay.textContent = 'Nenhuma impressora';
        this.el.printerStatusBadge.textContent = '❌ Não encontrada';
        this.el.printerStatusBadge.className = 'badge badge-error';
        return;
      }

      this.el.printerSelect.innerHTML = '<option value="">Selecione...</option>';
      printers.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.Name;
        opt.textContent = p.Name;
        this.el.printerSelect.appendChild(opt);
      });

      this.el.printerSelect.disabled = false;

      const argox = printers.find(p => p.Name.toLowerCase().includes('argox'));
      const selected = argox || printers[0];

      this.el.printerSelect.value = selected.Name;
      this.el.printerNameDisplay.textContent = selected.Name;
      this.el.printerStatusBadge.textContent = '✅ Conectada';
      this.el.printerStatusBadge.className = 'badge badge-success';
    } catch (error) {
      this.el.printerNameDisplay.textContent = 'Erro ao carregar';
      this.el.printerStatusBadge.textContent = '❌ Erro';
      this.el.printerStatusBadge.className = 'badge badge-error';
      UI.showToast(this.el.toastContainer, 'Erro ao carregar impressoras', 'error');
    }
  }

  selectPrinter(name) {
    // Impressora selecionada
  }

  async checkTokenStatus() {
    try {
      const response = await fetch('http://localhost:8547/token/status');

      const data = await response.json();

      if (data.configured) {
        this.el.tokenBadge.innerHTML = '🔒 Token: Configurado';
        this.el.tokenBadge.className = 'status-badge badge-success';
        this.el.configToken.value = data.token;
        this.el.tokenStatus.innerHTML = '<span class="badge badge-success">✅ Configurado</span>';
      } else {
        this.el.tokenBadge.innerHTML = '⚠️ Token: Não configurado';
        this.el.tokenBadge.className = 'status-badge badge-warning';
        this.el.tokenStatus.innerHTML = '<span class="badge badge-warning">⚠️ Não configurado</span>';
      }
    } catch (error) {
      // Erro ao verificar token
    }
  }

  async generateToken() {
    try {
      const response = await fetch('http://localhost:8547/token/generate', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        this.el.configToken.value = data.token;
        this.el.tokenStatus.innerHTML = '<span class="badge badge-success">✅ Token gerado com sucesso!</span>';
        UI.showToast(this.el.toastContainer, 'Token gerado com sucesso!', 'success');
        await this.checkTokenStatus();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
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
    if (!this.el.configModal) {
      UI.showToast(this.el.toastContainer, 'Erro: Modal não encontrado', 'error');
      return;
    }
    
    // Forçar exibição
    this.el.configModal.style.display = 'flex';
    this.el.configModal.classList.add('active');
    this.el.configModal.style.opacity = '1';
    this.el.configModal.style.visibility = 'visible';
  }

  closeConfigModal() {
    this.el.configModal.classList.remove('active');
    this.el.configModal.style.display = '';
    this.el.configModal.style.opacity = '';
    this.el.configModal.style.visibility = '';
  }

  startPolling() {
    // Verificar status do token periodicamente
    setInterval(() => {
      this.checkTokenStatus();
    }, 30000); // A cada 30 segundos
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ServerApp();
});

