// Declaração global para a API do Electron
declare global {
  interface Window {
    electronAPI: {
      getPrinters: () => Promise<Electron.PrinterInfo[]>;
      saveSettings: (settings: Settings) => Promise<{ success: boolean }>;
      getSettings: () => Promise<Settings>;
      saveTemplate: (template: Template) => Promise<{ success: boolean; id: string }>;
      getTemplates: () => Promise<Template[]>;
      deleteTemplate: (templateId: string) => Promise<{ success: boolean }>;
      onNewLabel: (callback: () => void) => void;
      onOpenTemplate: (callback: () => void) => void;
      onShowAbout: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

// Interfaces
interface Settings {
  defaultPrinter: string;
  defaultProtocol: 'PPLA' | 'EPL2' | 'ZPL';
  defaultLabelSize: { width: number; height: number };
  units: 'mm' | 'inch';
}

interface Template {
  id: string;
  name: string;
  description?: string;
  elements: LabelElement[];
  labelSize: { width: number; height: number };
  createdAt: string;
  updatedAt: string;
}

interface LabelElement {
  id: string;
  type: 'text' | 'barcode' | 'qrcode' | 'line' | 'rectangle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  rotation?: number;
  style?: any;
}

// Classe principal da aplicação
class LabelDesignerApp {
  private settings: Settings | null = null;
  private currentTemplate: Template | null = null;
  private selectedElement: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
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

  private async loadSettings(): Promise<void> {
    try {
      this.settings = await window.electronAPI.getSettings();
      
      // Aplicar configurações na UI
      const protocolSelect = document.getElementById('selectProtocol') as HTMLSelectElement;
      const printerSelect = document.getElementById('selectPrinter') as HTMLSelectElement;
      const widthInput = document.getElementById('labelWidth') as HTMLInputElement;
      const heightInput = document.getElementById('labelHeight') as HTMLInputElement;
      
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

  private async loadPrinters(): Promise<void> {
    try {
      const printers = await window.electronAPI.getPrinters();
      const printerSelect = document.getElementById('selectPrinter') as HTMLSelectElement;
      
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

  private setupEventListeners(): void {
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
        (modal as HTMLElement).style.display = 'none';
      });
    });
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('modal')) {
        target.style.display = 'none';
      }
    });
  }

  private setupIPCListeners(): void {
    window.electronAPI.onNewLabel(() => this.newLabel());
    window.electronAPI.onOpenTemplate(() => this.showTemplates());
    window.electronAPI.onShowAbout(() => this.showAbout());
  }

  private newLabel(): void {
    // Limpar canvas
    const canvas = document.getElementById('labelCanvas');
    if (canvas) {
      canvas.innerHTML = '';
    }
    
    // Resetar para tamanho padrão
    const widthInput = document.getElementById('labelWidth') as HTMLInputElement;
    const heightInput = document.getElementById('labelHeight') as HTMLInputElement;
    widthInput.value = '100';
    heightInput.value = '50';
    
    this.updateCanvasSize();
    this.updateCodePreview();
  }

  private async saveTemplate(): Promise<void> {
    const name = prompt('Nome do template:');
    if (!name) return;
    
    const description = prompt('Descrição (opcional):');
    
    const elements = this.getCanvasElements();
    const widthInput = document.getElementById('labelWidth') as HTMLInputElement;
    const heightInput = document.getElementById('labelHeight') as HTMLInputElement;
    
    const template: Template = {
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

  private async showTemplates(): Promise<void> {
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

  private createTemplateItem(template: Template): HTMLElement {
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

  public async loadTemplate(templateId: string): Promise<void> {
    try {
      const templates = await window.electronAPI.getTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        alert('Template não encontrado');
        return;
      }
      
      // Aplicar tamanho da etiqueta
      const widthInput = document.getElementById('labelWidth') as HTMLInputElement;
      const heightInput = document.getElementById('labelHeight') as HTMLInputElement;
      widthInput.value = template.labelSize.width.toString();
      heightInput.value = template.labelSize.height.toString();
      this.updateCanvasSize();
      
      // Limpar canvas
      const canvas = document.getElementById('labelCanvas');
      if (!canvas) return;
      canvas.innerHTML = '';
      
      // Recriar elementos
      template.elements.forEach(element => {
        this.recreateElement(element);
      });
      
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

  public async deleteTemplate(templateId: string): Promise<void> {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;
    
    try {
      await window.electronAPI.deleteTemplate(templateId);
      this.showTemplates(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      alert('Erro ao excluir template');
    }
  }

  private showAbout(): void {
    const modal = document.getElementById('aboutModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  private updateCanvasSize(): void {
    const canvas = document.getElementById('labelCanvas') as HTMLElement;
    const widthInput = document.getElementById('labelWidth') as HTMLInputElement;
    const heightInput = document.getElementById('labelHeight') as HTMLInputElement;
    const orientationSelect = document.getElementById('labelOrientation') as HTMLSelectElement;
    
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

  private addElement(type: string): void {
    // Implementação será adicionada no arquivo label-designer.ts
    if (window.labelDesigner) {
      window.labelDesigner.addElement(type);
    }
  }

  private getCanvasElements(): LabelElement[] {
    // Implementação será adicionada no arquivo label-designer.ts
    if (window.labelDesigner) {
      return window.labelDesigner.getElements();
    }
    return [];
  }

  private recreateElement(element: LabelElement): void {
    // Implementação será adicionada no arquivo label-designer.ts
    if (window.labelDesigner) {
      window.labelDesigner.recreateElement(element);
    }
  }

  private print(): void {
    const printerSelect = document.getElementById('selectPrinter') as HTMLSelectElement;
    
    if (!printerSelect.value) {
      alert('Por favor, selecione uma impressora');
      return;
    }
    
    // Implementação da impressão será adicionada posteriormente
    alert('Funcionalidade de impressão será implementada em breve');
  }

  private copyCode(): void {
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

  private updateCodePreview(): void {
    // Implementação será adicionada no arquivo protocols.ts
    if (window.protocolGenerator) {
      window.protocolGenerator.updatePreview();
    }
  }
}

// Declarar instância global
declare global {
  interface Window {
    app: LabelDesignerApp;
    labelDesigner: any;
    protocolGenerator: any;
  }
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LabelDesignerApp();
});
