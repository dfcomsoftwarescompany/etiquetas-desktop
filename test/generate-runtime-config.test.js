const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { buildRuntimeConfig } = require('../scripts/generate-runtime-config');
const { DEFAULT_WS_URL } = require('../src/main/modules/runtime-config');

describe('buildRuntimeConfig', () => {
  describe('se o canal for prod', () => {
    describe('e a versão não tiver sufixo de pré-release', () => {
      it('deve gerar a configuração com a URL do secret de produção', () => {
        // Arrange
        const env = { PRINTER_WS_URL_PROD: 'https://socket.dfcom.com.br/notifications-printer' };

        // Act
        const config = buildRuntimeConfig({ channel: 'prod', version: '2.0.73', env });

        // Assert
        assert.deepEqual(config, {
          channel: 'prod',
          printerWsUrl: 'https://socket.dfcom.com.br/notifications-printer',
        });
      });
    });

    describe('e o secret de produção não estiver configurado', () => {
      it('deve usar a URL padrão de produção em vez de falhar', () => {
        // Arrange
        const env = {};

        // Act
        const config = buildRuntimeConfig({ channel: 'prod', version: '2.0.73', env });

        // Assert
        assert.equal(config.printerWsUrl, DEFAULT_WS_URL);
      });
    });

    describe('e a versão tiver sufixo de pré-release', () => {
      it('deve falhar para não publicar pré-release como produção', () => {
        // Arrange
        const env = { PRINTER_WS_URL_PROD: 'https://socket.dfcom.com.br/notifications-printer' };

        // Act
        const build = () => buildRuntimeConfig({ channel: 'prod', version: '2.0.73-env-beta.1', env });

        // Assert
        assert.throws(build, /vers[aã]o/i);
      });
    });
  });

  describe('se o canal for beta', () => {
    describe('e a versão tiver o sufixo env-beta', () => {
      it('deve gerar a configuração com a URL do secret de beta', () => {
        // Arrange
        const env = { PRINTER_WS_URL_BETA: 'https://socket-beta.dfcom.com.br/notifications-printer' };

        // Act
        const config = buildRuntimeConfig({ channel: 'beta', version: '2.0.73-env-beta.1', env });

        // Assert
        assert.deepEqual(config, {
          channel: 'beta',
          printerWsUrl: 'https://socket-beta.dfcom.com.br/notifications-printer',
        });
      });
    });

    describe('e a versão não tiver o sufixo env-beta', () => {
      it('deve falhar avisando o formato de versão esperado', () => {
        // Arrange
        const env = { PRINTER_WS_URL_BETA: 'https://socket-beta.dfcom.com.br/notifications-printer' };

        // Act
        const build = () => buildRuntimeConfig({ channel: 'beta', version: '2.0.73', env });

        // Assert
        assert.throws(build, /env-beta/);
      });
    });

    describe('e o secret de beta não estiver configurado', () => {
      it('deve falhar para não publicar beta apontando para produção', () => {
        // Arrange
        const env = {};

        // Act
        const build = () => buildRuntimeConfig({ channel: 'beta', version: '2.0.73-env-beta.1', env });

        // Assert
        assert.throws(build, /PRINTER_WS_URL_BETA/);
      });
    });
  });

  describe('se o canal for test', () => {
    it('deve exigir o sufixo env-test e usar o secret de test', () => {
      // Arrange
      const env = { PRINTER_WS_URL_TEST: 'https://socket-test.dfcom.com.br/notifications-printer' };

      // Act
      const config = buildRuntimeConfig({ channel: 'test', version: '2.0.73-env-test.4', env });

      // Assert
      assert.equal(config.channel, 'test');
      assert.equal(config.printerWsUrl, 'https://socket-test.dfcom.com.br/notifications-printer');
    });
  });

  describe('se o canal for desconhecido', () => {
    it('deve falhar listando os canais suportados', () => {
      // Arrange
      const env = {};

      // Act
      const build = () => buildRuntimeConfig({ channel: 'homologacao', version: '2.0.73', env });

      // Assert
      assert.throws(build, /prod, beta, test/);
    });
  });
});
