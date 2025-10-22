// As bibliotecas JsBarcode e QRCode serão carregadas via CDN no HTML
class BarcodeGenerator {
  static validateBarcode(type, value) {
    switch (type) {
      case 'EAN13':
        return /^\d{13}$/.test(value);
      
      case 'EAN8':
        return /^\d{8}$/.test(value);
      
      case 'UPCA':
        return /^\d{12}$/.test(value);
      
      case 'UPCE':
        return /^\d{6}$/.test(value);
      
      case 'CODE39':
        return /^[A-Z0-9\-\.\ \$\/\+\%]+$/.test(value);
      
      case 'CODE128':
        // CODE128 aceita qualquer caractere ASCII
        return value.length > 0;
      
      case 'ITF':
        return /^\d+$/.test(value) && value.length % 2 === 0;
      
      case 'CODABAR':
        return /^[A-D][0-9\-\$\:\/\.\+]+[A-D]$/.test(value);
      
      default:
        return true;
    }
  }

  static calculateCheckDigit(type, value) {
    switch (type) {
      case 'EAN13':
        return this.calculateEAN13CheckDigit(value);
      
      case 'EAN8':
        return this.calculateEAN8CheckDigit(value);
      
      case 'UPCA':
        return this.calculateUPCACheckDigit(value);
      
      default:
        return value;
    }
  }

