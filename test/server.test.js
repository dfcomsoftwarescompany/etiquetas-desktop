const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const PrintServer = require('../src/main/modules/server');
const PrinterManager = require('../src/main/modules/printer');

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
