const { SerialPort } = require('serialport');

class BasePrinterProtocol {
  constructor(config = {}) {
    this.port = null;
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

  async connect() {
    try {
      this.port = new SerialPort({
        path: this.config.port,
        baudRate: this.config.baudRate,
        dataBits: this.config.dataBits,
        stopBits: this.config.stopBits,
        parity: this.config.parity,
        rtscts: this.config.rtscts
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