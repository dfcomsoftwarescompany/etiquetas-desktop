/**
 * Etiquetas DFCOM - Renderer
 * Interface para impressão de etiquetas 40x60mm
 * v2.0.0
 */

// ==================== Helpers ====================

const UI = {
  setStatus(element, message, type = 'default') {
    element.className = 'status-item ' + type;
    element.querySelector('span:last-child').textContent = message;
  },

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
  },

  formatarPreco(valor) {
    if (!valor && valor !== 0) return '0,00';
    return parseFloat(valor).toFixed(2).replace('.', ',');
  },

  setButtonLoading(button, loading, text = 'Enviando...') {
    button.disabled = loading;
    if (loading) {
      button.dataset.originalHtml = button.innerHTML;
      button.innerHTML = `<svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/></svg>${text}`;
    } else {
      button.innerHTML = button.dataset.originalHtml || button.innerHTML;
    }
  }
};

// ==================== Printer Manager ====================

class PrinterManager {
  constructor(select, onSelect) {
    this.select = select;
    this.onSelect = onSelect;
    this.printers = [];
    this.selected = null;
  }

  async load() {
    this.select.disabled = true;
    this.select.innerHTML = '<option value="">Carregando...</option>';
    
    const result = await window.electronAPI.printer.list();
    if (!result.success) throw new Error(result.error);

    this.printers = result.printers || [];
    this.render();
    return this.printers.length;
  }

  render() {
    if (this.printers.length === 0) {
      this.select.innerHTML = '<option value="">Nenhuma impressora</option>';
      this.select.disabled = true;
      return;
    }

    this.select.innerHTML = '<option value="">Selecione...</option>';
    this.printers.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.Name;
      opt.textContent = p.Name;
      this.select.appendChild(opt);
    });
    this.select.disabled = false;

    // Auto-select Argox
    const argox = this.printers.find(p => p.Name.toLowerCase().includes('argox'));
    if (argox) {
      this.select.value = argox.Name;
      this.selectPrinter(argox.Name);
    }
  }

  selectPrinter(name) {
    this.selected = name ? this.printers.find(p => p.Name === name) : null;
    if (this.onSelect) this.onSelect(this.selected);
  }

  async print(labelData) {
    if (!this.selected) throw new Error('Selecione uma impressora');
    const result = await window.electronAPI.printer.printLabel(this.selected.Name, labelData);
    if (!result.success) throw new Error(result.error);
    return result;
  }
}

// ==================== Produtos Manager ====================

class ProdutosManager {
  constructor(tbody, emptyState, countEl, onPrint) {
    this.tbody = tbody;
    this.emptyState = emptyState;
    this.countEl = countEl;
    this.onPrint = onPrint;
    this.produtos = [];
  }

  async carregar(termo = '') {
    const result = termo
      ? await window.electronAPI.api.buscarProdutoPorNome(termo)
      : await window.electronAPI.api.buscarProdutos();
    
    if (!result.success) throw new Error(result.error);
    this.produtos = result.data || [];
    this.render();
    return this.produtos.length;
  }

