// TemplateManager será carregado antes deste arquivo
class TemplateUI {
  manager;
  modal;
  templateList;
  searchInput;
  categorySelect;
  sortSelect;
  tagContainer;
  selectedTags = new Set();

  constructor() {
    this.manager = TemplateManager.getInstance();
    this.modal = document.getElementById('templateModal');
    this.templateList = document.getElementById('templateList');
    this.searchInput = document.getElementById('templateSearch');
    this.categorySelect = document.getElementById('templateCategory');
    this.sortSelect = document.getElementById('templateSort');
    this.tagContainer = document.getElementById('templateTags');

    this.setupEventListeners();
    this.setupFilterControls();
  }

  setupEventListeners() {
    // Busca
    this.searchInput.addEventListener('input', () => this.updateTemplateList());
    
    // Categoria
    this.categorySelect.addEventListener('change', () => this.updateTemplateList());
    
    // Ordenação
    this.sortSelect.addEventListener('change', () => this.updateTemplateList());
    
    // Botões do modal
    document.getElementById('btnNewTemplate')?.addEventListener('click', () => this.showNewTemplateForm());
    document.getElementById('btnImportTemplate')?.addEventListener('click', () => this.showImportDialog());
    
    // Fechar modal
    const closeButtons = this.modal.querySelectorAll('.close-btn');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.hideModal());
    });
  }

  setupFilterControls() {
    // Preencher categorias
    const categories = this.manager.getCategories();
    this.categorySelect.innerHTML = '<option value="">Todas as Categorias</option>';
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      this.categorySelect.appendChild(option);
    });

    // Preencher tags
    const tags = this.manager.getTags();
    this.tagContainer.innerHTML = '';
    tags.forEach(tag => {
      const chip = document.createElement('div');
      chip.className = 'tag-chip';
      chip.textContent = tag;
      chip.addEventListener('click', () => this.toggleTag(tag));
      this.tagContainer.appendChild(chip);
    });
  }

  toggleTag(tag) {
    const chips = this.tagContainer.querySelectorAll('.tag-chip');
    const chip = Array.from(chips).find(chip => chip.textContent === tag);
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
      chip?.classList.remove('selected');
    } else {
      this.selectedTags.add(tag);
      chip?.classList.add('selected');
    }
    this.updateTemplateList();
  }

  async updateTemplateList() {
    const filter = {
      search: this.searchInput.value,
      category: this.categorySelect.value,
      tags: Array.from(this.selectedTags),
      sortBy: this.sortSelect.value,
      sortOrder: 'asc'
    };

    const templates = this.manager.searchTemplates(filter);
    this.renderTemplateList(templates);
  }

  renderTemplateList(templates) {
    this.templateList.innerHTML = '';

    if (templates.length === 0) {
      this.templateList.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/>
            <path d="M12 8v8M8 12h8" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>Nenhum template encontrado</p>
          <button class="btn btn-primary" onclick="templateUI.showNewTemplateForm()">
            Criar Novo Template
          </button>
        </div>
      `;
      return;
    }

    templates.forEach(template => {
      const card = this.createTemplateCard(template);
      this.templateList.appendChild(card);
    });
  }

  createTemplateCard(template) {
    const card = document.createElement('div');
    card.className = 'template-card';
    if (template.isDefault) {
      card.classList.add('default');
    }

    card.innerHTML = `
      <div class="template-preview">
        <div class="preview-canvas" style="width: ${template.labelSize.width}mm; height: ${template.labelSize.height}mm;">
          ${this.renderPreviewElements(template.elements)}
        </div>
      </div>
      <div class="template-info">
        <h3>${template.name}</h3>
        ${template.description ? `<p>${template.description}</p>` : ''}
        <div class="template-meta">
          <span>${template.labelSize.width}x${template.labelSize.height}mm</span>
          <span>${template.elements.length} elementos</span>
          ${template.useCount ? `<span>${template.useCount} usos</span>` : ''}
        </div>
        ${template.tags?.length ? `
          <div class="template-tags">
            ${template.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="template-actions">
        <button class="btn btn-primary" onclick="templateUI.loadTemplate('${template.id}')">
          Usar Template
        </button>
        <div class="dropdown">
          <button class="btn btn-icon">⋮</button>
          <div class="dropdown-menu">
            <button onclick="templateUI.editTemplate('${template.id}')">Editar</button>
            <button onclick="templateUI.duplicateTemplate('${template.id}')">Duplicar</button>
            <button onclick="templateUI.exportTemplate('${template.id}')">Exportar</button>
            ${template.isDefault ? `
              <button onclick="templateUI.unsetDefaultTemplate('${template.id}')">Remover Padrão</button>
            ` : `
              <button onclick="templateUI.setDefaultTemplate('${template.id}')">Definir como Padrão</button>
            `}
            <button class="text-danger" onclick="templateUI.deleteTemplate('${template.id}')">Excluir</button>
          </div>
        </div>
      </div>
    `;

    return card;
  }

  renderPreviewElements(elements) {
    // Simplificado para preview
    return elements.map(element => {
      switch (element.type) {
        case 'text':
          return `<div class="preview-text" style="left: ${element.x}mm; top: ${element.y}mm;">${element.content}</div>`;
        case 'barcode':
        case 'qrcode':
          return `<div class="preview-code" style="left: ${element.x}mm; top: ${element.y}mm;">[${element.type}]</div>`;
        case 'line':
          return `<div class="preview-line" style="left: ${element.x}mm; top: ${element.y}mm;"></div>`;
        case 'rectangle':
          return `<div class="preview-rect" style="left: ${element.x}mm; top: ${element.y}mm;"></div>`;
        default:
          return '';
      }
    }).join('');
  }

  showModal() {
    this.updateTemplateList();
    this.modal.style.display = 'flex';
  }

  hideModal() {
    this.modal.style.display = 'none';
  }

  async loadTemplate(id) {
    try {
      await this.manager.registerTemplateUse(id);
      const template = this.manager.searchTemplates().find(t => t.id === id);
      if (template && window.labelDesigner) {
        window.labelDesigner.loadElements(template.elements);
        this.hideModal();
      }
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      alert('Erro ao carregar template');
    }
  }

  async showNewTemplateForm() {
    const name = prompt('Nome do template:');
    if (!name) return;

    const description = prompt('Descrição (opcional):');
    const category = prompt('Categoria (opcional):');
    const tagsInput = prompt('Tags (separadas por vírgula):');
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];

    if (window.labelDesigner) {
      const elements = window.labelDesigner.getElements();
      const labelSize = {
        width: parseInt(document.getElementById('labelWidth')?.value || '100'),
        height: parseInt(document.getElementById('labelHeight')?.value || '50')
      };

      try {
        await this.manager.saveTemplate({
          name,
          description,
          category,
          tags,
          elements,
          labelSize
        });
        this.updateTemplateList();
      } catch (error) {
        console.error('Erro ao salvar template:', error);
        alert('Erro ao salvar template');
      }
    }
  }

  async editTemplate(id) {
    const template = this.manager.searchTemplates().find(t => t.id === id);
    if (!template) return;

    const name = prompt('Nome do template:', template.name);
    if (!name) return;

    const description = prompt('Descrição:', template.description || '');
    const category = prompt('Categoria:', template.category || '');
    const tagsInput = prompt('Tags (separadas por vírgula):', template.tags?.join(', ') || '');
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];

    try {
      await this.manager.updateTemplate(id, {
        name,
        description,
        category,
        tags
      });
      this.updateTemplateList();
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      alert('Erro ao atualizar template');
    }
  }

  async duplicateTemplate(id) {
    const name = prompt('Nome do novo template:');
    if (!name) return;

    try {
      await this.manager.duplicateTemplate(id, name);
      this.updateTemplateList();
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
      alert('Erro ao duplicar template');
    }
  }

  async deleteTemplate(id) {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      await this.manager.deleteTemplate(id);
      this.updateTemplateList();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      alert('Erro ao excluir template');
    }
  }

  async setDefaultTemplate(id) {
    try {
      await this.manager.setDefaultTemplate(id);
      this.updateTemplateList();
    } catch (error) {
      console.error('Erro ao definir template padrão:', error);
      alert('Erro ao definir template padrão');
    }
  }

  async unsetDefaultTemplate(id) {
    try {
      await this.manager.setDefaultTemplate('');
      this.updateTemplateList();
    } catch (error) {
      console.error('Erro ao remover template padrão:', error);
      alert('Erro ao remover template padrão');
    }
  }

  exportTemplate(id) {
    const template = this.manager.searchTemplates().find(t => t.id === id);
    if (!template) return;

    const json = this.manager.exportTemplates([id]);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async showImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const json = e.target?.result;
          await this.manager.importTemplates(json);
          this.updateTemplateList();
          alert('Templates importados com sucesso!');
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('Erro ao importar templates:', error);
        alert('Erro ao importar templates');
      }
    };

    input.click();
  }
}

// Inicializar UI quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.templateUI = new TemplateUI();
});

module.exports = { TemplateUI };
