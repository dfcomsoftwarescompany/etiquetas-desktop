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
    this.stats = {
      totalPrinted: 0,
      queueCount: 0,
      successRate: 100,
      avgTime: 0
    };
    this.queue = [];
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
      totalPrinted: document.getElementById('total-printed'),
      queueCount: document.getElementById('queue-count'),
      successRate: document.getElementById('success-rate'),
      avgTime: document.getElementById('avg-time'),
      queueList: document.getElementById('queue-list'),
      queueEmptyState: document.getElementById('queue-empty-state'),
      btnClearQueue: document.getElementById('btn-clear-queue'),
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
    this.el.btnConfig.addEventListener('click', () => this.openConfigModal());
    this.el.btnConfigClose.addEventListener('click', () => this.closeConfigModal());
    this.el.btnConfigCancel.addEventListener('click', () => this.closeConfigModal());
    this.el.configModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeConfigModal());
    this.el.btnGenerateToken.addEventListener('click', () => this.generateToken());
    this.el.btnCopyToken.addEventListener('click', () => this.copyToken());
    this.el.btnClearQueue.addEventListener('click', () => this.clearQueue());
  }

  async loadVersion() {
    const version = await window.electronAPI.app.getVersion();
    this.el.appVersion.textContent = `v${version}`;
  }

  async loadPrinters() {
    try {
      this.el.printerSelect.disabled = true;
      this.el.printerSelect.innerHTML = '<option value="">Carregando...</option>';
      
      const result = await window.electronAPI.printer.list();
      if (!result.success) throw new Error(result.error);

      const printers = result.printers || [];
      
      if (printers.length === 0) {
        this.el.printerSelect.innerHTML = '<option value="">Nenhuma impressora</option>';
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
      if (argox) {
        this.el.printerSelect.value = argox.Name;
      }
    } catch (error) {
      UI.showToast(this.el.toastContainer, 'Erro ao carregar impressoras', 'error');
    }
  }

  selectPrinter(name) {
    console.log('[App] Impressora selecionada:', name);
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
      console.error('[App] Erro ao verificar token:', error);
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
      UI.showToast(this.el.toastContainer, 'Erro ao gerar token', 'error');
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
    this.el.configModal.classList.add('active');
  }

  closeConfigModal() {
    this.el.configModal.classList.remove('active');
  }

  addQueueItem(item) {
    this.queue.push(item);
    this.renderQueue();
    this.updateStats();
  }

  renderQueue() {
    if (this.queue.length === 0) {
      this.el.queueList.style.display = 'none';
      this.el.queueEmptyState.style.display = 'flex';
      return;
    }

    this.el.queueList.style.display = 'block';
    this.el.queueEmptyState.style.display = 'none';

    this.el.queueList.innerHTML = this.queue.map((item, index) => `
      <div class="queue-item ${item.status}">
        <div class="queue-item-icon">
          ${this.getStatusIcon(item.status)}
        </div>
        <div class="queue-item-content">
          <div class="queue-item-header">
            <span class="queue-item-title">${item.descricao}</span>
            <span class="queue-item-badge">${item.status === 'success' ? '✅' : item.status === 'error' ? '❌' : '⏳'}</span>
          </div>
          <div class="queue-item-details">
            <span>Código: ${item.codbarras}</span>
            <span>Qtd: ${item.qtd}</span>
            <span>R$ ${item.valor}</span>
          </div>
          <div class="queue-item-time">${new Date(item.timestamp).toLocaleTimeString()}</div>
        </div>
      </div>
    `).join('');
  }

  getStatusIcon(status) {
    const icons = {
      pending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      printing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    };
    return icons[status] || icons.pending;
  }

  updateStats() {
    this.stats.totalPrinted = this.queue.filter(i => i.status === 'success').length;
    this.stats.queueCount = this.queue.filter(i => i.status === 'pending' || i.status === 'printing').length;
    
    const total = this.queue.length;
    const success = this.queue.filter(i => i.status === 'success').length;
    this.stats.successRate = total > 0 ? Math.round((success / total) * 100) : 100;

    this.el.totalPrinted.textContent = this.stats.totalPrinted;
    this.el.queueCount.textContent = this.stats.queueCount;
    this.el.successRate.textContent = `${this.stats.successRate}%`;
  }

  clearQueue() {
    this.queue = this.queue.filter(i => i.status === 'pending' || i.status === 'printing');
    this.renderQueue();
    this.updateStats();
    UI.showToast(this.el.toastContainer, 'Histórico limpo', 'info');
  }

  startPolling() {
    setInterval(() => {
      this.updateStats();
    }, 5000);
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ServerApp();
});

