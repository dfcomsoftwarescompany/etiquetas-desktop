const { io } = require('socket.io-client');
const log = require('electron-log');

const DEFAULT_WS_URL = 'http://localhost:3033/notifications-printer';

class PrinterWsClient {
  constructor(printServer) {
    this.printServer = printServer;
    this.socket = null;
    this.wsUrl = process.env.PRINTER_WS_URL || DEFAULT_WS_URL;
    this.reconnectDelay = 3000;
    this.isStarted = false;
  }

  getToken() {
    return this.printServer.getConfiguredToken();
  }

  connect() {
    const token = this.getToken();

    if (!token) {
      log.warn('[WS] Token não configurado. Gere um token no app para conectar ao servidor.');
      this.scheduleReconnect();
      return;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    log.info(`[WS] Conectando em ${this.wsUrl}`);

    this.socket = io(this.wsUrl, {
      auth: {
        token,
        clientType: 'desktop',
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: this.reconnectDelay,
    });

    this.socket.on('connect', () => {
      log.info('[WS] Conectado ao servidor de impressão');
    });

    this.socket.on('disconnect', (reason) => {
      log.warn(`[WS] Desconectado: ${reason}`);
    });

    this.socket.on('connect_error', (error) => {
      log.error('[WS] Erro de conexão:', error.message);
    });

    this.socket.on('print-job', async (payload) => {
      await this.handlePrintJob(payload);
    });
  }

  async handlePrintJob(payload) {
    const { jobId, type, data } = payload || {};

    if (!jobId || !type) {
      return;
    }

    try {
      let result;

      if (type === 'etiqueta') {
        result = await this.printServer.printEtiqueta(data);
      } else if (type === 'coupon') {
        result = await this.printServer.printCoupon(data);
      } else {
        throw new Error(`Tipo de impressão não suportado: ${type}`);
      }

      this.socket?.emit('print-result', {
        jobId,
        success: true,
        result,
      });
    } catch (error) {
      const details = error.details ? ` | impressora=${error.details.printer} | status=${error.details.status}` : ''
      log.error(`[WS] Erro ao processar job: ${error.message}${details}`)
      this.socket?.emit('print-result', {
        jobId,
        success: false,
        error: error.message || 'Falha na impressão',
      });
    }
  }

  scheduleReconnect() {
    if (!this.isStarted) {
      return;
    }

    setTimeout(() => this.connect(), this.reconnectDelay);
  }

  start() {
    this.isStarted = true;
    this.connect();
  }

  stop() {
    this.isStarted = false;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  reconnect() {
    if (this.isStarted) {
      this.connect();
    }
  }

  isConnected() {
    return Boolean(this.socket?.connected);
  }
}

module.exports = PrinterWsClient;
