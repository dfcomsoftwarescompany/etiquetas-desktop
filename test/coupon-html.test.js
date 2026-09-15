const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  prepareCouponPrintHtml,
  isFullHtmlDocument,
  buildMontserratFontFaceCss,
  resetFontFaceCacheForTests,
} = require('../src/main/modules/coupon-html');

describe('prepareCouponPrintHtml', () => {
  beforeEach(() => {
    resetFontFaceCacheForTests();
  });

  describe('se o web enviar documento HTML completo do recibo', () => {
    it('deve preservar as classes receipt e injetar Montserrat local sem Google Fonts', () => {
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
      assert.match(html, /font-size: 14px/);
      assert.match(html, /font-family: 'Montserrat'/);
      assert.match(html, /@font-face/);
      assert.match(html, /data:font\/woff2;base64,/);
      assert.equal(html.includes('fonts.googleapis.com'), false);
      assert.equal((html.match(/<!DOCTYPE/gi) || []).length, 1);
    });
  });

  describe('se receber apenas fragmento HTML legado', () => {
    it('deve embrulhar com shell local, Montserrat embutida e fontes maiores', () => {
      // Arrange
      const fragment = '<div class="text-sm">Cupom</div>';

      // Act
      const html = prepareCouponPrintHtml(fragment);

      // Assert
      assert.match(html, /<!DOCTYPE html>/i);
      assert.match(html, /Cupom/);
      assert.match(html, /font-size: 14px/);
      assert.match(html, /color: #000/);
      assert.match(html, /font-family: 'Montserrat'/);
      assert.match(html, /@font-face/);
    });
  });

  describe('se as fontes locais estiverem em assets/fonts', () => {
    it('deve gerar @font-face com pesos 400, 600 e 700', () => {
      // Act
      const css = buildMontserratFontFaceCss();

      // Assert
      assert.match(css, /font-weight: 400/);
      assert.match(css, /font-weight: 600/);
      assert.match(css, /font-weight: 700/);
      assert.equal((css.match(/@font-face/g) || []).length, 3);
    });
  });
});
