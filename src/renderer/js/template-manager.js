export class TemplateManager {
  static instance;
  templates = [];
  categories = new Set();
  tags = new Set();

  constructor() {
    this.loadTemplates();
  }

  static getInstance() {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  /**
   * Carrega templates do armazenamento
   */
  async loadTemplates() {
    try {
      const templates = await window.electronAPI.getTemplates();
      this.templates = templates;
      
      // Atualizar categorias e tags
      this.updateMetadata();
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      this.templates = [];
    }
  }

  /**
   * Atualiza metadados dos templates
   */
  updateMetadata() {
    this.categories.clear();
    this.tags.clear();

    this.templates.forEach(template => {
      if (template.category) {
        this.categories.add(template.category);
      }
      template.tags?.forEach(tag => {
        this.tags.add(tag);
      });
    });
  }

  /**
   * Salva um novo template
   */
  async saveTemplate(template) {
    const newTemplate = {
      ...template,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      useCount: 0,
      version: 1
    };

    try {
      await window.electronAPI.saveTemplate(newTemplate);
      this.templates.push(newTemplate);
      this.updateMetadata();
      return newTemplate;
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      throw error;
    }
  }

  /**
   * Atualiza um template existente
   */
  async updateTemplate(id, updates) {
    const template = this.templates.find(t => t.id === id);
    if (!template) {
      throw new Error('Template não encontrado');
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: (template.version || 1) + 1
    };

    try {
      await window.electronAPI.saveTemplate(updatedTemplate);
      const index = this.templates.findIndex(t => t.id === id);
      this.templates[index] = updatedTemplate;
      this.updateMetadata();
      return updatedTemplate;
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      throw error;
    }
  }

  /**
   * Exclui um template
   */
  async deleteTemplate(id) {
    try {
      await window.electronAPI.deleteTemplate(id);
      this.templates = this.templates.filter(t => t.id !== id);
      this.updateMetadata();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      throw error;
    }
  }

  /**
   * Registra uso do template
   */
  async registerTemplateUse(id) {
    const template = this.templates.find(t => t.id === id);
    if (!template) return;

    await this.updateTemplate(id, {
      lastUsed: new Date().toISOString(),
      useCount: (template.useCount || 0) + 1
    });
  }

  /**
   * Busca templates com filtros
   */
  searchTemplates(filter = {}) {
    let results = [...this.templates];

    // Filtrar por texto
    if (filter.search) {
      const search = filter.search.toLowerCase();
      results = results.filter(template => 
        template.name.toLowerCase().includes(search) ||
        template.description?.toLowerCase().includes(search) ||
        template.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Filtrar por categoria
    if (filter.category) {
      results = results.filter(template => 
        template.category === filter.category
      );
    }

    // Filtrar por tags
    if (filter.tags?.length) {
      results = results.filter(template =>
        filter.tags.every(tag => template.tags?.includes(tag))
      );
    }

    // Ordenar resultados
    if (filter.sortBy) {
      results.sort((a, b) => {
        let valueA = a[filter.sortBy];
        let valueB = b[filter.sortBy];

        // Tratar valores undefined
        if (valueA === undefined) valueA = '';
        if (valueB === undefined) valueB = '';

        // Ordenar
        if (filter.sortOrder === 'desc') {
          return valueB.localeCompare(valueA);
        }
        return valueA.localeCompare(valueB);
      });
    }

    return results;
  }

  /**
   * Retorna todas as categorias
   */
  getCategories() {
    return Array.from(this.categories).sort();
  }

  /**
   * Retorna todas as tags
   */
  getTags() {
    return Array.from(this.tags).sort();
  }

  /**
   * Duplica um template
   */
  async duplicateTemplate(id, newName) {
    const template = this.templates.find(t => t.id === id);
    if (!template) {
      throw new Error('Template não encontrado');
    }

    const duplicated = {
      ...template,
      name: newName || `${template.name} (Cópia)`,
      useCount: 0,
      lastUsed: undefined,
      version: 1
    };

    return this.saveTemplate(duplicated);
  }

  /**
   * Define um template como padrão
   */
  async setDefaultTemplate(id) {
    // Remover flag de padrão de outros templates
    for (const template of this.templates) {
      if (template.isDefault && template.id !== id) {
        await this.updateTemplate(template.id, { isDefault: false });
      }
    }

    // Definir novo template padrão
    if (id) {
      await this.updateTemplate(id, { isDefault: true });
    }
  }

  /**
   * Retorna o template padrão
   */
  getDefaultTemplate() {
    return this.templates.find(t => t.isDefault);
  }

  /**
   * Exporta templates selecionados
   */
  exportTemplates(ids) {
    const templates = this.templates.filter(t => ids.includes(t.id));
    return JSON.stringify(templates, null, 2);
  }

  /**
   * Importa templates
   */
  async importTemplates(jsonData) {
    try {
      const templates = JSON.parse(jsonData);
      const imported = [];

      for (const template of templates) {
        // Gerar novo ID e timestamps
        const newTemplate = await this.saveTemplate({
          ...template,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined
        });
        imported.push(newTemplate);
      }

      return imported;
    } catch (error) {
      console.error('Erro ao importar templates:', error);
      throw new Error('Arquivo de templates inválido');
    }
  }

  /**
   * Valida um template
   */
  validateTemplate(template) {
    const errors = [];

    if (!template.name?.trim()) {
      errors.push('Nome é obrigatório');
    }

    if (!template.labelSize?.width || !template.labelSize?.height) {
      errors.push('Dimensões da etiqueta são obrigatórias');
    }

    if (!template.elements?.length) {
      errors.push('Template deve conter pelo menos um elemento');
    }

    return errors;
  }
}