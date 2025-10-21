import { PrinterConfig as BaseConfig } from '../protocols/base-protocol';
import { PPLAProtocol } from '../protocols/ppla';
import { EPL2Protocol } from '../protocols/epl2';
import { ZPLProtocol } from '../protocols/zpl';

export interface PrinterConfig {
  name: string;
  model: string;
  protocol: 'PPLA' | 'EPL2' | 'ZPL';
  connection: BaseConfig;
}

export class PrinterManager {
  private static instance: PrinterManager;
  private printers: Map<string, PrinterConfig> = new Map();
  private activeProtocol: PPLAProtocol | EPL2Protocol | ZPLProtocol | null = null;

  private constructor() {
    // Singleton
  }

  static getInstance(): PrinterManager {
    if (!PrinterManager.instance) {
      PrinterManager.instance = new PrinterManager();
    }
    return PrinterManager.instance;
  }

  /**
   * Adiciona uma nova impressora
   */
  addPrinter(config: PrinterConfig): void {
    this.printers.set(config.name, config);
  }

  /**
   * Remove uma impressora
   */
  removePrinter(name: string): void {
    this.printers.delete(name);
  }

  /**
   * Lista todas as impressoras configuradas
   */
  listPrinters(): PrinterConfig[] {
    return Array.from(this.printers.values());
  }

  /**
   * Conecta a uma impressora específica
   */
  async connect(name: string): Promise<void> {
    const printer = this.printers.get(name);
    if (!printer) {
      throw new Error(`Impressora "${name}" não encontrada`);
    }

    try {
      switch (printer.protocol) {
        case 'PPLA':
          this.activeProtocol = new PPLAProtocol(printer.connection);
          break;
          
        case 'EPL2':
          this.activeProtocol = new EPL2Protocol(printer.connection);
          break;
          
        case 'ZPL':
          this.activeProtocol = new ZPLProtocol(printer.connection);
          break;
          
        default:
          throw new Error(`Protocolo desconhecido: ${printer.protocol}`);
      }
      
      await this.activeProtocol.connect();
    } catch (error) {
      throw new Error(`Erro ao conectar à impressora: ${error}`);
    }
  }

  /**
   * Desconecta da impressora atual
   */
  async disconnect(): Promise<void> {
    if (this.activeProtocol) {
      await this.activeProtocol.disconnect();
      this.activeProtocol = null;
    }
  }

  /**
   * Configura uma impressora Argox OS-214
   */
  configureArgoxOS214(port: string = 'COM1'): void {
    const config: PrinterConfig = {
      name: 'Argox OS-214',
      model: 'OS-214',
      protocol: 'PPLA',
      connection: {
        port,
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        rtscts: true
      }
    };

    this.addPrinter(config);
  }

  /**
   * Imprime uma etiqueta
   */
  async printLabel(elements: any[], copies: number = 1): Promise<void> {
    if (!this.activeProtocol) {
      throw new Error('Nenhuma impressora conectada');
    }

    try {
      // Limpa o buffer
      this.activeProtocol.clearBuffer();

      // Processa cada elemento
      elements.forEach(element => {
        switch (element.type) {
          case 'text':
            this.activeProtocol?.addText(
              element.content,
              { x: element.x, y: element.y },
              {
                name: element.font || 'A',
                width: element.width || 1,
                height: element.height || 1,
                rotation: element.rotation || 0
              }
            );
            break;

          case 'barcode':
            this.activeProtocol?.addBarcode(
              element.content,
              { x: element.x, y: element.y },
              {
                type: element.barcodeType || 'CODE128',
                width: element.width || 2,
                height: element.height || 10,
                humanReadable: element.humanReadable || true,
                rotation: element.rotation || 0
              }
            );
            break;

          case 'qrcode':
            this.activeProtocol?.addQRCode(
              element.content,
              { x: element.x, y: element.y },
              element.size || 5
            );
            break;

          case 'line':
            this.activeProtocol?.addLine(
              { x: element.x1, y: element.y1 },
              { x: element.x2, y: element.y2 },
              element.thickness
            );
            break;

          case 'rectangle':
            this.activeProtocol?.addRectangle(
              { x: element.x, y: element.y },
              element.width,
              element.height,
              element.thickness
            );
            break;
        }
      });

      // Imprime
      this.activeProtocol.print(copies);
    } catch (error) {
      throw new Error(`Erro ao imprimir etiqueta: ${error}`);
    }
  }

  /**
   * Gera preview do código da etiqueta
   */
  generatePreview(elements: any[]): string {
    if (!this.activeProtocol) {
      return '; Nenhuma impressora conectada';
    }

    return this.activeProtocol.generatePreview(elements);
  }
}
