/**
 * Etiquetas Desktop - Renderer Process
 * Interface para impressão de etiquetas em Argox OS-2140
 */

class App {
  constructor() {
    this.printers = [];
    this.selectedPrinter = null;
    
    this.init();
  }

  async init() {
    // Inicializa elementos do DOM
    this.elements = {
      printerSelect: document.getElementById('printer-select'),
      btnRefresh: document.getElementById('btn-refresh'),
      btnPrintTest: document.getElementById('btn-print-test'),
      btnCheckUpdate: document.getElementById('btn-check-update'),
      printerStatus: document.getElementById('printer-status'),
      printerPort: document.getElementById('printer-port'),
      printerDriver: document.getElementById('printer-driver'),
      statusMessage: document.getElementById('status-message'),
      appVersion: document.getElementById('app-version'),
      updateModal: document.getElementById('update-modal'),
      btnUpdateLater: document.getElementById('btn-update-later'),
      btnUpdateNow: document.getElementById('btn-update-now'),
      toastContainer: document.getElementById('toast-container')
    };

    // Carrega versão do app
    await this.loadVersion();

    // Bind de eventos
    this.bindEvents();

    // Carrega impressoras
    await this.loadPrinters();

    // Configura listeners de atualização
    this.setupUpdateListeners();

    this.setStatus('Pronto');
  }

  bindEvents() {
    // Atualizar lista de impressoras
    this.elements.btnRefresh.addEventListener('click', () => this.loadPrinters());

    // Seleção de impressora
    this.elements.printerSelect.addEventListener('change', (e) => {
      this.selectPrinter(e.target.value);
    });

    // Botão de impressão de teste
    this.elements.btnPrintTest.addEventListener('click', () => this.printTest());

    // Verificar atualizações
    this.elements.btnCheckUpdate.addEventListener('click', () => this.checkUpdates());

    // Modal de atualização
    this.elements.btnUpdateLater.addEventListener('click', () => this.hideUpdateModal());
    this.elements.btnUpdateNow.addEventListener('click', () => this.installUpdate());
  }

  async loadVersion() {
    try {
      const version = await window.electronAPI.app.getVersion();
      this.elements.appVersion.textContent = `v${version}`;
    } catch (error) {
      console.error('Erro ao carregar versão:', error);
    }
  }

  async loadPrinters() {
    // Feedback visual
    this.elements.btnRefresh.classList.add('spinning');
    this.elements.printerSelect.disabled = true;
    this.setStatus('Buscando impressoras...');

    try {
      const result = await window.electronAPI.printer.list();

      if (!result.success) {
        throw new Error(result.error);
      }

      this.printers = result.printers || [];
      this.updatePrinterList();

      if (this.printers.length === 0) {
        this.showToast('Nenhuma impressora encontrada', 'info');
      } else {
        this.showToast(`${this.printers.length} impressora(s) encontrada(s)`, 'success');
      }

      this.setStatus('Pronto');
    } catch (error) {
      console.error('Erro ao listar impressoras:', error);
      this.showToast(`Erro: ${error.message}`, 'error');
      this.setStatus('Erro ao buscar impressoras', 'error');
    } finally {
      this.elements.btnRefresh.classList.remove('spinning');
      this.elements.printerSelect.disabled = false;
    }
  }

  updatePrinterList() {
    const select = this.elements.printerSelect;
    select.innerHTML = '';

    if (this.printers.length === 0) {
      select.innerHTML = '<option value="">Nenhuma impressora encontrada</option>';
      this.elements.btnPrintTest.disabled = true;
      return;
    }

    // Opção padrão
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecione uma impressora...';
    select.appendChild(defaultOption);

    // Lista de impressoras
    this.printers.forEach((printer) => {
      const option = document.createElement('option');
      option.value = printer.Name;
      option.textContent = printer.Name;
      
      // Marca impressoras Argox
      if (printer.Name.toLowerCase().includes('argox')) {
        option.textContent += ' ★';
      }
      
      select.appendChild(option);
    });

    // Tenta selecionar Argox automaticamente
    const argoxPrinter = this.printers.find(p => 
      p.Name.toLowerCase().includes('argox') || 
      p.Name.toLowerCase().includes('os-2140')
    );

    if (argoxPrinter) {
      select.value = argoxPrinter.Name;
      this.selectPrinter(argoxPrinter.Name);
    }
  }

