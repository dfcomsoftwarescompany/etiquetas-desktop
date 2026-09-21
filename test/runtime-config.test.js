const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  resolveRuntimeConfig,
  readRuntimeConfigFile,
  DEFAULT_CHANNEL,
  DEFAULT_WS_URL,
} = require('../src/main/modules/runtime-config');

describe('resolveRuntimeConfig', () => {
  describe('se o build não tiver runtime-config.json', () => {
    describe('e nenhuma variável de ambiente for informada', () => {
      it('deve usar o canal e o socket de produção', () => {
        // Arrange
        const fileConfig = null;
        const env = {};

        // Act
        const config = resolveRuntimeConfig({ fileConfig, env });

        // Assert
        assert.equal(config.channel, DEFAULT_CHANNEL);
        assert.equal(config.printerWsUrl, DEFAULT_WS_URL);
        assert.equal(config.updateChannel, 'latest');
        assert.equal(config.allowPrerelease, false);
      });
    });

    describe('e PRINTER_WS_URL for informada', () => {
      it('deve usar a URL da variável de ambiente', () => {
        // Arrange
        const env = { PRINTER_WS_URL: 'https://socket-dev.local/notifications-printer' };

        // Act
        const config = resolveRuntimeConfig({ fileConfig: null, env });

        // Assert
        assert.equal(config.printerWsUrl, 'https://socket-dev.local/notifications-printer');
        assert.equal(config.channel, DEFAULT_CHANNEL);
      });
    });
  });

  describe('se o build for do canal beta', () => {
    it('deve usar o canal e o socket gravados no instalador', () => {
      // Arrange
      const fileConfig = {
        channel: 'beta',
        printerWsUrl: 'https://socket-beta.dfcom.com.br/notifications-printer',
      };

      // Act
      const config = resolveRuntimeConfig({ fileConfig, env: {} });

      // Assert
      assert.equal(config.channel, 'beta');
      assert.equal(config.printerWsUrl, 'https://socket-beta.dfcom.com.br/notifications-printer');
      assert.equal(config.updateChannel, 'env-beta');
      assert.equal(config.allowPrerelease, true);
    });

    describe('e PRINTER_WS_URL for informada na máquina', () => {
      it('deve priorizar a variável de ambiente sobre a URL do instalador', () => {
        // Arrange
        const fileConfig = {
          channel: 'beta',
          printerWsUrl: 'https://socket-beta.dfcom.com.br/notifications-printer',
        };
        const env = { PRINTER_WS_URL: 'https://socket-local.test/notifications-printer' };

        // Act
        const config = resolveRuntimeConfig({ fileConfig, env });

        // Assert
        assert.equal(config.printerWsUrl, 'https://socket-local.test/notifications-printer');
        assert.equal(config.channel, 'beta');
      });
    });
  });

  describe('se o build for do canal test', () => {
    it('deve usar o canal de update env-test e permitir pré-release', () => {
      // Arrange
      const fileConfig = {
        channel: 'test',
        printerWsUrl: 'https://socket-test.dfcom.com.br/notifications-printer',
      };

      // Act
      const config = resolveRuntimeConfig({ fileConfig, env: {} });

      // Assert
      assert.equal(config.updateChannel, 'env-test');
      assert.equal(config.allowPrerelease, true);
    });
  });

  describe('se o canal gravado for desconhecido', () => {
    it('deve cair para produção em vez de aceitar canal inválido', () => {
      // Arrange
      const fileConfig = { channel: 'homologacao', printerWsUrl: 'https://socket-x.local/ws' };

      // Act
      const config = resolveRuntimeConfig({ fileConfig, env: {} });

      // Assert
      assert.equal(config.channel, DEFAULT_CHANNEL);
      assert.equal(config.updateChannel, 'latest');
    });
  });
});

describe('readRuntimeConfigFile', () => {
  describe('se o arquivo não existir no pacote', () => {
    it('deve retornar null em vez de lançar erro', () => {
      // Arrange
      const filePath = path.join(os.tmpdir(), 'runtime-config-inexistente.json');

      // Act
      const fileConfig = readRuntimeConfigFile(filePath);

      // Assert
      assert.equal(fileConfig, null);
    });
  });

  describe('se o arquivo existir com JSON válido', () => {
    it('deve devolver o conteúdo gravado no build', () => {
      // Arrange
      const filePath = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'etiquetas-runtime-')),
        'runtime-config.json'
      );
      fs.writeFileSync(
        filePath,
        JSON.stringify({ channel: 'beta', printerWsUrl: 'https://socket-beta.local/ws' })
      );

      // Act
      const fileConfig = readRuntimeConfigFile(filePath);

      // Assert
      assert.equal(fileConfig.channel, 'beta');
      assert.equal(fileConfig.printerWsUrl, 'https://socket-beta.local/ws');
    });
  });
});
