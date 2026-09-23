const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isConsignedLabelCode,
  applyConsignedLabelMark,
} = require('../src/main/modules/consigned-label-mark');

describe('isConsignedLabelCode', () => {
  describe('se o código tiver o sufixo /dp-', () => {
    it('deve identificar a etiqueta como consignada', () => {
      // Arrange
      const code = '000111222333/dp-CNS123';

      // Act
      const result = isConsignedLabelCode(code);

      // Assert
      assert.equal(result, true);
    });
  });

  describe('se o código for de catálogo ou padrão', () => {
    it('deve deixar de marcar como consignada', () => {
      // Arrange
      const codes = ['000111222333/ctl-ABC', '000111222333'];

      // Act
      const result = codes.map((code) => isConsignedLabelCode(code));

      // Assert
      assert.deepEqual(result, [false, false]);
    });
  });
});

describe('applyConsignedLabelMark', () => {
  describe('se o item for consignado', () => {
    it('deve prefixar a descrição impressa com asterisco sem alterar o nome original', () => {
      // Arrange
      const texto = 'Camisa Nike Seminovo';

      // Act
      const result = applyConsignedLabelMark(texto, true);

      // Assert
      assert.equal(result, '* Camisa Nike Seminovo');
    });

    describe('e a descrição já tiver o asterisco', () => {
      it('deve manter um único asterisco', () => {
        // Arrange
        const texto = '* Camisa Nike Seminovo';

        // Act
        const result = applyConsignedLabelMark(texto, true);

        // Assert
        assert.equal(result, '* Camisa Nike Seminovo');
      });
    });
  });

  describe('se o item não for consignado', () => {
    it('deve manter a descrição sem marcação', () => {
      // Arrange
      const texto = 'Camisa Nike Seminovo';

      // Act
      const result = applyConsignedLabelMark(texto, false);

      // Assert
      assert.equal(result, 'Camisa Nike Seminovo');
    });
  });
});
