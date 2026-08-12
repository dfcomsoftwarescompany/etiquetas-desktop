const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  prepareCouponPrintHtml,
  isFullHtmlDocument,
} = require('../src/main/modules/coupon-html');

describe('prepareCouponPrintHtml', () => {
  describe('se o web enviar documento HTML completo do recibo', () => {
    it('deve preservar as classes receipt e injetar overrides de fonte/cor sem reembrulhar', () => {
      // Arrange
      const incoming = `<!DOCTYPE html>
<html>
<head>
  <style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap');
.receipt { font-size: 12px; }
  </style>
</head>
<body><div class="receipt"><p class="receipt-text">Olá</p></div></body>
</html>`;

      // Act
      const html = prepareCouponPrintHtml(incoming);

      // Assert
      assert.equal(isFullHtmlDocument(html), true);
      assert.match(html, /class="receipt"/);
      assert.match(html, /receipt-text/);
      assert.match(html, /etiquetas-coupon-overrides/);
      assert.match(html, /font-size: 16px/);
      assert.equal(html.includes('fonts.googleapis.com'), false);
      // Não deve haver documento aninhado (dois DOCTYPE)
      assert.equal((html.match(/<!DOCTYPE/gi) || []).length, 1);
    });
  });

  describe('se receber apenas fragmento HTML legado', () => {
    it('deve embrulhar com shell local e fontes maiores', () => {
      // Arrange
      const fragment = '<div class="text-sm">Cupom</div>';

      // Act
      const html = prepareCouponPrintHtml(fragment);

      // Assert
      assert.match(html, /<!DOCTYPE html>/i);
      assert.match(html, /Cupom/);
      assert.match(html, /font-size: 16px/);
      assert.match(html, /color: #000/);
    });
  });
});
