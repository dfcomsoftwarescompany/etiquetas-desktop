/**
 * Prepara HTML de cupom para impressão térmica no Electron.
 * O web envia documento completo (wrapReceiptHtml + RECEIPT_CSS);
 * reembrulhar com CSS Tailwind quebrava estilos e podia sair em branco.
 */

const COUPON_PRINT_OVERRIDES = `
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
  html, body {
    background: #fff !important;
    color: #000 !important;
  }
  body {
    width: 72mm !important;
    max-width: 72mm !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .receipt {
    width: 72mm !important;
    max-width: 72mm !important;
    color: #000 !important;
    background: #fff !important;
    font-family: Arial, Helvetica, sans-serif !important;
    font-size: 16px !important;
    line-height: 1.35 !important;
    padding: 8px !important;
  }
  .receipt-company-name { font-size: 20px !important; font-weight: 700 !important; color: #000 !important; }
  .receipt-text,
  .receipt-text-bold,
  .receipt-title,
  .receipt-body,
  .receipt-row,
  .receipt-barcode,
  .receipt-grid-3,
  .receipt-grid-row,
  .receipt-footer-copy {
    font-size: 16px !important;
    color: #000 !important;
  }
  .receipt-text-bold,
  .receipt-title,
  .receipt-company-name { font-weight: 700 !important; }
  .receipt-divider,
  .receipt-divider-both {
    border-color: #000 !important;
  }
  .receipt-signature {
    width: 150px !important;
    max-width: 150px !important;
    height: auto !important;
    max-height: 70px !important;
  }
  .receipt-qr {
    width: 128px !important;
    height: 128px !important;
  }
  img {
    max-width: 100% !important;
    height: auto !important;
  }
`;

const LEGACY_COUPON_SHELL = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    *, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 72.1mm;
      max-width: 72.1mm;
      min-height: 209mm;
      overflow-x: hidden;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 16px;
      color: #000;
      background: #fff;
    }
    .p-1 { padding: 0.25rem; }
    .p-4 { padding: 1rem; }
    .hidden { display: none; }
    .print\\:block { display: block !important; }
    .flex { display: flex; }
    .flex-row { flex-direction: row; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .items-end { align-items: flex-end; }
    .text-xs { font-size: 1rem; line-height: 1.25rem; color: #000; }
    .text-sm { font-size: 1.125rem; line-height: 1.5rem; color: #000; }
    .font-bold { font-weight: 700; }
    .border-t { border-top: 1px solid #000; }
    .border-b { border-bottom: 1px solid #000; }
    .border-black { border-color: #000; }
    .border-dashed { border-style: dashed; }
    .w-full { width: 100%; }
    .mt-6 { margin-top: 1.5rem; }
    .textAlign, .text-center { text-align: center; }
    .h-full { height: 100%; }
    .justify-between { justify-content: space-between; }
    .grid { display: grid; }
    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .mt-1 { margin-top: 0.25rem; }
    .w-[150px] { width: 80px; }
    img { margin: 0 auto; max-width: 100px; height: auto; object-fit: contain; display: block; }
  </style>
</head>
<body>
  __COUPON__
  <div class="w-full"><p class="text-center">.</p></div>
</body>
</html>
`;

function isFullHtmlDocument(html) {
  if (typeof html !== 'string') return false;
  const trimmed = html.trim().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
}

/**
 * Remove @import de fontes remotas (Google Fonts) — na térmica costuma atrasar/falhar
 * e deixar a página sem tipografia útil.
 */
function stripRemoteFontImports(html) {
  return html.replace(/@import\s+url\([^)]+\);\s*/gi, '');
}

/**
 * Injeta overrides de fonte/cor no <head> do documento completo.
 */
function injectPrintOverrides(html) {
  const styleTag = `<style id="etiquetas-coupon-overrides">${COUPON_PRINT_OVERRIDES}</style>`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${styleTag}</head>`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${styleTag}</head>`);
  }
  return `${styleTag}${html}`;
}

/**
 * @param {string} couponHtml
 * @returns {string}
 */
function prepareCouponPrintHtml(couponHtml) {
  if (typeof couponHtml !== 'string' || !couponHtml.trim()) {
    throw new Error('Cupom HTML inválido');
  }

  if (isFullHtmlDocument(couponHtml)) {
    return injectPrintOverrides(stripRemoteFontImports(couponHtml));
  }

  return LEGACY_COUPON_SHELL.replace('__COUPON__', couponHtml);
}

module.exports = {
  prepareCouponPrintHtml,
  isFullHtmlDocument,
  stripRemoteFontImports,
  COUPON_PRINT_OVERRIDES,
};
