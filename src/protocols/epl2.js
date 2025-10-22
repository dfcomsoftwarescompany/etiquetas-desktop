const { BasePrinterProtocol  } = require('./base-protocol.js');

class EPL2Protocol extends BasePrinterProtocol {
  constructor(config) {
    super(config);
  }

  initialize() {
    // Reset printer
    this.sendCommand('\x1B@');
    
    // Clear image buffer
    this.clearBuffer();
    
    // Set to EPL2 mode
    this.sendCommand('I8,0,001\n');
  }

  setLabelSize(width, height, gap = 3) {
    // Convert mm to dots (203 DPI = 8 dots per mm)
    const dotsPerMm = 8;
    const widthDots = Math.round(width * dotsPerMm);
    const heightDots = Math.round(height * dotsPerMm);
    const gapDots = Math.round(gap * dotsPerMm);

    // Q command sets label length and gap
    this.sendCommand(`Q${heightDots},${gapDots}\n`);
    
    // Set width
    this.sendCommand(`q${widthDots}\n`);
  }

  setPrintSpeed(speed) {
    // S command sets print speed (0-4)
    this.sendCommand(`S${speed}\n`);
  }

  setPrintDensity(density) {
    // D command sets darkness (0-15)
    if (density < 0 || density > 15) {
      throw new Error('Densidade deve estar entre 0 e 15');
    }
    this.sendCommand(`D${density}\n`);
  }

  addElement(element) {
    const { type, position, content = '', font, barcode } = element;
    
    // Convert mm to dots
    const x = Math.round(position.x * 8);
    const y = Math.round(position.y * 8);

    switch (type) {
      case 'text':
        if (font) {
          // A command for text
          // Syntax: A<p1>,<p2>,<p3>,<p4>,<p5>,<p6>,<p7>,"<TEXT>"
          // p1 = x position
          // p2 = y position
          // p3 = rotation (0, 90, 180, 270)
          // p4 = font selection
          // p5 = horizontal multiplier
          // p6 = vertical multiplier
          // p7 = reverse image
          this.sendCommand(`A${x},${y},${font.rotation},${font.name},${font.width},${font.height},"${content}"\n`);
        }
        break;

      case 'barcode':
        if (barcode) {
          // B command for barcode
          // Syntax: B<p1>,<p2>,<p3>,<p4>,<p5>,<p6>,<p7>,<p8>,"<DATA>"
          // p1 = x position
          // p2 = y position
          // p3 = rotation (0, 90, 180, 270)
          // p4 = barcode type
          // p5 = narrow bar width
          // p6 = wide bar width
          // p7 = height
          // p8 = human readable (B or N)
          const humanReadable = barcode.humanReadable ? 'B' : 'N';
          this.sendCommand(`B${x},${y},${barcode.rotation},${barcode.type},${barcode.width},2,${barcode.height},${humanReadable},"${content}"\n`);
        }
        break;

      case 'qrcode':
        // b command for QR Code
        // Syntax: b<p1>,<p2>,<p3>,<p4>,<p5>,<p6>,<p7>,<p8>,"<DATA>"
        const size = element.size || 5;
        this.sendCommand(`b${x},${y},Q,${size}A,M,0,"${content}"\n`);
        break;

      case 'line':
        if (element.endPosition) {
          // LS command for line
          // Convert end position to dots
          const x2 = Math.round(element.endPosition.x * 8);
          const y2 = Math.round(element.endPosition.y * 8);
          const thickness = Math.round((element.thickness || 1) * 8);
          
          this.sendCommand(`LS${x},${y},${thickness},${x2},${y2}\n`);
        }
        break;

      case 'rectangle':
        if (element.width && element.height) {
          // LO command for box
          const width = Math.round(element.width * 8);
          const height = Math.round(element.height * 8);
          const thickness = Math.round((element.thickness || 1) * 8);
          
          this.sendCommand(`LO${x},${y},${width},${height},${thickness}\n`);
        }
        break;
    }
  }

  clearBuffer() {
    // Clear image buffer
    this.sendCommand('N\n');
  }

  print(copies = 1) {
    // P command prints
    this.sendCommand(`P${copies}\n`);
  }

  generatePreview(elements) {
    let preview = '';
    
    // Add header
    preview += 'I8,0,001\n'; // EPL2 mode
    preview += 'N\n'; // Clear buffer
    
    // Process elements
    elements.forEach(element => {
      const x = Math.round(element.position.x * 8);
      const y = Math.round(element.position.y * 8);
      
      switch (element.type) {
        case 'text':
          if (element.font) {
            preview += `A${x},${y},${element.font.rotation},${element.font.name},${element.font.width},${element.font.height},"${element.content}"\n`;
          }
          break;
          
        case 'barcode':
          if (element.barcode) {
            const humanReadable = element.barcode.humanReadable ? 'B' : 'N';
            preview += `B${x},${y},${element.barcode.rotation},${element.barcode.type},${element.barcode.width},2,${element.barcode.height},${humanReadable},"${element.content}"\n`;
          }
          break;
          
        case 'qrcode':
          const size = element.size || 5;
          preview += `b${x},${y},Q,${size}A,M,0,"${element.content}"\n`;
          break;
          
        case 'line':
          if (element.endPosition) {
            const x2 = Math.round(element.endPosition.x * 8);
            const y2 = Math.round(element.endPosition.y * 8);
            const thickness = Math.round((element.thickness || 1) * 8);
            preview += `LS${x},${y},${thickness},${x2},${y2}\n`;
          }
          break;
          
        case 'rectangle':
          if (element.width && element.height) {
            const width = Math.round(element.width * 8);
            const height = Math.round(element.height * 8);
            const thickness = Math.round((element.thickness || 1) * 8);
            preview += `LO${x},${y},${width},${height},${thickness}\n`;
          }
          break;
      }
    });
    
    // Add print command
    preview += 'P1\n';
    
    return preview;
  }
}

module.exports = { EPL2Protocol };