  render() {
    this.tbody.innerHTML = '';

    if (this.produtos.length === 0) {
      this.emptyState.classList.remove('hidden');
      this.countEl.textContent = '0 produtos';
      return;
    }

    this.emptyState.classList.add('hidden');
    this.countEl.textContent = `${this.produtos.length} produto${this.produtos.length > 1 ? 's' : ''}`;

    this.produtos.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="codigo">${p.codBarras}</td>
        <td class="descricao">${p.descricao}</td>
        <td class="preco">R$ ${UI.formatarPreco(p.vlrVenda)}</td>
        <td class="col-acoes">
          <button class="btn btn-print-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>Etiqueta
          </button>
        </td>
      `;
      tr.querySelector('.btn-print-row').addEventListener('click', () => this.onPrint(p));
      this.tbody.appendChild(tr);
    });
  }
}

// ==================== Print Modal ====================

class PrintModal {
  constructor(elements, onPrint) {
    this.modal = elements.modal;
    this.el = elements;
    this.onPrint = onPrint;
    this.produto = null;
    this.bindEvents();
  }

  bindEvents() {
    this.el.btnClose.addEventListener('click', () => this.close());
    this.el.btnCancel.addEventListener('click', () => this.close());
    this.modal.querySelector('.modal-backdrop').addEventListener('click', () => this.close());
    this.el.descricao.addEventListener('input', () => this.updatePreview());
    this.el.preco.addEventListener('input', () => this.updatePreview());
    this.el.btnQtyMinus.addEventListener('click', () => this.adjustQty(-1));
    this.el.btnQtyPlus.addEventListener('click', () => this.adjustQty(1));
    this.el.quantidade.addEventListener('change', () => this.validateQty());
    this.el.btnPrint.addEventListener('click', () => this.onPrint(this.getLabelData()));
  }

  async open(produto) {
    this.produto = { ...produto };
    this.el.codigo.value = produto.codBarras;
    this.el.descricao.value = produto.descricao.substring(0, 25);
    this.el.preco.value = UI.formatarPreco(produto.vlrVenda);
    this.el.quantidade.value = 1;
    this.el.descricaoCount.textContent = this.el.descricao.value.length;
    
    const qr = await window.electronAPI.qrcode.generate(produto.codBarras, { width: 70, margin: 1 });
    if (qr.success) this.el.previewQr.innerHTML = `<img src="${qr.dataUrl}" alt="QR">`;
    
    this.updatePreview();
    this.modal.classList.add('active');
  }

  close() {
    this.modal.classList.remove('active');
    this.produto = null;
  }

  updatePreview() {
    this.el.previewDesc.textContent = this.el.descricao.value || 'Descrição';
    this.el.previewPrice.textContent = `R$ ${this.el.preco.value || '0,00'}`;
    this.el.descricaoCount.textContent = this.el.descricao.value.length;
  }

  adjustQty(delta) {
    let v = parseInt(this.el.quantidade.value) || 1;
    this.el.quantidade.value = Math.max(1, Math.min(100, v + delta));
  }

  validateQty() {
    let v = parseInt(this.el.quantidade.value) || 1;
    this.el.quantidade.value = Math.max(1, Math.min(100, v));
  }

  getLabelData() {
    return {
      texto: this.el.descricao.value,
      codigo: this.el.codigo.value,
      preco: this.el.preco.value,
      copies: parseInt(this.el.quantidade.value) || 1
    };
  }

  setLoading(loading) {
    UI.setButtonLoading(this.el.btnPrint, loading);
  }
}

// ==================== App ====================

class EtiquetasApp {
  constructor() {
    this.init();
  }

  async init() {
    this.getElements();
    this.setupModules();
    this.bindEvents();
    
    await this.loadVersion();
    await this.printerManager.load().catch(() => UI.showToast(this.el.toastContainer, 'Erro ao carregar impressoras', 'error'));
    await this.produtosManager.carregar().catch(() => {});
    
    UI.setStatus(this.el.statusMessage, 'Pronto', 'success');
  }

  getElements() {
    this.el = {
      // Header
      printerSelect: document.getElementById('printer-select'),
      btnRefresh: document.getElementById('btn-refresh'),
      // Search
      inputBusca: document.getElementById('input-busca'),
      btnBuscar: document.getElementById('btn-buscar'),
      produtosCount: document.getElementById('produtos-count'),
      // Table
      produtosTbody: document.getElementById('produtos-tbody'),
      emptyState: document.getElementById('empty-state'),
      // Modal
      printModal: document.getElementById('print-modal'),
      btnModalClose: document.getElementById('btn-modal-close'),
      btnCancel: document.getElementById('btn-cancel'),
      btnPrint: document.getElementById('btn-print'),
      editCodigo: document.getElementById('edit-codigo'),
      editDescricao: document.getElementById('edit-descricao'),
      editPreco: document.getElementById('edit-preco'),
      editQuantidade: document.getElementById('edit-quantidade'),
      descricaoCount: document.getElementById('descricao-count'),
      btnQtyMinus: document.getElementById('btn-qty-minus'),
      btnQtyPlus: document.getElementById('btn-qty-plus'),
      previewQr: document.getElementById('preview-qr'),
      previewDesc: document.getElementById('preview-desc'),
      previewPrice: document.getElementById('preview-price'),
      // UI
      statusMessage: document.getElementById('status-message'),
      appVersion: document.getElementById('app-version'),
      toastContainer: document.getElementById('toast-container')
    };
  }

  setupModules() {
    // Printer
    this.printerManager = new PrinterManager(
      this.el.printerSelect,
      (printer) => console.log('[App] Impressora:', printer?.Name)
    );

    // Produtos
    this.produtosManager = new ProdutosManager(
      this.el.produtosTbody,
      this.el.emptyState,
      this.el.produtosCount,
      (produto) => this.printModal.open(produto)
    );

    // Modal
    this.printModal = new PrintModal({
      modal: this.el.printModal,
      btnClose: this.el.btnModalClose,
      btnCancel: this.el.btnCancel,
      btnPrint: this.el.btnPrint,
      codigo: this.el.editCodigo,
      descricao: this.el.editDescricao,
      preco: this.el.editPreco,
      quantidade: this.el.editQuantidade,
      descricaoCount: this.el.descricaoCount,
      btnQtyMinus: this.el.btnQtyMinus,
      btnQtyPlus: this.el.btnQtyPlus,
      previewQr: this.el.previewQr,
      previewDesc: this.el.previewDesc,
      previewPrice: this.el.previewPrice
    }, (labelData) => this.imprimir(labelData));
  }

  bindEvents() {
    this.el.btnRefresh.addEventListener('click', () => this.refreshPrinters());
    this.el.printerSelect.addEventListener('change', (e) => this.printerManager.selectPrinter(e.target.value));
    this.el.btnBuscar.addEventListener('click', () => this.buscarProdutos());
    this.el.inputBusca.addEventListener('keypress', (e) => e.key === 'Enter' && this.buscarProdutos());
  }

  async loadVersion() {
    try {
      const version = await window.electronAPI.app.getVersion();
      this.el.appVersion.textContent = `v${version}`;
    } catch {}
  }

  async refreshPrinters() {
    try {
      const count = await this.printerManager.load();
      if (count === 0) UI.showToast(this.el.toastContainer, 'Nenhuma impressora', 'warning');
    } catch {
      UI.showToast(this.el.toastContainer, 'Erro ao carregar impressoras', 'error');
    }
  }

  async buscarProdutos() {
    UI.setStatus(this.el.statusMessage, 'Buscando...', 'loading');
    try {
      const count = await this.produtosManager.carregar(this.el.inputBusca.value.trim());
      UI.setStatus(this.el.statusMessage, 'Pronto', 'success');
      if (count === 0) UI.showToast(this.el.toastContainer, 'Nenhum produto encontrado', 'info');
    } catch (error) {
      UI.setStatus(this.el.statusMessage, 'Erro', 'error');
      UI.showToast(this.el.toastContainer, error.message, 'error');
    }
  }

  async imprimir(labelData) {
    UI.setStatus(this.el.statusMessage, `Imprimindo ${labelData.copies} etiqueta(s)...`, 'loading');
    this.printModal.setLoading(true);

    try {
      await this.printerManager.print(labelData);
      UI.showToast(this.el.toastContainer, `${labelData.copies} etiqueta(s) enviada(s)!`, 'success');
      UI.setStatus(this.el.statusMessage, 'Impresso', 'success');
      this.printModal.close();
    } catch (error) {
      UI.showToast(this.el.toastContainer, error.message, 'error');
      UI.setStatus(this.el.statusMessage, 'Erro', 'error');
    } finally {
      this.printModal.setLoading(false);
    }
  }
}

// ==================== Init ====================

document.addEventListener('DOMContentLoaded', () => {
  window.app = new EtiquetasApp();
});
