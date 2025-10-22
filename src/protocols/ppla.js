const { BasePrinterProtocol  } = require('./base-protocol.js');

class PPLAProtocol extends BasePrinterProtocol {
  constructor(config = {}) {
    super(config);
    this.buffer = '';
  }

  /**
   * Conecta à impressora
   */
  async connect() {
    try {
      this.port = new SerialPort({
        path: this.defaultConfig.port,
        baudRate: this.defaultConfig.baudRate,
        dataBits: this.defaultConfig.dataBits,
        stopBits: this.defaultConfig.stopBits,
        parity: this.defaultConfig.parity,
        rtscts: this.defaultConfig.rtscts
      });

      return new Promise((resolve, reject) => {
        this.port?.on('open', () => {
          this.initialize();
          resolve();
        });

        this.port?.on('error', (err) => {
          reject(err);
        });
      });
    } catch (error) {
      throw new Error(`Erro ao conectar à impressora: ${error}`);
    }
  }

  /**
   * Desconecta da impressora
   */
  async disconnect() {
    return new Promise((resolve, reject) => {
      this.port?.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.port = null;
          resolve();
        }
      });
    });
  }

  /**
   * Inicializa a impressora
   */
  initialize() {
    // Limpa buffer
    this.sendCommand('\x1B\x40');
    
    // Configura para PPLA
    this.sendCommand('I');
    
    // Define unidade para milímetros
    this.sendCommand('m');
  }

  /**
   * Define o tamanho da etiqueta
   */
  setLabelSize(width, height, gap = 3) {
    this.sendCommand(`c${width},${height},${gap}`);
  }

  /**
   * Define a velocidade de impressão (1-4)
   */
  setPrintSpeed(speed) {
    this.sendCommand(`S${speed}`);
  }

  /**
   * Define a densidade de impressão (0-15)
   */
  setPrintDensity(density) {
    if (density < 0 || density > 15) {
      throw new Error('Densidade deve estar entre 0 e 15');
    }
    this.sendCommand(`D${density}`);
  }

  /**
   * Adiciona texto
   */
  addText(text, position, font) {
    const { x, y } = position;
    const { name, width, height, rotation } = font;
    
    // Comando para texto
    // A{fonte},{rotação},{tamanhoX},{tamanhoY},{x},{y},"{texto}"
    this.sendCommand(`A${name},${rotation},${width},${height},${x},${y},"${text}"`);
  }

  /**
   * Adiciona código de barras
   */
  addBarcode(data, position, barcode) {
    const { x, y } = position;
    const { type, width, height, humanReadable, rotation } = barcode;
    
    // Comando para código de barras
    // B{tipo},{rotação},{largura},{altura},{legível},{x},{y},"{dados}"
    this.sendCommand(`B${type},${rotation},${width},${height},${humanReadable ? 1 : 0},${x},${y},"${data}"`);
  }

  /**
   * Adiciona QR Code
   */
  addQRCode(data, position, size = 5) {
    const { x, y } = position;
    
    // Comando para QR Code
    // W{tipo},{x},{y},{tamanho},"${dados}"
    this.sendCommand(`W1,${x},${y},${size},"${data}"`);
  }

  /**
   * Adiciona linha
   */
  addLine(start, end, thickness = 1) {
    // Comando para linha
    // La,{x1},{y1},{x2},{y2},{espessura}
    this.sendCommand(`La,${start.x},${start.y},${end.x},${end.y},${thickness}`);
  }

  /**
   * Adiciona retângulo
   */
  addRectangle(position, width, height, thickness = 1) {
    // Comando para retângulo
    // Lb,{x},{y},{largura},{altura},{espessura}
    this.sendCommand(`Lb,${position.x},${position.y},${width},${height},${thickness}`);
  }

  /**
   * Define a orientação da impressão
   */
  setOrientation(degrees) {
    this.sendCommand(`Z${degrees}`);
  }

  /**
   * Define a referência de origem
   */
  setReference(x, y) {
    this.sendCommand(`R${x},${y}`);
  }

  /**
   * Limpa o buffer de imagem
   */
  clearBuffer() {
    this.buffer = '';
    this.sendCommand('N');
  }

  /**
   * Imprime a etiqueta
   */
  print(copies = 1) {
    if (copies < 1) {
      throw new Error('Número de cópias deve ser maior que 0');
    }
    
    // Se não houver porta (modo preview), retorna o comando
    if (!this.port || !this.port.isOpen) {
      return this.buffer + `P${copies}\r\n`;
    }
    
    // Comando de impressão com número de cópias
    this.sendCommand(`P${copies}`);
  }

  /**
   * Envia comando para a impressora
   */
  sendCommand(command) {
    // Se não houver porta (modo preview), adiciona ao buffer
    if (!this.port || !this.port.isOpen) {
      if (!this.buffer) {
        this.buffer = '';
      }
      this.buffer += `${command}\r\n`;
      return;
    }

    // Adiciona quebra de linha ao final do comando
    const fullCommand = `${command}\r\n`;
    
    this.port.write(fullCommand, (err) => {
      if (err) {
        throw new Error(`Erro ao enviar comando: ${err}`);
      }
    });
  }

  /**
   * Gera preview do código PPLA
   */
  generatePreview(elements) {
    let preview = '';
    
    // Adiciona cabeçalho
    preview += 'I\n'; // Modo PPLA
    preview += 'm\n'; // Unidade: mm
    
    // Processa elementos
    elements.forEach(element => {
      switch (element.type) {
        case 'text':
          preview += `A${element.font || 'A'},${element.rotation || 0},${element.width || 1},${element.height || 1},${element.x},${element.y},"${element.content}"\n`;
          break;
          
        case 'barcode':
          preview += `B${element.barcodeType || 'CODE128'},${element.rotation || 0},${element.width || 2},${element.height || 10},${element.humanReadable ? 1 : 0},${element.x},${element.y},"${element.content}"\n`;
          break;
          
        case 'qrcode':
          preview += `W1,${element.x},${element.y},${element.size || 5},"${element.content}"\n`;
          break;
          
        case 'line':
          preview += `La,${element.x1},${element.y1},${element.x2},${element.y2},${element.thickness || 1}\n`;
          break;
          
        case 'rectangle':
          preview += `Lb,${element.x},${element.y},${element.width},${element.height},${element.thickness || 1}\n`;
          break;
      }
    });
    
    // Adiciona comando de impressão
    preview += 'P1\n';
    
    return preview;
  }
}

module.exports = { PPLAProtocol };
