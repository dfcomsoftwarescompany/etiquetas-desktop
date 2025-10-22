const { BasePrinterProtocol  } = require('./base-protocol.js');

class ZPLProtocol extends BasePrinterProtocol {
  constructor(config) {
    super(config);
    this.buffer = '';
  }

  initialize() {
    // Reset printer
    this.sendCommand('^XA^XZ');
    
    // Clear buffer
    this.clearBuffer();
  }

  setLabelSize(width, height) {
    // Convert mm to dots (203 DPI = 8 dots per mm)
    const dotsPerMm = 8;
    const widthDots = Math.round(width * dotsPerMm);
    const heightDots = Math.round(height * dotsPerMm);

    // Set label dimensions
    this.sendCommand(`^PW${widthDots}`); // Width
    this.sendCommand(`^LL${heightDots}`); // Length
  }

  setPrintSpeed(speed) {
    // PR command sets print speed (A-F, where A=2 ips, F=12 ips)
    const speedMap = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F' };
    this.sendCommand(`^PR${speedMap[speed]}`);
  }

  setPrintDensity(density) {
    // SD command sets darkness (0-30)
    if (density < 0 || density > 30) {
      throw new Error('Densidade deve estar entre 0 e 30');
    }
    this.sendCommand(`~SD${density}`);
  }

  addElement(element) {
    const { type, position, content = '', font, barcode } = element;
    
    // Convert mm to dots
    const x = Math.round(position.x * 8);
    const y = Math.round(position.y * 8);

    switch (type) {
      case 'text':
        if (font) {
          // ^FO sets position
          // ^A sets font
          // ^FD sets data
          // ^FS ends field
          const rotation = Math.floor(font.rotation / 90) * 90;
          this.sendCommand(
            `^FO${x},${y}` +
            `^A0,${font.height * 8},${font.width * 8}` +
            `^FB0,1,0,${rotation}` +
            `^FD${content}^FS`
          );
        }
        break;

      case 'barcode':
        if (barcode) {
          // ^FO sets position
          // ^BY sets bar width
          // ^BC sets CODE128
          // ^FD sets data
          // ^FS ends field
          const rotation = Math.floor(barcode.rotation / 90) * 90;
          const barcodeType = this.getZPLBarcodeType(barcode.type);
          
          this.sendCommand(
            `^FO${x},${y}` +
            `^BY${barcode.width}` +
            `^${barcodeType}N,${barcode.height * 8},N,N,${rotation}` +
            (barcode.humanReadable ? 'Y' : 'N') +
            `^FD${content}^FS`
          );
        }
        break;

      case 'qrcode':
        // ^FO sets position
        // ^BQ sets QR Code
        // ^FD sets data
        // ^FS ends field
        const size = element.size || 5;
        this.sendCommand(
          `^FO${x},${y}` +
          `^BQN,2,${size}` +
          `^FD${content}^FS`
        );
        break;

      case 'line':
        if (element.endPosition) {
          // ^FO sets position
          // ^GB draws line
          // ^FS ends field
          const x2 = Math.round(element.endPosition.x * 8);
          const y2 = Math.round(element.endPosition.y * 8);
          const thickness = Math.round((element.thickness || 1) * 8);
          const width = Math.abs(x2 - x);
          const height = Math.abs(y2 - y);
          
          this.sendCommand(
            `^FO${x},${y}` +
            `^GB${width || thickness},${height || thickness},${thickness}^FS`
          );
        }
        break;

      case 'rectangle':
        if (element.width && element.height) {
          // ^FO sets position
          // ^GB draws box
          // ^FS ends field
          const width = Math.round(element.width * 8);
          const height = Math.round(element.height * 8);
          const thickness = Math.round((element.thickness || 1) * 8);
          
          this.sendCommand(
            `^FO${x},${y}` +
            `^GB${width},${height},${thickness}^FS`
          );
        }
        break;
    }
  }

  clearBuffer() {
    // Start new label format
    this.buffer = '';
    this.sendCommand('^XA');
  }

  sendCommand(command) {
    // Se não houver porta (modo preview), adiciona ao buffer
    if (!this.port || !this.port.isOpen) {
      if (!this.buffer) {
        this.buffer = '';
      }
      this.buffer += command;
      return;
    }

    // Enviar para a porta serial
    this.port.write(command, (err) => {
      if (err) {
        throw new Error(`Erro ao enviar comando: ${err}`);
      }
    });
  }

  print(copies = 1) {
    // ^PQ sets quantity
    // ^XZ ends format
    
    // Se não houver porta (modo preview), retorna o comando
    if (!this.port || !this.port.isOpen) {
      return this.buffer + `^PQ${copies}^XZ`;
    }
    
    this.sendCommand(`^PQ${copies}^XZ`);
  }

  getZPLBarcodeType(type) {
    const barcodeMap = {
      'CODE39': 'B3',
      'CODE128': 'BC',
      'EAN13': 'BE',
      'EAN8': 'B8',
      'UPCA': 'BU',
      'UPCE': 'B9',
      'ITF': 'BI',
      'CODABAR': 'BK'
    };
    
    return barcodeMap[type] || 'BC'; // Default to CODE128
  }

  generatePreview(elements) {
    let preview = '^XA\n'; // Start format
    
    // Process elements
    elements.forEach(element => {
      const x = Math.round(element.position.x * 8);
      const y = Math.round(element.position.y * 8);
      
      switch (element.type) {
        case 'text':
          if (element.font) {
            const rotation = Math.floor(element.font.rotation / 90) * 90;
            preview += `^FO${x},${y}` +
                      `^A0,${element.font.height * 8},${element.font.width * 8}` +
                      `^FB0,1,0,${rotation}` +
                      `^FD${element.content}^FS\n`;
          }
          break;
          
        case 'barcode':
          if (element.barcode) {
            const rotation = Math.floor(element.barcode.rotation / 90) * 90;
            const barcodeType = this.getZPLBarcodeType(element.barcode.type);
            preview += `^FO${x},${y}` +
                      `^BY${element.barcode.width}` +
                      `^${barcodeType}N,${element.barcode.height * 8},N,N,${rotation}` +
                      (element.barcode.humanReadable ? 'Y' : 'N') +
                      `^FD${element.content}^FS\n`;
          }
          break;
          
        case 'qrcode':
          const size = element.size || 5;
          preview += `^FO${x},${y}` +
                    `^BQN,2,${size}` +
                    `^FD${element.content}^FS\n`;
          break;
          
        case 'line':
          if (element.endPosition) {
            const x2 = Math.round(element.endPosition.x * 8);
            const y2 = Math.round(element.endPosition.y * 8);
            const thickness = Math.round((element.thickness || 1) * 8);
            const width = Math.abs(x2 - x);
            const height = Math.abs(y2 - y);
            
            preview += `^FO${x},${y}` +
                      `^GB${width || thickness},${height || thickness},${thickness}^FS\n`;
          }
          break;
          
        case 'rectangle':
          if (element.width && element.height) {
            const width = Math.round(element.width * 8);
            const height = Math.round(element.height * 8);
            const thickness = Math.round((element.thickness || 1) * 8);
            
            preview += `^FO${x},${y}` +
                      `^GB${width},${height},${thickness}^FS\n`;
          }
          break;
      }
    });
    
    preview += '^PQ1\n'; // Print quantity
    preview += '^XZ'; // End format
    
    return preview;
  }
}

module.exports = { ZPLProtocol };
