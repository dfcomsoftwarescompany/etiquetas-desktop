// Templates de exemplo pré-configurados

const defaultTemplates = [
  {
    id: 'template-produto-basico',
    name: 'Etiqueta de Produto Básica',
    description: 'Template simples com nome, código de barras e preço',
    category: 'Produtos',
    tags: ['produto', 'varejo', 'basico'],
    labelSize: {
      width: 100,
      height: 50
    },
    elements: [
      {
        id: 'text-1',
        type: 'text',
        x: 10,
        y: 5,
        width: 80,
        height: 15,
        content: 'NOME DO PRODUTO',
        fontSize: 16,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'barcode-1',
        type: 'barcode',
        x: 15,
        y: 20,
        width: 70,
        height: 20,
        content: '7891234567890',
        barcodeType: 'EAN13',
        humanReadable: true,
        fontSize: 12,
        rotation: 0
      },
      {
        id: 'text-2',
        type: 'text',
        x: 10,
        y: 42,
        width: 80,
        height: 10,
        content: 'R$ 29,90',
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
    id: 'template-qrcode',
    name: 'Etiqueta com QR Code',
    description: 'Template com QR Code para rastreamento',
    category: 'Logística',
    tags: ['qrcode', 'rastreamento', 'logistica'],
    labelSize: {
      width: 80,
      height: 80
    },
    elements: [
      {
        id: 'text-1',
        type: 'text',
        x: 10,
        y: 5,
        width: 60,
        height: 10,
        content: 'RASTREAMENTO',
        fontSize: 12,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'qrcode-1',
        type: 'qrcode',
        x: 20,
        y: 20,
        width: 40,
        height: 40,
        content: 'https://rastreamento.com/ABC123',
        size: 5,
        rotation: 0
      },
      {
        id: 'text-2',
        type: 'text',
        x: 10,
        y: 65,
        width: 60,
        height: 10,
        content: 'ABC123',
        fontSize: 14,
        fontFamily: 'Courier New',
        rotation: 0
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: false,
    useCount: 0,
    version: 1
  },
  {
    id: 'template-endereco',
    name: 'Etiqueta de Endereço',
    description: 'Template para etiquetas de envio com código de barras',
    category: 'Envio',
    tags: ['endereco', 'envio', 'correios'],
    labelSize: {
      width: 100,
      height: 70
    },
    elements: [
      {
        id: 'rect-1',
        type: 'rectangle',
        x: 5,
        y: 5,
        width: 90,
        height: 60,
        thickness: 1,
        rotation: 0
      },
      {
        id: 'text-1',
        type: 'text',
        x: 10,
        y: 10,
        width: 80,
        height: 8,
        content: 'DESTINATÁRIO',
        fontSize: 10,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'text-2',
        type: 'text',
        x: 10,
        y: 20,
        width: 80,
        height: 10,
        content: 'João Silva',
        fontSize: 14,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'text-3',
        type: 'text',
        x: 10,
        y: 32,
        width: 80,
        height: 8,
        content: 'Rua das Flores, 123',
        fontSize: 10,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'text-4',
        type: 'text',
        x: 10,
        y: 40,
        width: 80,
        height: 8,
        content: 'São Paulo - SP',
        fontSize: 10,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'barcode-1',
        type: 'barcode',
        x: 20,
        y: 48,
        width: 60,
        height: 15,
        content: '01234567890',
        barcodeType: 'CODE128',
        humanReadable: true,
        fontSize: 10,
        rotation: 0
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: false,
    useCount: 0,
    version: 1
  },
  {
    id: 'template-inventario',
    name: 'Etiqueta de Inventário',
    description: 'Template para controle de estoque com código e localização',
    category: 'Inventário',
    tags: ['inventario', 'estoque', 'almoxarifado'],
    labelSize: {
      width: 75,
      height: 50
    },
    elements: [
      {
        id: 'text-1',
        type: 'text',
        x: 5,
        y: 5,
        width: 65,
        height: 8,
        content: 'INVENTÁRIO 2025',
        fontSize: 12,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'line-1',
        type: 'line',
        x: 5,
        y: 15,
        width: 65,
        height: 1,
        thickness: 1,
        rotation: 0
      },
      {
        id: 'text-2',
        type: 'text',
        x: 5,
        y: 18,
        width: 30,
        height: 8,
        content: 'Item:',
        fontSize: 10,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'text-3',
        type: 'text',
        x: 35,
        y: 18,
        width: 35,
        height: 8,
        content: 'A-001',
        fontSize: 12,
        fontFamily: 'Courier New',
        rotation: 0
      },
      {
        id: 'text-4',
        type: 'text',
        x: 5,
        y: 28,
        width: 30,
        height: 8,
        content: 'Local:',
        fontSize: 10,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'text-5',
        type: 'text',
        x: 35,
        y: 28,
        width: 35,
        height: 8,
        content: 'PRATELEIRA 5',
        fontSize: 10,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'barcode-1',
        type: 'barcode',
        x: 10,
        y: 35,
        width: 55,
        height: 12,
        content: 'INV2025A001',
        barcodeType: 'CODE39',
        humanReadable: false,
        rotation: 0
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: false,
    useCount: 0,
    version: 1
  },
  {
    id: 'template-promocao',
    name: 'Etiqueta de Promoção',
    description: 'Template chamativo para produtos em promoção',
    category: 'Vendas',
    tags: ['promocao', 'oferta', 'desconto'],
    labelSize: {
      width: 100,
      height: 60
    },
    elements: [
      {
        id: 'rect-1',
        type: 'rectangle',
        x: 3,
        y: 3,
        width: 94,
        height: 54,
        thickness: 2,
        rotation: 0
      },
      {
        id: 'text-1',
        type: 'text',
        x: 10,
        y: 8,
        width: 80,
        height: 15,
        content: '🔥 PROMOÇÃO 🔥',
        fontSize: 18,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'line-1',
        type: 'line',
        x: 10,
        y: 25,
        width: 80,
        height: 2,
        thickness: 1,
        rotation: 0
      },
      {
        id: 'text-2',
        type: 'text',
        x: 10,
        y: 28,
        width: 80,
        height: 12,
        content: 'Produto em Oferta',
        fontSize: 14,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'text-3',
        type: 'text',
        x: 15,
        y: 42,
        width: 35,
        height: 12,
        content: 'DE: R$ 99,90',
        fontSize: 11,
        fontFamily: 'Arial',
        rotation: 0
      },
      {
        id: 'text-4',
        type: 'text',
        x: 55,
        y: 40,
        width: 35,
        height: 15,
        content: 'POR: R$ 69,90',
        fontSize: 14,
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

module.exports = { defaultTemplates };
