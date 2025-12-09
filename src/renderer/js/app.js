/**
 * Etiquetas DFCOM - Renderer Process
 * Interface para impressão de etiquetas 40x60mm em Argox OS-2140
 * v2.0.0
 */

class EtiquetasApp {
  constructor() {
    this.printers = [];
    this.selectedPrinter = null;
    this.debounceTimer = null;
    
    this.init();
  }

  async init() {
    this.elements = {
      // Printer
      printerSelect: document.getElementById('printer-select'),
      btnRefresh: document.getElementById('btn-refresh'),
      printerStatus: document.getElementById('printer-status'),
      
      // Form inputs
      inputTexto: document.getElementById('input-texto'),
      inputCodigo: document.getElementById('input-codigo'),
      inputPreco: document.getElementById('input-preco'),
      inputTamanho: document.getElementById('input-tamanho'),
      inputCopies: document.getElementById('input-copies'),
      textoCount: document.getElementById('texto-count'),
      
      // Quantity controls
      btnMinus: document.getElementById('btn-minus'),
      btnPlus: document.getElementById('btn-plus'),
      
      // Action buttons
      btnPrintTest: document.getElementById('btn-print-test'),
      btnPrint: document.getElementById('btn-print'),
      
      // Preview
      previewQr: document.getElementById('preview-qr'),
      previewTexto: document.getElementById('preview-texto'),
      previewCodigo: document.getElementById('preview-codigo'),
      previewPreco: document.getElementById('preview-preco'),
      previewTamanho: document.getElementById('preview-tamanho'),
      
      // UI
      statusMessage: document.getElementById('status-message'),
      appVersion: document.getElementById('app-version'),
      toastContainer: document.getElementById('toast-container'),
      
      // Update modal
      updateModal: document.getElementById('update-modal'),
      btnUpdateLater: document.getElementById('btn-update-later'),
      btnUpdateNow: document.getElementById('btn-update-now'),
      btnCheckUpdate: document.getElementById('btn-check-update')
    };

    await this.loadVersion();
    this.bindEvents();
    await this.loadPrinters();
    this.setupUpdateListeners();
    this.updatePreview();
    
    this.setStatus('Pronto', 'success');
  }

