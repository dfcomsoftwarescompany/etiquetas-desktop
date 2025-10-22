// BarcodeGenerator será carregado antes deste arquivo
class LabelDesigner {
  canvas;
  selectedElement = null;
  elements = new Map();
  isDragging = false;
  isResizing = false;
  startX = 0;
  startY = 0;
  currentResizeHandle = '';
  gridSize = 5; // mm

  constructor() {
    this.canvas = document.getElementById('labelCanvas');
    this.setupEventListeners();
    this.setupGrid();
  }

  setupEventListeners() {
    // Canvas events
    this.canvas.addEventListener('mousedown', this.handleCanvasMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Prevent text selection while dragging
    this.canvas.addEventListener('selectstart', (e) => e.preventDefault());

    // Element property changes
    document.addEventListener('input', this.handlePropertyChange.bind(this));
  }

  setupGrid() {
    const grid = document.createElement('div');
    grid.className = 'design-grid';
    
    // Create grid lines
    for (let i = 0; i < this.canvas.clientWidth; i += this.gridSize) {
      const vLine = document.createElement('div');
      vLine.className = 'grid-line vertical';
      vLine.style.left = `${i}px`;
      grid.appendChild(vLine);
    }
    
    for (let i = 0; i < this.canvas.clientHeight; i += this.gridSize) {
      const hLine = document.createElement('div');
      hLine.className = 'grid-line horizontal';
      hLine.style.top = `${i}px`;
      grid.appendChild(hLine);
    }
    
    this.canvas.appendChild(grid);
  }

  handleCanvasMouseDown(e) {
    const target = e.target;
    
    if (target.classList.contains('resize-handle')) {
      this.startResizing(e, target);
    } else if (target.classList.contains('label-element')) {
      this.startDragging(e, target);
    } else {
      this.deselectAll();
    }
  }

  startDragging(e, element) {
    this.isDragging = true;
    this.selectedElement = element;
    this.deselectAll();
    element.classList.add('selected');
    
    const rect = element.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
    
    this.showElementProperties(element);
  }

  startResizing(e, handle) {
    this.isResizing = true;
    this.currentResizeHandle = handle.dataset.handle || '';
    this.selectedElement = handle.parentElement;
    
    const rect = this.selectedElement.getBoundingClientRect();
    this.startX = e.clientX;
    this.startY = e.clientY;
  }

  handleMouseMove(e) {
    if (!this.selectedElement) return;

    if (this.isDragging) {
      this.handleDragMove(e);
    } else if (this.isResizing) {
      this.handleResizeMove(e);
    }
  }

  handleDragMove(e) {
    if (!this.selectedElement || !this.isDragging) return;

    const canvasRect = this.canvas.getBoundingClientRect();
    let newX = e.clientX - canvasRect.left - this.startX;
    let newY = e.clientY - canvasRect.top - this.startY;

    // Snap to grid
    newX = Math.round(newX / this.gridSize) * this.gridSize;
    newY = Math.round(newY / this.gridSize) * this.gridSize;

    // Keep element within canvas bounds
    newX = Math.max(0, Math.min(newX, canvasRect.width - this.selectedElement.offsetWidth));
    newY = Math.max(0, Math.min(newY, canvasRect.height - this.selectedElement.offsetHeight));

    this.selectedElement.style.left = `${newX}px`;
    this.selectedElement.style.top = `${newY}px`;

    this.updateElementData(this.selectedElement);
    this.updatePreview();
  }

  handleResizeMove(e) {
    if (!this.selectedElement || !this.isResizing) return;

    const rect = this.selectedElement.getBoundingClientRect();
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;

    let newWidth = rect.width;
    let newHeight = rect.height;
    let newX = parseInt(this.selectedElement.style.left);
    let newY = parseInt(this.selectedElement.style.top);

    switch (this.currentResizeHandle) {
      case 'nw':
        newWidth -= deltaX;
        newHeight -= deltaY;
        newX += deltaX;
        newY += deltaY;
        break;
      case 'ne':
        newWidth += deltaX;
        newHeight -= deltaY;
        newY += deltaY;
        break;
      case 'sw':
        newWidth -= deltaX;
        newHeight += deltaY;
        newX += deltaX;
        break;
      case 'se':
        newWidth += deltaX;
        newHeight += deltaY;
        break;
    }

    // Snap to grid
    newWidth = Math.round(newWidth / this.gridSize) * this.gridSize;
    newHeight = Math.round(newHeight / this.gridSize) * this.gridSize;
    newX = Math.round(newX / this.gridSize) * this.gridSize;
    newY = Math.round(newY / this.gridSize) * this.gridSize;

    // Minimum size
    newWidth = Math.max(this.gridSize, newWidth);
    newHeight = Math.max(this.gridSize, newHeight);

    this.selectedElement.style.width = `${newWidth}px`;
    this.selectedElement.style.height = `${newHeight}px`;
    this.selectedElement.style.left = `${newX}px`;
    this.selectedElement.style.top = `${newY}px`;

    this.startX = e.clientX;
    this.startY = e.clientY;

    this.updateElementData(this.selectedElement);
    this.updatePreview();
  }

  handleMouseUp() {
    this.isDragging = false;
    this.isResizing = false;
    this.currentResizeHandle = '';
  }

  handlePropertyChange(e) {
    const target = e.target;
    if (!target.dataset.property || !this.selectedElement) return;

    const elementId = this.selectedElement.dataset.id;
    if (!elementId) return;

    const element = this.elements.get(elementId);
    if (!element) return;

    const property = target.dataset.property;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    switch (property) {
      case 'content':
        element.content = value;
        this.selectedElement.textContent = value;
        break;
      case 'fontSize':
        element.fontSize = parseInt(value);
        this.selectedElement.style.fontSize = `${value}px`;
        break;
      case 'fontFamily':
        element.fontFamily = value;
        this.selectedElement.style.fontFamily = value;
        break;
      case 'rotation':
        element.rotation = parseInt(value);
        this.selectedElement.style.transform = `rotate(${value}deg)`;
        break;
      case 'barcodeType':
        element.barcodeType = value;
        break;
      case 'humanReadable':
        element.humanReadable = value;
        break;
      case 'thickness':
        element.thickness = parseInt(value);
        if (element.type === 'line' || element.type === 'rectangle') {
          this.selectedElement.style.borderWidth = `${value}px`;
        }
        break;
    }

    this.updatePreview();
  }

  addElement(type) {
    const element = {
      id: Date.now().toString(),
      type: type,
      x: 10,
      y: 10,
      width: 100,
      height: type === 'line' ? 2 : 50,
      content: type === 'text' ? 'Texto' : '12345',
      rotation: 0
    };

    this.elements.set(element.id, element);
    this.createElementNode(element);
    this.updatePreview();
  }

  createElementNode(element) {
    const node = document.createElement('div');
    node.className = `label-element ${element.type}`;
    node.dataset.id = element.id;
    node.style.left = `${element.x}px`;
    node.style.top = `${element.y}px`;
    node.style.width = `${element.width}px`;
    node.style.height = `${element.height}px`;

    // Add resize handles
    ['nw', 'ne', 'sw', 'se'].forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${pos}`;
      handle.dataset.handle = pos;
      node.appendChild(handle);
    });

    switch (element.type) {
      case 'text':
        node.textContent = element.content || '';
        node.style.fontSize = `${element.fontSize || 16}px`;
        node.style.fontFamily = element.fontFamily || 'Arial';
        break;

      case 'barcode':
        node.innerHTML = `<div class="preview-placeholder">BARCODE</div>`;
        if (element.content) {
          BarcodeGenerator.updateBarcodePreview(
            node,
            element.content,
            element.barcodeType || 'CODE128',
            {
              width: 2,
              height: element.height || 100,
              displayValue: element.humanReadable || true,
              fontSize: element.fontSize || 16
            }
          );
        }
        break;

      case 'qrcode':
        node.innerHTML = `<div class="preview-placeholder">QR CODE</div>`;
        if (element.content) {
          BarcodeGenerator.updateQRCodePreview(
            node,
            element.content,
            {
              width: element.width || 200,
              margin: 0,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            }
          );
        }
        break;

      case 'line':
        node.style.height = '2px';
        node.style.backgroundColor = '#000';
        break;

      case 'rectangle':
        node.style.border = '2px solid #000';
        node.style.backgroundColor = 'transparent';
        break;
    }

    this.canvas.appendChild(node);
    this.selectElement(node);
  }

  selectElement(element) {
    this.deselectAll();
    element.classList.add('selected');
    this.selectedElement = element;
    this.showElementProperties(element);
  }

  deselectAll() {
    const elements = this.canvas.querySelectorAll('.label-element');
    elements.forEach(el => el.classList.remove('selected'));
    this.hideElementProperties();
  }

  showElementProperties(element) {
    const elementId = element.dataset.id;
    if (!elementId) return;

    const elementData = this.elements.get(elementId);
    if (!elementData) return;

    const propertiesPanel = document.getElementById('elementProperties');
    const propertiesContent = document.getElementById('propertiesContent');
    if (!propertiesPanel || !propertiesContent) return;

    let html = '';
    
    switch (elementData.type) {
      case 'text':
        html = `
          <div class="form-group">
            <label>Texto</label>
            <input type="text" class="input" value="${elementData.content || ''}" data-property="content">
          </div>
          <div class="form-group">
            <label>Tamanho da Fonte</label>
            <input type="number" class="input" value="${elementData.fontSize || 16}" data-property="fontSize">
          </div>
          <div class="form-group">
            <label>Fonte</label>
            <select class="select" data-property="fontFamily">
              <option value="Arial" ${elementData.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
              <option value="Times New Roman" ${elementData.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
              <option value="Courier New" ${elementData.fontFamily === 'Courier New' ? 'selected' : ''}>Courier New</option>
            </select>
          </div>
        `;
        break;

      case 'barcode':
        const specs = BarcodeGenerator.getBarcodeSpecs(elementData.barcodeType || 'CODE128');
        html = `
          <div class="form-group">
            <label>Código</label>
            <input type="text" class="input" value="${elementData.content || ''}" data-property="content">
            <small class="help-text">Exemplo: ${specs.example}</small>
            <small class="help-text">Padrão: ${specs.pattern}</small>
          </div>
          <div class="form-group">
            <label>Tipo</label>
            <select class="select" data-property="barcodeType">
              <option value="CODE128" ${elementData.barcodeType === 'CODE128' ? 'selected' : ''}>CODE 128 - Alfanumérico</option>
              <option value="CODE39" ${elementData.barcodeType === 'CODE39' ? 'selected' : ''}>CODE 39 - Alfanumérico</option>
              <option value="EAN13" ${elementData.barcodeType === 'EAN13' ? 'selected' : ''}>EAN-13 - 13 dígitos</option>
              <option value="EAN8" ${elementData.barcodeType === 'EAN8' ? 'selected' : ''}>EAN-8 - 8 dígitos</option>
              <option value="UPCA" ${elementData.barcodeType === 'UPCA' ? 'selected' : ''}>UPC-A - 12 dígitos</option>
              <option value="UPCE" ${elementData.barcodeType === 'UPCE' ? 'selected' : ''}>UPC-E - 8 dígitos</option>
              <option value="ITF" ${elementData.barcodeType === 'ITF' ? 'selected' : ''}>ITF - Numérico</option>
              <option value="CODABAR" ${elementData.barcodeType === 'CODABAR' ? 'selected' : ''}>CODABAR - Especial</option>
            </select>
            <small class="help-text">${specs.description}</small>
          </div>
          <div class="form-group">
            <label>Altura (mm)</label>
            <input type="number" class="input" value="${elementData.height || 100}" min="10" max="200" data-property="height">
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" ${elementData.humanReadable ? 'checked' : ''} data-property="humanReadable">
              Texto Legível
            </label>
          </div>
          <div class="form-group">
            <label>Tamanho do Texto</label>
            <input type="number" class="input" value="${elementData.fontSize || 16}" min="8" max="32" data-property="fontSize">
          </div>
        `;
        break;

      case 'qrcode':
        html = `
          <div class="form-group">
            <label>Conteúdo</label>
            <input type="text" class="input" value="${elementData.content || ''}" data-property="content">
            <small class="help-text">Pode incluir texto, URLs, contatos, etc.</small>
          </div>
          <div class="form-group">
            <label>Tamanho (mm)</label>
            <input type="number" class="input" value="${elementData.width || 200}" min="50" max="400" data-property="width">
          </div>
          <div class="form-group">
            <label>Correção de Erros</label>
            <select class="select" data-property="errorCorrection">
              <option value="L">Baixa (7%)</option>
              <option value="M" selected>Média (15%)</option>
              <option value="Q">Alta (25%)</option>
              <option value="H">Máxima (30%)</option>
            </select>
            <small class="help-text">Maior correção = mais resistente a danos</small>
          </div>
        `;
        break;

      case 'line':
      case 'rectangle':
        html = `
          <div class="form-group">
            <label>Espessura</label>
            <input type="number" class="input" value="${elementData.thickness || 1}" data-property="thickness">
          </div>
        `;
        break;
    }

    // Rotação (comum para todos os elementos)
    html += `
      <div class="form-group">
        <label>Rotação</label>
        <select class="select" data-property="rotation">
          <option value="0" ${elementData.rotation === 0 ? 'selected' : ''}>0°</option>
          <option value="90" ${elementData.rotation === 90 ? 'selected' : ''}>90°</option>
          <option value="180" ${elementData.rotation === 180 ? 'selected' : ''}>180°</option>
          <option value="270" ${elementData.rotation === 270 ? 'selected' : ''}>270°</option>
        </select>
      </div>
      <button class="btn btn-danger btn-block" onclick="window.labelDesigner.deleteElement('${elementId}')">
        Excluir Elemento
      </button>
    `;

    propertiesContent.innerHTML = html;
    propertiesPanel.style.display = 'block';
  }

  hideElementProperties() {
    const panel = document.getElementById('elementProperties');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  deleteElement(elementId) {
    const element = this.canvas.querySelector(`[data-id="${elementId}"]`);
    if (element) {
      element.remove();
      this.elements.delete(elementId);
      this.hideElementProperties();
      this.updatePreview();
    }
  }

  updateElementData(element) {
    const elementId = element.dataset.id;
    if (!elementId) return;

    const data = this.elements.get(elementId);
    if (!data) return;

    const rect = element.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();

    data.x = rect.left - canvasRect.left;
    data.y = rect.top - canvasRect.top;
    data.width = rect.width;
    data.height = rect.height;
  }

  getElements() {
    return Array.from(this.elements.values());
  }

  loadElements(elements) {
    // Limpar canvas
    this.canvas.innerHTML = '';
    this.elements.clear();

    // Recriar elementos
    elements.forEach(element => {
      this.elements.set(element.id, element);
      this.createElementNode(element);
    });

    this.updatePreview();
  }

  updatePreview() {
    // Atualizar preview do código
    if (window.app) {
      window.app.updateCodePreview();
    }
  }
}

// Inicializar designer quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.labelDesigner = new LabelDesigner();
});
