// Templates de exemplo para carregar no primeiro uso

const templatesExemplo = [
  {
    id: 'exemplo-produto-simples',
    name: '📦 Produto Premium',
    description: 'Etiqueta profissional com design moderno',
    category: 'Produtos',
    tags: ['produto', 'premium', 'varejo'],
    labelSize: {
      width: 120,
      height: 60
    },
    elements: [
      // Borda Externa
      {
        id: 'rect-border',
        type: 'rectangle',
        x: 2,
        y: 2,
        width: 116,
        height: 56,
        thickness: 2,
        rotation: 0
      },
      // Linha separadora
      {
        id: 'line-top',
        type: 'line',
        x: 5,
        y: 18,
        width: 110,
        height: 1,
        thickness: 1,
        rotation: 0
      },
      // Marca/Logo (opcional)
      {
        id: 'txt-brand',
        type: 'text',
        x: 8,
        y: 4,
        width: 30,
        height: 6,
        content: 'WHITELABEL',
        fontSize: 9,
        fontFamily: 'Arial',
        rotation: 0
      },
      // Nome do Produto
      {
        id: 'txt-product-name',
        type: 'text',
        x: 8,
        y: 22,
        width: 80,
        height: 14,
        content: 'CAMISETA PREMIUM',
        fontSize: 18,
        fontFamily: 'Arial',
        rotation: 0
      },
      // SKU/Código
      {
        id: 'txt-sku-label',
        type: 'text',
        x: 8,
        y: 38,
        width: 20,
        height: 5,
        content: 'SKU:',
        fontSize: 8,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'txt-sku-value',
        type: 'text',
        x: 30,
        y: 38,
        width: 25,
        height: 5,
        content: 'CMS-001-P',
        fontSize: 10,
        fontFamily: 'Courier New',
        rotation: 0
      },
      // Preço Destaque
      {
        id: 'txt-price-label',
        type: 'text',
        x: 70,
        y: 37,
        width: 15,
        height: 5,
        content: 'Preço:',
        fontSize: 8,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'txt-price-value',
        type: 'text',
        x: 70,
        y: 43,
        width: 35,
        height: 12,
        content: 'R$ 89,90',
        fontSize: 16,
        fontFamily: 'Arial',
        rotation: 0
      },
      // Código de Barras
      {
        id: 'barcode1',
        type: 'barcode',
        x: 10,
        y: 48,
        width: 60,
        height: 10,
        content: '7891234567890',
        barcodeType: 'EAN13',
        humanReadable: true,
        fontSize: 10,
        rotation: 0
      },
      // Tamanho/Cor (opcional)
      {
        id: 'txt-size',
        type: 'text',
        x: 85,
        y: 50,
        width: 30,
        height: 6,
        content: 'Tam: P/M/G/GG',
        fontSize: 8,
        fontFamily: 'Arial',
        rotation: 0
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    useCount: 0,
    version: 1
  },
  {
    id: 'exemplo-qrcode-rastreio',
    name: '📱 Rastreamento Premium',
    description: 'Etiqueta profissional com QR Code para rastreio',
    category: 'Logística',
    tags: ['qrcode', 'rastreio', 'envio', 'premium'],
    labelSize: {
      width: 100,
      height: 100
    },
    elements: [
      // Borda Externa
      {
        id: 'rect-border',
        type: 'rectangle',
        x: 2,
        y: 2,
        width: 96,
        height: 96,
        thickness: 2,
        rotation: 0
      },
      // Cabeçalho
      {
        id: 'rect-header',
        type: 'rectangle',
        x: 2,
        y: 2,
        width: 96,
        height: 14,
        thickness: 1,
        rotation: 0
      },
      // Texto do Cabeçalho
      {
        id: 'txt-header',
        type: 'text',
        x: 8,
        y: 4,
        width: 85,
        height: 10,
        content: 'RASTREAMENTO DE ENCOMENDA',
        fontSize: 11,
        fontFamily: 'Arial',
        rotation: 0
      },
      // Linha separadora
      {
        id: 'line-sep',
        type: 'line',
        x: 5,
        y: 18,
        width: 90,
        height: 1,
        thickness: 1,
        rotation: 0
      },
      // QR Code Centralizado
      {
        id: 'qr1',
        type: 'qrcode',
        x: 20,
        y: 25,
        width: 60,
        height: 60,
        content: 'https://rastreio.exemplo.com.br/BR123456789ABC',
        size: 5,
        errorCorrection: 'M',
        rotation: 0
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: false,
    useCount: 0,
    version: 1
  }
];

module.exports = { templatesExemplo };
