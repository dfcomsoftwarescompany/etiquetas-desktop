const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  EXCHANGE_DEADLINE_LABEL_MESSAGE,
  shouldShowExchangeDeadlineLabel,
} = require('../src/main/modules/exchange-deadline-label');

describe('shouldShowExchangeDeadlineLabel', () => {
  describe('se a unidade for Giramini Kids (Loopii)', () => {
    describe('e o tenant_name for giramini-kids', () => {
      it('deve exibir a mensagem de prazo para troca', () => {
        // Arrange
        const context = { tenantName: 'giramini-kids', storeName: 'Outra Loja' };

        // Act
        const result = shouldShowExchangeDeadlineLabel(context);

        // Assert
        assert.equal(result, true);
      });
    });

    describe('e o nome da loja for Giramini Kids', () => {
      it('deve exibir a mensagem de prazo para troca', () => {
        // Arrange
        const context = { tenantName: 'outro-tenant', storeName: 'Giramini Kids' };

        // Act
        const result = shouldShowExchangeDeadlineLabel(context);

        // Assert
        assert.equal(result, true);
      });
    });
  });

  describe('se a unidade não for Giramini Kids', () => {
    it('deve ocultar a mensagem de prazo para troca', () => {
      // Arrange
      const context = { tenantName: 'loja-demo', storeName: 'Loopii Store' };

      // Act
      const result = shouldShowExchangeDeadlineLabel(context);

      // Assert
      assert.equal(result, false);
    });
  });
});

describe('EXCHANGE_DEADLINE_LABEL_MESSAGE', () => {
  describe('se a mensagem for utilizada na etiqueta', () => {
    it('deve manter o texto exato da política de troca', () => {
      // Arrange
      const expected = 'Prazo para troca 3 dias com a etiqueta.';

      // Act
      const result = EXCHANGE_DEADLINE_LABEL_MESSAGE;

      // Assert
      assert.equal(result, expected);
    });
  });
});
