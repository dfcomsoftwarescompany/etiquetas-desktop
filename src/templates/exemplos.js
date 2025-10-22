// Templates de exemplo para carregar no primeiro uso

const templatesExemplo = [
  {
    id: 'exemplo-produto-simples',
    name: '📦 Produto Simples',
    description: 'Etiqueta básica com nome e código de barras',
    category: 'Produtos',
    tags: ['produto', 'basico', 'varejo'],
    labelSize: {
      width: 100,
      height: 50
    },
    elements: [
      {
        id: 'txt1',
        type: 'text',
        x: 10,
        y: 8,
        width: 80,
        height: 12,
        content: 'PRODUTO EXEMPLO',
        fontSize: 16,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'barcode1',
        type: 'barcode',
        x: 20,
        y: 22,
        width: 60,
        height: 18,
        content: '123456789012',
        barcodeType: 'CODE128',
        humanReadable: true,
        fontSize: 12,
        rotation: 0
      },
      {
        id: 'txt2',
        type: 'text',
        x: 35,
        y: 42,
        width: 30,
        height: 8,
        content: 'R$ 19,90',
        fontSize: 14,
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
    name: '📱 QR Code Rastreamento',
    description: 'Etiqueta com QR Code para rastreio de encomendas',
    category: 'Logística',
    tags: ['qrcode', 'rastreio', 'envio'],
    labelSize: {
      width: 80,
      height: 80
    },
    elements: [
      {
        id: 'txt1',
        type: 'text',
        x: 10,
        y: 5,
        width: 60,
        height: 10,
        content: 'RASTREIE SUA ENCOMENDA',
        fontSize: 11,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'qr1',
        type: 'qrcode',
        x: 20,
        y: 18,
        width: 40,
        height: 40,
        content: 'https://rastreio.com.br/BR123456789ABC',
        size: 5,
        rotation: 0
      },
      {
        id: 'txt2',
        type: 'text',
        x: 15,
        y: 62,
        width: 50,
        height: 8,
        content: 'Código: BR123456789ABC',
        fontSize: 9,
        fontFamily: 'Courier New',
        rotation: 0
      },
      {
        id: 'txt3',
        type: 'text',
        x: 20,
        y: 72,
        width: 40,
        height: 6,
        content: 'Escaneie para rastrear',
        fontSize: 8,
        fontFamily: 'Arial',
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
