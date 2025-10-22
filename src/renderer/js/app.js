// Classe principal da aplicação
class LabelDesignerApp {
  settings = null;
  currentTemplate = null;
  selectedElement = null;

  constructor() {
    this.init();
  }

  async init() {
    // Carregar configurações
    await this.loadSettings();
    
    // Carregar impressoras
    await this.loadPrinters();
    
    // Configurar event listeners
    this.setupEventListeners();
    
    // Configurar IPC listeners
    this.setupIPCListeners();
    
    // Inicializar canvas
    this.updateCanvasSize();
  }

  async loadSettings() {
    try {
      this.settings = await window.electronAPI.getSettings();
      
      // Aplicar configurações na UI
      const protocolSelect = document.getElementById('selectProtocol');
      const printerSelect = document.getElementById('selectPrinter');
      const widthInput = document.getElementById('labelWidth');
      const heightInput = document.getElementById('labelHeight');
      
      if (this.settings) {
        protocolSelect.value = this.settings.defaultProtocol;
        printerSelect.value = this.settings.defaultPrinter;
        widthInput.value = this.settings.defaultLabelSize.width.toString();
        heightInput.value = this.settings.defaultLabelSize.height.toString();
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }

  async loadPrinters() {
    try {
      const printers = await window.electronAPI.getPrinters();
      const printerSelect = document.getElementById('selectPrinter');
      
      // Limpar opções existentes
      printerSelect.innerHTML = '<option value="">Selecione a impressora...</option>';
      
      // Adicionar impressoras
      printers.forEach(printer => {
        const option = document.createElement('option');
        option.value = printer.name;
        option.textContent = printer.displayName || printer.name;
        if (printer.isDefault) {
          option.textContent += ' (Padrão)';
        }
        printerSelect.appendChild(option);
      });
      
      // Selecionar impressora padrão se configurada
      if (this.settings?.defaultPrinter) {
        printerSelect.value = this.settings.defaultPrinter;
      }
    } catch (error) {
      console.error('Erro ao carregar impressoras:', error);
    }
  }

  setupEventListeners() {
    // Botões da toolbar
    document.getElementById('btnNew')?.addEventListener('click', () => this.newLabel());
    document.getElementById('btnSaveTemplate')?.addEventListener('click', () => this.saveTemplate());
    document.getElementById('btnLoadTemplate')?.addEventListener('click', () => this.showTemplates());
    document.getElementById('btnPrint')?.addEventListener('click', () => this.print());
    document.getElementById('btnCopyCode')?.addEventListener('click', () => this.copyCode());
    
    // Botões de elementos
    document.getElementById('btnAddText')?.addEventListener('click', () => this.addElement('text'));
    document.getElementById('btnAddBarcode')?.addEventListener('click', () => this.addElement('barcode'));
    document.getElementById('btnAddQRCode')?.addEventListener('click', () => this.addElement('qrcode'));
    document.getElementById('btnAddLine')?.addEventListener('click', () => this.addElement('line'));
    document.getElementById('btnAddRectangle')?.addEventListener('click', () => this.addElement('rectangle'));
    
    // Propriedades da etiqueta
    document.getElementById('labelWidth')?.addEventListener('change', () => this.updateCanvasSize());
    document.getElementById('labelHeight')?.addEventListener('change', () => this.updateCanvasSize());
    document.getElementById('labelOrientation')?.addEventListener('change', () => this.updateCanvasSize());
    
    // Modais
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      const closeBtn = modal.querySelector('.close-btn');
      closeBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    });
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', (event) => {
      const target = event.target;
      if (target.classList.contains('modal')) {
        target.style.display = 'none';
      }
    });
  }

  setupIPCListeners() {
    window.electronAPI.onNewLabel(() => this.newLabel());
    window.electronAPI.onOpenTemplate(() => this.showTemplates());
    window.electronAPI.onShowAbout(() => this.showAbout());
  }

  newLabel() {
    // Limpar canvas
    const canvas = document.getElementById('labelCanvas');
    if (canvas) {
      canvas.innerHTML = '';
    }
    
    // Resetar para tamanho padrão
    const widthInput = document.getElementById('labelWidth');
    const heightInput = document.getElementById('labelHeight');
    widthInput.value = '100';
    heightInput.value = '50';
    
    this.updateCanvasSize();
    this.updateCodePreview();
  }

  async saveTemplate() {
    const name = prompt('Nome do template:');
    if (!name) return;
    
    const description = prompt('Descrição (opcional):');
    
    const elements = this.getCanvasElements();
    const widthInput = document.getElementById('labelWidth');
    const heightInput = document.getElementById('labelHeight');
    
    const template = {
      id: Date.now().toString(),
      name,
      description: description || '',
      elements,
      labelSize: {
        width: parseInt(widthInput.value),
        height: parseInt(heightInput.value)
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      await window.electronAPI.saveTemplate(template);
      alert('Template salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      alert('Erro ao salvar template');
    }
  }

  async showTemplates() {
    const modal = document.getElementById('templateModal');
    if (!modal) return;
    
    try {
      const templates = await window.electronAPI.getTemplates();
      const templateList = document.getElementById('templateList');
      if (!templateList) return;
      
      templateList.innerHTML = '';
      
      if (templates.length === 0) {
        templateList.innerHTML = '<p style="text-align: center; color: #6b7280;">Nenhum template salvo</p>';
      } else {
        templates.forEach(template => {
          const item = this.createTemplateItem(template);
          templateList.appendChild(item);
        });
      }
      
      modal.style.display = 'flex';
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  }

  createTemplateItem(template) {
    const div = document.createElement('div');
    div.className = 'template-item';
    
    div.innerHTML = `
      <h4>${template.name}</h4>
      <p>${template.description || 'Sem descrição'}</p>
      <p style="font-size: 11px;">Tamanho: ${template.labelSize.width}x${template.labelSize.height}mm</p>
      <div class="template-item-actions">
        <button class="btn btn-sm" onclick="app.loadTemplate('${template.id}')">Carregar</button>
        <button class="btn btn-sm btn-danger" onclick="app.deleteTemplate('${template.id}')">Excluir</button>
      </div>
    `;
    
    return div;
  }

  async loadTemplate(templateId) {
    try {
      const templates = await window.electronAPI.getTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        alert('Template não encontrado');
        return;
      }
      
      // Aplicar tamanho da etiqueta
      const widthInput = document.getElementById('labelWidth');
      const heightInput = document.getElementById('labelHeight');
      widthInput.value = template.labelSize.width.toString();
      heightInput.value = template.labelSize.height.toString();
      this.updateCanvasSize();
      
      // Carregar elementos usando o labelDesigner
      if (window.labelDesigner) {
        window.labelDesigner.loadElements(template.elements);
      }
      
      // Fechar modal
      const modal = document.getElementById('templateModal');
      if (modal) {
        modal.style.display = 'none';
      }
      
      this.updateCodePreview();
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      alert('Erro ao carregar template');
    }
  }

  async deleteTemplate(templateId) {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;
    
    try {
      await window.electronAPI.deleteTemplate(templateId);
      this.showTemplates(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      alert('Erro ao excluir template');
    }
  }

  showAbout() {
    const modal = document.getElementById('aboutModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  updateCanvasSize() {
    const canvas = document.getElementById('labelCanvas');
    const widthInput = document.getElementById('labelWidth');
    const heightInput = document.getElementById('labelHeight');
    const orientationSelect = document.getElementById('labelOrientation');
    
    let width = parseInt(widthInput.value);
    let height = parseInt(heightInput.value);
    
    // Aplicar orientação
    if (orientationSelect.value === 'landscape') {
      [width, height] = [height, width];
    }
    
    // Converter mm para pixels (assumindo 3.78 pixels por mm para 96 DPI)
    const mmToPixels = 3.78;
    canvas.style.width = `${width * mmToPixels}px`;
    canvas.style.height = `${height * mmToPixels}px`;
    
    this.updateCodePreview();
  }

  addElement(type) {
    // Implementação será adicionada no arquivo label-designer.ts
    if (window.labelDesigner) {
      window.labelDesigner.addElement(type);
    }
  }

  getCanvasElements() {
    if (window.labelDesigner) {
      return window.labelDesigner.getElements();
    }
    return [];
  }

  async print() {
    console.log('🖨️ Função print() chamada');
    
    const printerSelect = document.getElementById('selectPrinter');
    const protocolSelect = document.getElementById('selectProtocol');
    const widthInput = document.getElementById('labelWidth');
    const heightInput = document.getElementById('labelHeight');
    
    // Validar seleção de impressora
    if (!printerSelect.value) {
      alert('⚠️ Por favor, selecione uma impressora');
      console.warn('Nenhuma impressora selecionada');
      return;
    }
    
    // Validar que há elementos na etiqueta
    const elements = this.getCanvasElements();
    console.log('📦 Elementos no canvas:', elements);
    
    if (elements.length === 0) {
      alert('⚠️ Adicione pelo menos um elemento à etiqueta antes de imprimir');
      console.warn('Canvas vazio');
      return;
    }
    
    // Mostrar modal de impressão
    this.showPrintDialog(printerSelect, protocolSelect, elements, widthInput, heightInput);
  }

  showPrintDialog(printerSelect, protocolSelect, elements, widthInput, heightInput) {
    const modal = document.getElementById('printModal');
    const copiesInput = document.getElementById('printCopies');
    const elementCount = document.getElementById('printElementCount');
    const printerName = document.getElementById('printPrinterName');
    const protocol = document.getElementById('printProtocol');
    const btnCancel = document.getElementById('btnCancelPrint');
    const btnConfirm = document.getElementById('btnConfirmPrint');
    
    // Preencher informações
    copiesInput.value = '1';
    elementCount.textContent = elements.length;
    printerName.textContent = printerSelect.options[printerSelect.selectedIndex].text;
    protocol.textContent = protocolSelect.value;
    
    // Mostrar modal
    modal.style.display = 'flex';
    
    // Focar no input
    setTimeout(() => copiesInput.focus(), 100);
    
    // Handler de confirmação
    const handleConfirm = async () => {
      const copies = parseInt(copiesInput.value);
      
      if (!copies || copies <= 0) {
        alert('⚠️ Número de cópias inválido');
        return;
      }
      
      // Fechar modal
      modal.style.display = 'none';
      
      // Executar impressão
      await this.executePrint(printerSelect, protocolSelect, elements, widthInput, heightInput, copies);
      
      // Remover listeners
      btnConfirm.removeEventListener('click', handleConfirm);
      btnCancel.removeEventListener('click', handleCancel);
      copiesInput.removeEventListener('keydown', handleKeyDown);
    };
    
    // Handler de cancelamento
    const handleCancel = () => {
      modal.style.display = 'none';
      console.log('Impressão cancelada pelo usuário');
      
      // Remover listeners
      btnConfirm.removeEventListener('click', handleConfirm);
      btnCancel.removeEventListener('click', handleCancel);
      copiesInput.removeEventListener('keydown', handleKeyDown);
    };
    
    // Handler de teclas
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleConfirm();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };
    
    // Adicionar listeners
    btnConfirm.addEventListener('click', handleConfirm);
    btnCancel.addEventListener('click', handleCancel);
    copiesInput.addEventListener('keydown', handleKeyDown);
  }

  async executePrint(printerSelect, protocolSelect, elements, widthInput, heightInput, copies) {
    const btnPrint = document.getElementById('btnPrint');
    const originalText = btnPrint.innerHTML;
    
    try {
      console.log('🔄 Iniciando processo de impressão...');
      
      // Desabilitar botão de impressão
      btnPrint.disabled = true;
      btnPrint.innerHTML = '⏳ Imprimindo...';
      
      // Preparar dados para impressão
      const printData = {
        printerName: printerSelect.value,
        protocol: protocolSelect.value,
        elements: elements,
        labelSize: {
          width: parseInt(widthInput.value),
          height: parseInt(heightInput.value)
        },
        copies: copies
      };
      
      console.log('📋 Dados de impressão:', printData);
      
      // Enviar para impressão
      console.log('📤 Enviando para impressão...');
      const result = await window.electronAPI.printLabel(printData);
      
      console.log('📥 Resposta recebida:', result);
      
      if (result.success) {
        console.log('✅ Impressão bem-sucedida!');
        alert(`✅ Etiqueta enviada para impressão!\n\n📄 ${copies} cópia(s)\n🖨️ Impressora: ${printerSelect.options[printerSelect.selectedIndex].text}`);
      } else {
        console.error('❌ Erro na impressão:', result);
        throw new Error(result.error || 'Erro desconhecido');
      }
      
      // Restaurar botão
      btnPrint.disabled = false;
      btnPrint.innerHTML = originalText;
      
    } catch (error) {
      console.error('❌ Exceção ao imprimir:', error);
      console.error('Stack trace:', error.stack);
      
      // Montar mensagem de erro detalhada
      let errorMessage = '❌ Erro ao imprimir etiqueta\n\n';
      errorMessage += `Erro: ${error.message}\n\n`;
      errorMessage += 'Possíveis causas:\n';
      errorMessage += '• Impressora desligada ou desconectada\n';
      errorMessage += '• Driver da impressora não instalado\n';
      errorMessage += '• Falta de permissão para acessar a impressora\n';
      errorMessage += '• Protocolo incompatível com a impressora\n\n';
      errorMessage += 'Verifique o console (F12) para mais detalhes.';
      
      alert(errorMessage);
      
      // Restaurar botão em caso de erro
      if (btnPrint) {
        btnPrint.disabled = false;
        btnPrint.innerHTML = originalText;
      }
    }
  }

  copyCode() {
    const codePreview = document.getElementById('codePreview');
    if (!codePreview) return;
    
    const text = codePreview.textContent || '';
    
    navigator.clipboard.writeText(text).then(() => {
      // Feedback visual
      const btn = document.getElementById('btnCopyCode');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ Copiado!';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      }
    }).catch(err => {
      console.error('Erro ao copiar:', err);
    });
  }

  async updateCodePreview() {
    try {
      const protocolSelect = document.getElementById('selectProtocol');
      const widthInput = document.getElementById('labelWidth');
      const heightInput = document.getElementById('labelHeight');
      const codePreview = document.getElementById('codePreview');
      
      if (!codePreview) return;
      
      // Obter elementos da etiqueta
      const elements = this.getCanvasElements();
      
      // Se não houver elementos, mostrar mensagem
      if (elements.length === 0) {
        codePreview.textContent = '; Adicione elementos à etiqueta para ver o código gerado';
        return;
      }
      
      // Preparar dados para preview
      const previewData = {
        protocol: protocolSelect.value,
        elements: elements,
        labelSize: {
          width: parseInt(widthInput.value),
          height: parseInt(heightInput.value)
        }
      };
      
      // Gerar preview
      const result = await window.electronAPI.generatePreview(previewData);
      
      if (result.success) {
        codePreview.textContent = result.code;
      } else {
        codePreview.textContent = `; Erro ao gerar código: ${result.error}`;
      }
      
    } catch (error) {
      console.error('Erro ao atualizar preview:', error);
      const codePreview = document.getElementById('codePreview');
      if (codePreview) {
        codePreview.textContent = `; Erro: ${error.message}`;
      }
    }
  }
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LabelDesignerApp();
});