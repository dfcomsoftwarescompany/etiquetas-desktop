import { SerialPort } from 'serialport';

export interface PrinterConfig {
  port: string;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  rtscts: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface Font {
  name: string;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface Barcode {
  type: string;
  width: number;
  height: number;
  humanReadable: boolean;
  rotation: 0 | 90 | 180 | 270;
}

export interface PrintElement {
  type: 'text' | 'barcode' | 'qrcode' | 'line' | 'rectangle';
  position: Position;
  content?: string;
  font?: Font;
  barcode?: Barcode;
  size?: number;
  width?: number;
  height?: number;
  thickness?: number;
  endPosition?: Position;
}

export abstract class BasePrinterProtocol {
  protected port: SerialPort | null = null;
  protected config: PrinterConfig;

  constructor(config: Partial<PrinterConfig>) {
    this.config = {
      port: 'COM1',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      rtscts: true,
      ...config
    };
  }

  async connect(): Promise<void> {
    try {
      this.port = new SerialPort({
        path: this.config.port,
        baudRate: this.config.baudRate,
        dataBits: this.config.dataBits,
        stopBits: this.config.stopBits,
        parity: this.config.parity as any,
        rtscts: this.config.rtscts
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

  protected sendCommand(command: string): void {
    if (!this.port?.isOpen) {
      throw new Error('Impressora não está conectada');
    }

    this.port.write(command, (err) => {
      if (err) {
        throw new Error(`Erro ao enviar comando: ${err}`);
      }
    });
  }

  // Métodos abstratos que cada protocolo deve implementar
  protected abstract initialize(): void;
  abstract setLabelSize(width: number, height: number, gap?: number): void;
  abstract setPrintSpeed(speed: number): void;
  abstract setPrintDensity(density: number): void;
  abstract addElement(element: PrintElement): void;
  abstract clearBuffer(): void;
  abstract print(copies?: number): void;
  abstract generatePreview(elements: PrintElement[]): string;
}