  bindEvents() {
    // Printer selection
    this.elements.btnRefresh.addEventListener('click', () => this.loadPrinters());
    this.elements.printerSelect.addEventListener('change', (e) => this.selectPrinter(e.target.value));

    // Form inputs with live preview
    this.elements.inputTexto.addEventListener('input', () => {
      this.updateCharCount();
      this.debouncedUpdatePreview();
    });
    
    this.elements.inputCodigo.addEventListener('input', () => this.debouncedUpdatePreview());
    this.elements.inputPreco.addEventListener('input', () => this.updatePreview());
    this.elements.inputTamanho.addEventListener('input', () => this.updatePreview());

    // Quantity controls
    this.elements.btnMinus.addEventListener('click', () => this.adjustQuantity(-1));
    this.elements.btnPlus.addEventListener('click', () => this.adjustQuantity(1));
    this.elements.inputCopies.addEventListener('change', () => this.validateQuantity());

    // Print buttons
    this.elements.btnPrintTest.addEventListener('click', () => this.printTest());
    this.elements.btnPrint.addEventListener('click', () => this.printLabel());

    // Updates
    this.elements.btnCheckUpdate.addEventListener('click', () => this.checkUpdates());
    this.elements.btnUpdateLater.addEventListener('click', () => this.hideUpdateModal());
    this.elements.btnUpdateNow.addEventListener('click', () => this.installUpdate());

    // Enter key to print
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey && !this.elements.btnPrint.disabled) {
        this.printLabel();
      }
    });
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
    this.elements.btnRefresh.classList.add('spinning');
    this.elements.printerSelect.disabled = true;
    this.setStatus('Buscando impressoras...', 'loading');

    try {
      const result = await window.electronAPI.printer.list();

      if (!result.success) {
        throw new Error(result.error);
      }

      this.printers = result.printers || [];
      this.updatePrinterList();

      if (this.printers.length === 0) {
        this.showToast('Nenhuma impressora encontrada', 'warning');
        this.setStatus('Nenhuma impressora', 'warning');
      } else {
        this.showToast(`${this.printers.length} impressora(s) encontrada(s)`, 'success');
        this.setStatus('Pronto', 'success');
      }
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
      this.updateButtons(false);
      return;
    }

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecione uma impressora...';
    select.appendChild(defaultOption);

    this.printers.forEach((printer) => {
      const option = document.createElement('option');
      option.value = printer.Name;
      
      // Destaque para Argox
      if (printer.Name.toLowerCase().includes('argox')) {
        option.textContent = `★ ${printer.Name}`;
        option.classList.add('recommended');
      } else {
        option.textContent = printer.Name;
      }
      
      select.appendChild(option);
    });

    // Auto-seleciona Argox
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
    const statusEl = this.elements.printerStatus;
    
    if (this.selectedPrinter) {
      const statusText = statusEl.querySelector('.status-text');
      const statusIndicator = statusEl.querySelector('.status-indicator');
      
      statusText.textContent = `${this.selectedPrinter.PortName || 'Porta desconhecida'}`;
      statusIndicator.classList.add('active');
      statusEl.classList.add('connected');
      
      this.updateButtons(true);
    } else {
      statusEl.querySelector('.status-text').textContent = 'Selecione uma impressora';
      statusEl.querySelector('.status-indicator').classList.remove('active');
      statusEl.classList.remove('connected');
      
      this.updateButtons(false);
    }
  }

  updateButtons(enabled) {
    this.elements.btnPrintTest.disabled = !enabled;
    this.elements.btnPrint.disabled = !enabled;
  }

  updateCharCount() {
    const count = this.elements.inputTexto.value.length;
    this.elements.textoCount.textContent = count;
    
    if (count > 20) {
      this.elements.textoCount.parentElement.classList.add('warning');
    } else {
      this.elements.textoCount.parentElement.classList.remove('warning');
    }
  }

  adjustQuantity(delta) {
    const input = this.elements.inputCopies;
    let value = parseInt(input.value) || 1;
    value = Math.max(1, Math.min(100, value + delta));
    input.value = value;
  }

  validateQuantity() {
    const input = this.elements.inputCopies;
    let value = parseInt(input.value) || 1;
    value = Math.max(1, Math.min(100, value));
    input.value = value;
  }

  debouncedUpdatePreview() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.updatePreview(), 300);
  }

  async updatePreview() {
    const texto = this.elements.inputTexto.value || 'PRODUTO';
    const codigo = this.elements.inputCodigo.value || '123456789';
    const preco = this.elements.inputPreco.value;
    const tamanho = this.elements.inputTamanho.value;

    // Update text elements
    this.elements.previewTexto.textContent = texto.toUpperCase();
    this.elements.previewCodigo.textContent = codigo;
    
    // Update price
    if (preco) {
      this.elements.previewPreco.textContent = `R$ ${preco}`;
      this.elements.previewPreco.style.display = 'block';
    } else {
      this.elements.previewPreco.style.display = 'none';
    }
    
    // Update size
    if (tamanho) {
      this.elements.previewTamanho.textContent = `Tam: ${tamanho}`;
      this.elements.previewTamanho.style.display = 'block';
    } else {
      this.elements.previewTamanho.style.display = 'none';
    }

    // Generate QR Code preview
    try {
      const result = await window.electronAPI.qrcode.generate(codigo, { width: 120, margin: 1 });
      if (result.success) {
        this.elements.previewQr.src = result.dataUrl;
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code preview:', error);
    }
  }

  getLabelData() {
    return {
      texto: this.elements.inputTexto.value.trim() || 'PRODUTO',
      codigo: this.elements.inputCodigo.value.trim() || '123456789',
      preco: this.elements.inputPreco.value.trim(),
      tamanho: this.elements.inputTamanho.value.trim(),
      copies: parseInt(this.elements.inputCopies.value) || 1,
      larguraMm: 40,
      alturaMm: 60
    };
  }

  async printTest() {
    if (!this.selectedPrinter) {
      this.showToast('Selecione uma impressora', 'error');
      return;
    }

    this.setButtonLoading(this.elements.btnPrintTest, true);
    this.setStatus('Imprimindo teste...', 'loading');

    try {
      const result = await window.electronAPI.printer.test(this.selectedPrinter.Name);

      if (!result.success) {
        throw new Error(result.error);
      }

      this.showToast('Teste enviado com sucesso!', 'success');
      this.setStatus('Teste impresso', 'success');
    } catch (error) {
      console.error('Erro ao imprimir teste:', error);
      this.showToast(`Erro: ${error.message}`, 'error');
      this.setStatus('Erro na impressão', 'error');
    } finally {
      this.setButtonLoading(this.elements.btnPrintTest, false);
    }
  }

  async printLabel() {
    if (!this.selectedPrinter) {
      this.showToast('Selecione uma impressora', 'error');
      return;
    }

    const labelData = this.getLabelData();
    
    this.setButtonLoading(this.elements.btnPrint, true);
    this.setStatus(`Imprimindo ${labelData.copies} etiqueta(s)...`, 'loading');

    try {
      const result = await window.electronAPI.printer.printLabel(
        this.selectedPrinter.Name, 
        labelData
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      this.showToast(`${labelData.copies} etiqueta(s) enviada(s)!`, 'success');
      this.setStatus('Impressão concluída', 'success');
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      this.showToast(`Erro: ${error.message}`, 'error');
      this.setStatus('Erro na impressão', 'error');
    } finally {
      this.setButtonLoading(this.elements.btnPrint, false);
    }
  }

  setButtonLoading(button, loading) {
    button.disabled = loading;
    
    if (loading) {
      button.dataset.originalHtml = button.innerHTML;
      button.innerHTML = `
        <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
        </svg>
        Enviando...
      `;
    } else {
      button.innerHTML = button.dataset.originalHtml || button.innerHTML;
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
    this.setStatus('Verificando atualizações...', 'loading');
    
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
    
    this.setStatus('Pronto', 'success');
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

  setStatus(message, type = 'default') {
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
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;

    this.elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new EtiquetasApp();
});
