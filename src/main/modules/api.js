/**
 * Módulo de API - Comunicação com API externa
 * Gerencia requisições HTTP para buscar dados de produtos
 */

const https = require('https');
const http = require('http');

// Mock de produtos (apenas campos usados na etiqueta)
const MOCK_PRODUTOS = [
  { codBarras: '7891234567890', descricao: 'Body Manga Curta Algodão', vlrVenda: 45.90 },
  { codBarras: '7891234567891', descricao: 'Macacão Jeans Infantil', vlrVenda: 89.90 },
  { codBarras: '7891234567892', descricao: 'Vestido Floral Verão', vlrVenda: 65.50 },
  { codBarras: '7891234567893', descricao: 'Calça Moletom Confortável', vlrVenda: 55.00 },
  { codBarras: '7891234567894', descricao: 'Camiseta Básica Algodão', vlrVenda: 29.90 },
  { codBarras: '7891234567895', descricao: 'Shorts Esportivo', vlrVenda: 39.90 },
  { codBarras: '7891234567896', descricao: 'Jaqueta Corta Vento', vlrVenda: 95.00 },
  { codBarras: '7891234567897', descricao: 'Meia Cano Alto Algodão', vlrVenda: 12.90 },
  { codBarras: '7891234567898', descricao: 'Tênis Esportivo Infantil', vlrVenda: 120.00 },
  { codBarras: '7891234567899', descricao: 'Boné Ajustável', vlrVenda: 24.90 }
];

class APIClient {
  constructor() {
    this.config = {
      baseURL: process.env.API_BASE_URL || 'http://localhost:8547/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Etiquetas-LOOPII/2.0.0'
      }
    };
    
    this.useMock = true; // Mock ativo por padrão
  }

  // ==================== Configuração ====================

  setBaseURL(url) {
    this.config.baseURL = url;
  }

  setMockMode(enabled) {
    this.useMock = enabled;
  }

  setHeaders(headers) {
    this.config.headers = { ...this.config.headers, ...headers };
  }

  // ==================== Requisições ====================

  async request(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.config.baseURL);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: { ...this.config.headers, ...options.headers },
        timeout: this.config.timeout
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`API Error: ${res.statusCode}`));
            }
          } catch {
            reject(new Error('Resposta inválida da API'));
          }
        });
      });

      req.on('error', err => reject(new Error(`Conexão: ${err.message}`)));
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      
      if (options.body) req.write(JSON.stringify(options.body));
      req.end();
    });
  }

  // ==================== Produtos ====================

  async buscarProdutos(filters = {}) {
    
    if (this.useMock) {
      return MOCK_PRODUTOS;
    }
    
    const params = new URLSearchParams(filters).toString();
    const endpoint = params ? `/produtos?${params}` : '/produtos';
    const response = await this.request(endpoint);
    return response.data || response;
  }

  async buscarProdutoPorCodigo(codBarras) {
    
    if (!codBarras?.trim()) {
      throw new Error('Código de barras obrigatório');
    }
    
    const codigo = String(codBarras).trim();
    
    if (this.useMock) {
      const produto = MOCK_PRODUTOS.find(p => p.codBarras === codigo);
      if (!produto) throw new Error(`Produto não encontrado: ${codigo}`);
      return produto;
    }
    
    const response = await this.request(`/produtos/${encodeURIComponent(codigo)}`);
    const data = response.data || response;
    return { codBarras: data.codBarras, descricao: data.descricao, vlrVenda: data.vlrVenda };
  }

  async buscarProdutoPorNome(termo) {
    
    if (!termo?.trim()) {
      throw new Error('Termo de busca obrigatório');
    }
    
    const termoLower = termo.toLowerCase().trim();
    
    if (this.useMock) {
      return MOCK_PRODUTOS.filter(p => p.descricao.toLowerCase().includes(termoLower));
    }
    
    const response = await this.request(`/produtos/buscar?q=${encodeURIComponent(termo)}`);
    const data = response.data || response;
    return data.map(p => ({ codBarras: p.codBarras, descricao: p.descricao, vlrVenda: p.vlrVenda }));
  }

  async testarConexao() {
    if (this.useMock) return true;
    
    try {
      await this.request('/health');
      return true;
    } catch {
      return false;
    }
  }

  async registrarImpressao(labelData) {
    try {
      return await this.request('/impressoes', {
        method: 'POST',
        body: { ...labelData, timestamp: new Date().toISOString() }
      });
    } catch {
      return null;
    }
  }
}

module.exports = APIClient;