  selectPrinter(printerName) {
    this.selectedPrinter = this.printers.find(p => p.Name === printerName);
    
    if (this.selectedPrinter) {
      // Atualiza informações
      this.elements.printerStatus.textContent = this.getPrinterStatus(this.selectedPrinter.PrinterStatus);
      this.elements.printerPort.textContent = this.selectedPrinter.PortName || '--';
      this.elements.printerDriver.textContent = this.truncateText(this.selectedPrinter.DriverName, 30) || '--';
      
      // Habilita botão de impressão
      this.elements.btnPrintTest.disabled = false;
    } else {
      // Limpa informações
      this.elements.printerStatus.textContent = '--';
      this.elements.printerPort.textContent = '--';
      this.elements.printerDriver.textContent = '--';
      this.elements.btnPrintTest.disabled = true;
    }
  }

  getPrinterStatus(status) {
    const statusMap = {
      0: 'Desconhecido',
      1: 'Outro',
      2: 'Desconhecido',
      3: 'Pronta',
      4: 'Imprimindo',
      5: 'Aquecendo',
      6: 'Parada',
      7: 'Offline'
    };
    return statusMap[status] || 'Desconhecido';
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  async printTest() {
    if (!this.selectedPrinter) {
      this.showToast('Selecione uma impressora', 'error');
      return;
    }

    // Feedback visual
    this.elements.btnPrintTest.disabled = true;
    this.elements.btnPrintTest.innerHTML = `
      <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
      </svg>
      Imprimindo...
    `;
    this.setStatus('Enviando para impressora...');

    try {
      const result = await window.electronAPI.printer.test(this.selectedPrinter.Name);

      if (!result.success) {
        throw new Error(result.error);
      }

      this.showToast('Etiqueta enviada com sucesso!', 'success');
      this.setStatus('Impressão concluída');
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      this.showToast(`Erro: ${error.message}`, 'error');
      this.setStatus('Erro na impressão', 'error');
    } finally {
      this.elements.btnPrintTest.disabled = false;
      this.elements.btnPrintTest.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9V2h12v7"/>
          <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Imprimir Etiqueta de Teste
      `;
    }
  }

  // ==================== Updates ====================

  setupUpdateListeners() {
    window.electronAPI.updates.onAvailable(() => {
      this.showToast('Nova atualização disponível', 'info');
    });

    window.electronAPI.updates.onDownloaded(() => {
      this.showUpdateModal();
    });
  }

  async checkUpdates() {
    this.setStatus('Verificando atualizações...');
    
    try {
      const result = await window.electronAPI.updates.check();
      
      if (result.success) {
        this.showToast('Verificação concluída', 'success');
      } else {
        this.showToast('Você está na versão mais recente', 'info');
      }
    } catch (error) {
      this.showToast('Erro ao verificar atualizações', 'error');
    }
    
    this.setStatus('Pronto');
  }

  showUpdateModal() {
    this.elements.updateModal.classList.add('active');
  }

  hideUpdateModal() {
    this.elements.updateModal.classList.remove('active');
  }

  installUpdate() {
    window.electronAPI.updates.install();
  }

  // ==================== UI Helpers ====================

  setStatus(message, type = '') {
    const statusItem = this.elements.statusMessage;
    statusItem.className = 'status-item ' + type;
    statusItem.querySelector('span:last-child').textContent = message;
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;

    this.elements.toastContainer.appendChild(toast);

    // Auto-remove após 4 segundos
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

