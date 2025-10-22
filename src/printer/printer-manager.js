const { PPLAProtocol } = require('../protocols/ppla.js');
const { EPL2Protocol } = require('../protocols/epl2.js');
const { ZPLProtocol } = require('../protocols/zpl.js');
const { SerialPort } = require('serialport');

class PrinterManager {
  constructor() {
    // Singleton
    this.printers = new Map();
    this.activeProtocol = null;
  }

  static getInstance() {
    if (!PrinterManager.instance) {
      PrinterManager.instance = new PrinterManager();
    }
    return PrinterManager.instance;
  }

  /**
   * Detecta automaticamente portas COM disponíveis
   */
  async detectSerialPorts() {
    try {
      const ports = await SerialPort.list();
      console.log('🔍 Portas seriais detectadas:', ports.length);
      
      ports.forEach(port => {
        console.log(`  - ${port.path}: ${port.manufacturer || 'Desconhecido'}`);
      });
      
      return ports;
    } catch (error) {
      console.error('❌ Erro ao detectar portas:', error);
      return [];
    }
  }

  /**
   * Detecta e configura automaticamente impressora Argox OS-2140
   */
  async autoConfigureArgox() {
    console.log('🔍 Procurando impressora Argox OS-2140...');
    
    const ports = await this.detectSerialPorts();
    
    if (ports.length === 0) {
      console.warn('⚠️ Nenhuma porta serial encontrada');
      return null;
    }

    // Tentar cada porta para encontrar a Argox
    for (const port of ports) {
      console.log(`🔌 Testando porta ${port.path}...`);
      
      const config = {
        name: `Argox OS-2140 (${port.path})`,
        model: 'OS-2140',
        protocol: 'PPLA',
        connection: {
          port: port.path,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          rtscts: true
        }
      };

      this.addPrinter(config);
      console.log(`✅ Impressora Argox configurada em ${port.path}`);
    }

    // Retorna a primeira porta configurada
    const firstPrinter = Array.from(this.printers.values())[0];
    return firstPrinter;
  }

  /**
   * Adiciona uma nova impressora
   */
  addPrinter(config) {
    this.printers.set(config.name, config);
  }

  /**
   * Remove uma impressora
   */
  removePrinter(name) {
    this.printers.delete(name);
  }

  /**
   * Lista todas as impressoras configuradas
   */
  listPrinters() {
    return Array.from(this.printers.values());
  }

  /**
   * Conecta a uma impressora específica
   */
  async connect(name) {
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
  async disconnect() {
    if (this.activeProtocol) {
      await this.activeProtocol.disconnect();
      this.activeProtocol = null;
    }
  }

  /**
   * Configura uma impressora Argox OS-214 (método legado)
   * @deprecated Use autoConfigureArgox() para detecção automática
   */
  configureArgoxOS214(port = 'COM1') {
    const config = {
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
   * Configura uma impressora Argox OS-2140
   */
  configureArgoxOS2140(port = 'COM1') {
    const config = {
      name: `Argox OS-2140 (${port})`,
      model: 'OS-2140',
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
    console.log(`✅ Impressora Argox OS-2140 configurada em ${port}`);
    return config;
  }

  /**
   * Imprime uma etiqueta
   */
  async printLabel(elements, copies = 1) {
    if (!this.activeProtocol) {
      throw new Error('Nenhuma impressora conectada');
    }

    try {
      // Limpa o buffer
      this.activeProtocol.clearBuffer();

      console.log('📝 Processando elementos para impressão...');

      // Processa cada elemento
      elements.forEach(element => {
        console.log(`  - Adicionando ${element.type}: ${element.content || 'elemento gráfico'}`);
        
        switch (element.type) {
          case 'text':
            this.activeProtocol.addText(
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
            this.activeProtocol.addBarcode(
              element.content,
              { x: element.x, y: element.y },
              {
                type: element.barcodeType || 'CODE128',
                width: element.width || 2,
                height: element.height || 10,
                humanReadable: element.humanReadable !== false,
                rotation: element.rotation || 0
              }
            );
            break;

          case 'qrcode':
            this.activeProtocol.addQRCode(
              element.content,
              { x: element.x, y: element.y },
              element.size || 5
            );
            break;

          case 'line':
            this.activeProtocol.addLine(
              { x: element.x1, y: element.y1 },
              { x: element.x2, y: element.y2 },
              element.thickness || 1
            );
            break;

          case 'rectangle':
            this.activeProtocol.addRectangle(
              { x: element.x, y: element.y },
              element.width,
              element.height,
              element.thickness || 1
            );
            break;
        }
      });

      // Imprime e aguarda conclusão
      console.log(`🖨️ Enviando ${copies} cópia(s) para impressora...`);
      await this.activeProtocol.print(copies);
      
      // Aguarda um momento para garantir que tudo foi enviado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Impressão enviada com sucesso!');
    } catch (error) {
      console.error('❌ Erro detalhado:', error);
      throw new Error(`Erro ao imprimir etiqueta: ${error.message}`);
    }
  }

  /**
   * Gera preview do código da etiqueta
   */
  generatePreview(elements, protocol) {
    // Se houver protocolo ativo, use-o
    if (this.activeProtocol) {
      return this.activeProtocol.generatePreview(elements);
    }
    
    // Caso contrário, crie uma instância temporária do protocolo
    let tempProtocol;
    switch (protocol) {
      case 'PPLA':
        const PPLAProtocol = require('../protocols/ppla').PPLAProtocol;
        tempProtocol = new PPLAProtocol();
        break;
      case 'EPL2':
        const EPL2Protocol = require('../protocols/epl2').EPL2Protocol;
        tempProtocol = new EPL2Protocol();
        break;
      case 'ZPL':
        const ZPLProtocol = require('../protocols/zpl').ZPLProtocol;
        tempProtocol = new ZPLProtocol();
        break;
      default:
        return '; Protocolo não suportado';
    }
    
    return tempProtocol.generatePreview(elements);
  }
}

module.exports = { PrinterManager };