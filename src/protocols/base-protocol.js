const { SerialPort } = require('serialport');

class BasePrinterProtocol {
  constructor(config = {}) {
    this.port = null;
    this.defaultConfig = {
      port: config.port || 'COM1',
      baudRate: config.baudRate || 9600,
      dataBits: config.dataBits || 8,
      stopBits: config.stopBits || 1,
      parity: config.parity || 'none',
      rtscts: config.rtscts !== undefined ? config.rtscts : true
    };
  }

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
        if (this.port) {
          this.port.on('open', () => {
            this.initialize();
            resolve();
          });

          this.port.on('error', (err) => {
            reject(err);
          });
        }
      });
    } catch (error) {
      throw new Error(`Erro ao conectar à impressora: ${error}`);
    }
  }

  async disconnect() {
    return new Promise((resolve, reject) => {
      if (this.port) {
        this.port.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.port = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  sendCommand(command) {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Impressora não está conectada');
    }

    this.port.write(command, (err) => {
      if (err) {
        throw new Error(`Erro ao enviar comando: ${err}`);
      }
    });
  }

  // Métodos que cada protocolo deve implementar
  initialize() {
    throw new Error('Método initialize() deve ser implementado');
  }

  setLabelSize(width, height, gap) {
    throw new Error('Método setLabelSize() deve ser implementado');
  }

  setPrintSpeed(speed) {
    throw new Error('Método setPrintSpeed() deve ser implementado');
  }

  setPrintDensity(density) {
    throw new Error('Método setPrintDensity() deve ser implementado');
  }

  addElement(element) {
    throw new Error('Método addElement() deve ser implementado');
  }

  clearBuffer() {
    throw new Error('Método clearBuffer() deve ser implementado');
  }

  print(copies) {
    throw new Error('Método print() deve ser implementado');
  }

  generatePreview(elements) {
    throw new Error('Método generatePreview() deve ser implementado');
  }
}

module.exports = { BasePrinterProtocol };