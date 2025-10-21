import { DesignerElement } from './label-designer';

export interface Template {
  id: string;
  name: string;
  description?: string;
  category?: string;
  labelSize: {
    width: number;
    height: number;
  };
  elements: DesignerElement[];
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  useCount?: number;
  tags?: string[];
  isDefault?: boolean;
  version?: number;
}

export interface TemplateFilter {
  search?: string;
  category?: string;
  tags?: string[];
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastUsed' | 'useCount';
  sortOrder?: 'asc' | 'desc';
}

export class TemplateManager {
  private static instance: TemplateManager;
  private templates: Template[] = [];
  private categories: Set<string> = new Set();
  private tags: Set<string> = new Set();

  private constructor() {
    this.loadTemplates();
  }

  static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  /**
   * Carrega templates do armazenamento
   */
  private async loadTemplates(): Promise<void> {
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
  private updateMetadata(): void {
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
  async saveTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
    const newTemplate: Template = {
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
  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    const template = this.templates.find(t => t.id === id);
    if (!template) {
      throw new Error('Template não encontrado');
    }

    const updatedTemplate: Template = {
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
  async deleteTemplate(id: string): Promise<void> {
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
  async registerTemplateUse(id: string): Promise<void> {
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
  searchTemplates(filter: TemplateFilter = {}): Template[] {
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
        filter.tags?.every(tag => template.tags?.includes(tag))
      );
    }

    // Ordenar resultados
    if (filter.sortBy) {
      results.sort((a, b) => {
        let valueA: any = a[filter.sortBy!];
        let valueB: any = b[filter.sortBy!];

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
  getCategories(): string[] {
    return Array.from(this.categories).sort();
  }

  /**
   * Retorna todas as tags
   */
  getTags(): string[] {
    return Array.from(this.tags).sort();
  }

  /**
   * Duplica um template
   */
  async duplicateTemplate(id: string, newName?: string): Promise<Template> {
    const template = this.templates.find(t => t.id === id);
    if (!template) {
      throw new Error('Template não encontrado');
    }

    const duplicated: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> = {
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
  async setDefaultTemplate(id: string): Promise<void> {
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
  getDefaultTemplate(): Template | undefined {
    return this.templates.find(t => t.isDefault);
  }

  /**
   * Exporta templates selecionados
   */
  exportTemplates(ids: string[]): string {
    const templates = this.templates.filter(t => ids.includes(t.id));
    return JSON.stringify(templates, null, 2);
  }

  /**
   * Importa templates
   */
  async importTemplates(jsonData: string): Promise<Template[]> {
    try {
      const templates: Template[] = JSON.parse(jsonData);
      const imported: Template[] = [];

      for (const template of templates) {
        // Gerar novo ID e timestamps
        const newTemplate = await this.saveTemplate({
          ...template,
          id: undefined as any,
          createdAt: undefined as any,
          updatedAt: undefined as any
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
  validateTemplate(template: Partial<Template>): string[] {
    const errors: string[] = [];

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
