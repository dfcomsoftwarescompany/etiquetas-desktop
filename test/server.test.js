const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const PrintServer = require('../src/main/modules/server');
const PrinterManager = require('../src/main/modules/printer');
const { buildPersistedSettings } = require('../src/main/modules/printer-settings');

describe('PrintServer', () => {
  describe('se a impressão de etiqueta estiver desabilitada', () => {
    describe('e a impressão de cupom estiver habilitada', () => {
      it('deve rejeitar somente a impressão de etiqueta', async () => {
        // Arrange
        const printerManager = {
          getConfig: () => ({
            labelPrintingEnabled: false,
            couponPrintingEnabled: true,
          }),
        };
        const printServer = new PrintServer(printerManager);

        // Act
        const printLabel = printServer.printEtiqueta({});

        // Assert
        await assert.rejects(printLabel, {
          message: 'Impressão de etiquetas desabilitada neste computador',
          statusCode: 503,
        });
      });

      it('deve rejeitar somente a impressão de cupom quando o cupom estiver desabilitado', async () => {
        // Arrange
        const printerManager = {
          getConfig: () => ({
            labelPrintingEnabled: true,
            couponPrintingEnabled: false,
          }),
        };
        const printServer = new PrintServer(printerManager);

        // Act
        const printCoupon = printServer.printCoupon({ coupons: [] });

        // Assert
        await assert.rejects(printCoupon, {
          message: 'Impressão de cupons desabilitada neste computador',
          statusCode: 503,
        });
      });
    });
  });
});

describe('PrinterManager', () => {
  describe('se apenas a impressão de etiqueta estiver habilitada', () => {
    it('deve manter o WebSocket elegível sem habilitar cupom', () => {
      // Arrange
      const printerManager = new PrinterManager();

      // Act
      printerManager.setConfig({
        labelPrintingEnabled: true,
        couponPrintingEnabled: false,
      });
      const config = printerManager.getConfig();

      // Assert
      assert.equal(printerManager.isLabelPrintingEnabled(), true);
      assert.equal(printerManager.isCouponPrintingEnabled(), false);
      assert.equal(printerManager.isAnyPrintingEnabled(), true);
      assert.equal(config.printingEnabled, true);
    });
  });

  describe('se etiqueta e cupom estiverem desabilitados', () => {
    it('deve indicar que o WebSocket não deve permanecer conectado', () => {
      // Arrange
      const printerManager = new PrinterManager();

      // Act
      printerManager.setConfig({
        labelPrintingEnabled: false,
        couponPrintingEnabled: false,
      });

      // Assert
      assert.equal(printerManager.isAnyPrintingEnabled(), false);
      assert.equal(printerManager.getConfig().printingEnabled, false);
    });
  });

  describe('se a impressora de cupom não estiver configurada', () => {
    describe('e existir apenas a impressora de etiquetas instalada', () => {
      it('deve deixar de resolver a impressora de cupom em vez de usar a de etiquetas', async () => {
        // Arrange
        const printerManager = new PrinterManager();
        printerManager.listPrinters = async () => [{ Name: 'Argox OS-2140 PPLA', Online: true }];

        // Act
        const couponPrinter = await printerManager.getCouponPrinter();

        // Assert
        assert.equal(couponPrinter, null);
      });
    });
  });

  describe('se receber o switch global legado', () => {
    it('deve aplicar o mesmo valor para etiqueta e cupom', () => {
      // Arrange
      const printerManager = new PrinterManager();

      // Act
      printerManager.setConfig({ printingEnabled: false });
      const config = printerManager.getConfig();

      // Assert
      assert.equal(config.labelPrintingEnabled, false);
      assert.equal(config.couponPrintingEnabled, false);
      assert.equal(config.printingEnabled, false);
    });
  });
});

describe('printer-settings', () => {
  describe('se a impressora de cupom e a de etiqueta estiverem selecionadas', () => {
    it('deve incluir couponPrinter e defaultPrinter no payload persistido', () => {
      // Arrange
      const config = {
        labelPrintingEnabled: true,
        couponPrintingEnabled: true,
        defaultPrinter: 'Argox OS-2140 PPLA',
        couponPrinter: 'Bematech MP-4200 TH',
      };

      // Act
      const payload = buildPersistedSettings(config);

      // Assert
      assert.equal(payload.couponPrinter, 'Bematech MP-4200 TH');
      assert.equal(payload.defaultPrinter, 'Argox OS-2140 PPLA');
      assert.equal(payload.labelPrintingEnabled, true);
      assert.equal(payload.couponPrintingEnabled, true);
    });
  });

  describe('se o tenant_name for informado pelo web', () => {
    it('deve incluir tenant_name no payload persistido', () => {
      // Arrange
      const config = {
        labelPrintingEnabled: true,
        couponPrintingEnabled: true,
        tenant_name: 'loja-demo',
      };

      // Act
      const payload = buildPersistedSettings(config);

      // Assert
      assert.equal(payload.tenant_name, 'loja-demo');
    });
  });
});

describe('PrintServer formatPrintErrorBody', () => {
  describe('se a impressão falhar com mensagem específica', () => {
    it('deve expor message e error com o mesmo texto para o cliente web', () => {
      // Arrange
      const printServer = new PrintServer({ getConfig: () => ({}) });
      const error = printServer.createHttpError(
        'Impressão de cupons desabilitada neste computador',
        503
      );

      // Act
      const body = printServer.formatPrintErrorBody(error);

      // Assert
      assert.equal(body.message, 'Impressão de cupons desabilitada neste computador');
      assert.equal(body.error, 'Impressão de cupons desabilitada neste computador');
    });
  });
});