  static calculateEAN13CheckDigit(value) {
    if (value.length !== 12) return value;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(value[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return value + checkDigit;
  }

  static calculateEAN8CheckDigit(value) {
    if (value.length !== 7) return value;
    
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(value[i]) * (i % 2 === 0 ? 3 : 1);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return value + checkDigit;
  }

  static calculateUPCACheckDigit(value) {
    if (value.length !== 11) return value;
    
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(value[i]) * (i % 2 === 0 ? 3 : 1);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return value + checkDigit;
  }

  /**
   * Gera um código de barras como SVG
   */
  static async generateBarcode(value, type, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Validar o código
        if (!this.validateBarcode(type, value)) {
          throw new Error(`Código inválido para o tipo ${type}`);
        }

        // Calcular dígito verificador se necessário
        const finalValue = this.calculateCheckDigit(type, value);

        // Criar elemento SVG temporário
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        // Configurar opções padrão
        const defaultOptions = {
          width: 2,
          height: 100,
          displayValue: true,
          font: 'Arial',
          fontSize: 20,
          textMargin: 2,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
          ...options
        };

        // Gerar código de barras
        JsBarcode(svg, finalValue, {
          format: type,
          ...defaultOptions
        });

        // Converter para string
        const svgString = new XMLSerializer().serializeToString(svg);
        resolve(svgString);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Gera um QR Code como SVG
   */
  static async generateQRCode(value, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Configurar opções padrão
        const defaultOptions = {
          width: 200,
          margin: 4,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M',
          ...options
        };

        // Gerar QR Code
        QRCode.toString(value, {
          type: 'svg',
          ...defaultOptions
        }, (error, string) => {
          if (error) {
            reject(error);
          } else {
            resolve(string);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Atualiza a visualização de um elemento de código de barras
   */
  static async updateBarcodePreview(element, value, type, options = {}) {
    try {
      const svg = await this.generateBarcode(value, type, options);
      
      // Guardar os resize handles antes de substituir o conteúdo
      const handles = Array.from(element.querySelectorAll('.resize-handle'));
      
      // Criar container para o SVG
      const container = document.createElement('div');
      container.className = 'barcode-container';
      container.innerHTML = svg;
      
      // Limpar apenas o conteúdo, não os handles
      const existingContainer = element.querySelector('.barcode-container, .preview-placeholder');
      if (existingContainer) {
        existingContainer.remove();
      }
      
      // Adicionar o novo container antes dos handles
      element.insertBefore(container, element.firstChild);
      
      // Ajustar SVG para caber no elemento
      const svgElement = container.querySelector('svg');
      if (svgElement) {
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
        svgElement.style.pointerEvents = 'none'; // Permitir cliques no elemento pai
      }
    } catch (error) {
      console.error('Erro ao gerar código de barras:', error);
      const existingContainer = element.querySelector('.barcode-container, .preview-placeholder');
      if (existingContainer) {
        existingContainer.innerHTML = `<div class="preview-placeholder">Erro: ${error.message}</div>`;
      } else {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'preview-placeholder';
        errorDiv.textContent = `Erro: ${error.message}`;
        element.insertBefore(errorDiv, element.firstChild);
      }
    }
  }

  /**
   * Atualiza a visualização de um elemento QR Code
   */
  static async updateQRCodePreview(element, value, options = {}) {
    try {
      const svg = await this.generateQRCode(value, options);
      
      // Criar container para o SVG
      const container = document.createElement('div');
      container.className = 'qrcode-container';
      container.innerHTML = svg;
      
      // Limpar apenas o conteúdo, não os handles
      const existingContainer = element.querySelector('.qrcode-container, .preview-placeholder');
      if (existingContainer) {
        existingContainer.remove();
      }
      
      // Adicionar o novo container antes dos handles
      element.insertBefore(container, element.firstChild);
      
      // Ajustar SVG para caber no elemento
      const svgElement = container.querySelector('svg');
      if (svgElement) {
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
        svgElement.style.pointerEvents = 'none'; // Permitir cliques no elemento pai
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      const existingContainer = element.querySelector('.qrcode-container, .preview-placeholder');
      if (existingContainer) {
        existingContainer.innerHTML = `<div class="preview-placeholder">Erro: ${error.message}</div>`;
      } else {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'preview-placeholder';
        errorDiv.textContent = `Erro: ${error.message}`;
        element.insertBefore(errorDiv, element.firstChild);
      }
    }
  }

  /**
   * Retorna as especificações de um tipo de código de barras
   */
  static getBarcodeSpecs(type) {
    const specs = {
      'CODE128': {
        name: 'Code 128',
        description: 'Código de barras alfanumérico de alta densidade',
        example: 'ABC-123456',
        pattern: 'Qualquer caractere ASCII'
      },
      'CODE39': {
        name: 'Code 39',
        description: 'Código de barras alfanumérico',
        example: 'CODE-39',
        pattern: 'A-Z, 0-9, -, ., $, /, +, %, espaço'
      },
      'EAN13': {
        name: 'EAN-13',
        description: 'Código de barras para produtos (13 dígitos)',
        example: '5901234123457',
        pattern: '12 dígitos + 1 dígito verificador'
      },
      'EAN8': {
        name: 'EAN-8',
        description: 'Código de barras para produtos (8 dígitos)',
        example: '96385074',
        pattern: '7 dígitos + 1 dígito verificador'
      },
      'UPCA': {
        name: 'UPC-A',
        description: 'Código de barras para produtos EUA (12 dígitos)',
        example: '042100005264',
        pattern: '11 dígitos + 1 dígito verificador'
      },
      'UPCE': {
        name: 'UPC-E',
        description: 'Código de barras UPC compacto (8 dígitos)',
        example: '04252614',
        pattern: '6 dígitos + 1 dígito verificador'
      },
      'ITF': {
        name: 'ITF',
        description: 'Código de barras numérico (Interleaved 2 of 5)',
        example: '12345678',
        pattern: 'Número par de dígitos'
      },
      'CODABAR': {
        name: 'Codabar',
        description: 'Código de barras usado em bibliotecas e bancos de sangue',
        example: 'A12345B',
        pattern: 'Inicia e termina com A-D, contém 0-9, -, $, :, /, ., +'
      }
    };

    return specs[type] || {
      name: type,
      description: 'Tipo de código de barras desconhecido',
      example: '',
      pattern: ''
    };
  }
}

module.exports = { BarcodeGenerator };
