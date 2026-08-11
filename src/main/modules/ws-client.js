const { io } = require('socket.io-client');
const log = require('electron-log');

const DEFAULT_WS_URL = 'https://socket.dfcom.com.br/notifications-printer';

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

  getAuthPayload() {
    const config = this.printServer.printerManager.getConfig();

    return {
      token: this.getToken(),
      clientType: 'desktop',
      tenant_name: this.printServer.getTenantName() || undefined,
      labelPrintingEnabled: config.labelPrintingEnabled !== false,
      couponPrintingEnabled: config.couponPrintingEnabled !== false,
    };
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

    const auth = this.getAuthPayload();
    log.info(
      `[WS] Conectando em ${this.wsUrl} | tenant=${auth.tenant_name || 'n/d'} | etiqueta=${auth.labelPrintingEnabled} | cupom=${auth.couponPrintingEnabled}`
    );

    this.socket = io(this.wsUrl, {
      auth,
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

    const config = this.printServer.printerManager.getConfig();

    if (type === 'etiqueta' && config.labelPrintingEnabled === false) {
      this.socket?.emit('print-result', {
        jobId,
        success: false,
        error: 'Impressão de etiquetas desabilitada neste computador',
      });
      return;
    }

    if (type === 'coupon' && config.couponPrintingEnabled === false) {
      this.socket?.emit('print-result', {
        jobId,
        success: false,
        error: 'Impressão de cupons desabilitada neste computador',
      });
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
