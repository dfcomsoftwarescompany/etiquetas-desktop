import { BasePrinterProtocol, PrintElement, PrinterConfig, Position, Font, Barcode } from './base-protocol';

export interface PPLAPosition extends Position {}

export interface PPLAFont extends Font {}

export interface PPLABarcode extends Barcode {
  type: 'CODE39' | 'CODE128' | 'EAN13' | 'EAN8' | 'UPCA' | 'UPCE' | 'ITF' | 'CODABAR';
}

export class PPLAProtocol extends BasePrinterProtocol {
  constructor(config: Partial<PrinterConfig> = {}) {
    super(config);
  }

  /**
   * Conecta à impressora
   */
  async connect(): Promise<void> {
    try {
      this.port = new SerialPort({
        path: this.defaultConfig.port,
        baudRate: this.defaultConfig.baudRate,
        dataBits: this.defaultConfig.dataBits,
        stopBits: this.defaultConfig.stopBits,
        parity: this.defaultConfig.parity as any,
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
  async disconnect(): Promise<void> {
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
  private initialize(): void {
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
  setLabelSize(width: number, height: number, gap: number = 3): void {
    this.sendCommand(`c${width},${height},${gap}`);
  }

  /**
   * Define a velocidade de impressão (1-4)
   */
  setPrintSpeed(speed: 1 | 2 | 3 | 4): void {
    this.sendCommand(`S${speed}`);
  }

  /**
   * Define a densidade de impressão (0-15)
   */
  setPrintDensity(density: number): void {
    if (density < 0 || density > 15) {
      throw new Error('Densidade deve estar entre 0 e 15');
    }
    this.sendCommand(`D${density}`);
  }

  /**
   * Adiciona texto
   */
  addText(text: string, position: PPLAPosition, font: PPLAFont): void {
    const { x, y } = position;
    const { name, width, height, rotation } = font;
    
    // Comando para texto
    // A{fonte},{rotação},{tamanhoX},{tamanhoY},{x},{y},"{texto}"
    this.sendCommand(`A${name},${rotation},${width},${height},${x},${y},"${text}"`);
  }

  /**
   * Adiciona código de barras
   */
  addBarcode(data: string, position: PPLAPosition, barcode: PPLABarcode): void {
    const { x, y } = position;
    const { type, width, height, humanReadable, rotation } = barcode;
    
    // Comando para código de barras
    // B{tipo},{rotação},{largura},{altura},{legível},{x},{y},"{dados}"
    this.sendCommand(`B${type},${rotation},${width},${height},${humanReadable ? 1 : 0},${x},${y},"${data}"`);
  }

  /**
   * Adiciona QR Code
   */
  addQRCode(data: string, position: PPLAPosition, size: number = 5): void {
    const { x, y } = position;
    
    // Comando para QR Code
    // W{tipo},{x},{y},{tamanho},"${dados}"
    this.sendCommand(`W1,${x},${y},${size},"${data}"`);
  }

  /**
   * Adiciona linha
   */
  addLine(start: PPLAPosition, end: PPLAPosition, thickness: number = 1): void {
    // Comando para linha
    // La,{x1},{y1},{x2},{y2},{espessura}
    this.sendCommand(`La,${start.x},${start.y},${end.x},${end.y},${thickness}`);
  }

  /**
   * Adiciona retângulo
   */
  addRectangle(position: PPLAPosition, width: number, height: number, thickness: number = 1): void {
    // Comando para retângulo
    // Lb,{x},{y},{largura},{altura},{espessura}
    this.sendCommand(`Lb,${position.x},${position.y},${width},${height},${thickness}`);
  }

  /**
   * Define a orientação da impressão
   */
  setOrientation(degrees: 0 | 90 | 180 | 270): void {
    this.sendCommand(`Z${degrees}`);
  }

  /**
   * Define a referência de origem
   */
  setReference(x: number, y: number): void {
    this.sendCommand(`R${x},${y}`);
  }

  /**
   * Limpa o buffer de imagem
   */
  clearBuffer(): void {
    this.sendCommand('N');
  }

  /**
   * Imprime a etiqueta
   */
  print(copies: number = 1): void {
    if (copies < 1) {
      throw new Error('Número de cópias deve ser maior que 0');
    }
    
    // Comando de impressão com número de cópias
    this.sendCommand(`P${copies}`);
  }

  /**
   * Envia comando para a impressora
   */
  private sendCommand(command: string): void {
    if (!this.port?.isOpen) {
      throw new Error('Impressora não está conectada');
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
  generatePreview(elements: any[]): string {
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
