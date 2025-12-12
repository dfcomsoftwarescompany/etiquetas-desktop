const express = require('express');
const cors = require('cors');
const { app: electronApp } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Servidor HTTP Local para receber requisições de impressão
 * Implementa sistema de autenticação via token
 */
class PrintServer {
  constructor(printerManager) {
    this.printerManager = printerManager;
    this.app = express();
    this.server = null;
    this.port = 8547; // Porta alternativa para evitar conflitos
    
    // Cache de QR Codes para melhorar performance
    this.qrCache = new Map();
    this.maxCacheSize = 100;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS para permitir requisições do sistema web
    this.app.use(cors({
      origin: '*', // Em produção, especificar domínios permitidos
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'X-Etiquetas-Token']
    }));
    
    // Parse JSON
    this.app.use(express.json({ limit: '10mb' }));
    
    // Log de requisições
    this.app.use((req, res, next) => {
      console.log(`[Server] ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Middleware de autenticação via token
   */
  authMiddleware(req, res, next) {
    const token = req.headers['x-etiquetas-token'];
    const configuredToken = this.getConfiguredToken();
    
    // Se não há token configurado, permite acesso (retrocompatibilidade)
    if (!configuredToken) {
      return next();
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token de autenticação não fornecido',
        hint: 'Configure o token no sistema de avaliação e envie no header X-Etiquetas-Token'
      });
    }
    
    if (token !== configuredToken) {
      return res.status(403).json({ 
        error: 'Token inválido',
        hint: 'Verifique se o token configurado no etiquetas-desktop corresponde ao token do sistema de avaliação'
      });
    }
    
    // Token válido, registrar uso
    this.updateTokenLastUsed();
    next();
  }

  setupRoutes() {
    // Health check / Status
    this.app.get('/health', (req, res) => {
      const memUsage = process.memoryUsage();
      
      res.json({
        status: 'ok',
        version: electronApp.getVersion(),
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
          rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
        },
        cache: {
          qrCodes: this.qrCache.size
        },
        tokenConfigured: !!this.getConfiguredToken()
      });
    });

    // Endpoint principal de impressão
    this.app.post('/print/etiqueta', this.authMiddleware.bind(this), async (req, res) => {
      try {
        const { Itens, data, ownerPrinterCnpj, typeId, codunidade } = req.body;
        
        // Suportar ambos os formatos
        const items = Itens || data?.Itens || [];
        
        if (!items || items.length === 0) {
          return res.status(400).json({ 
            error: 'Nenhum item para imprimir',
            hint: 'Envie um array "Itens" com os produtos'
          });
        }
        
        const printerName = this.printerManager.getDefaultPrinter();
        if (!printerName) {
          return res.status(400).json({ error: 'Nenhuma impressora configurada' });
        }
        
        // Expandir itens baseado na quantidade
        const expandedItems = this.expandItems(items);
        
        // Imprimir agrupando em pares
        await this.printMultipleLabels(printerName, expandedItems);
        
        res.json({ 
          success: true, 
          message: `${items.length} item(ns) processado(s)`,
          total: expandedItems.length,
          printer: printerName
        });
        
      } catch (error) {
        console.error('[Server] Erro na impressão:', error);
        res.status(500).json({ 
          error: 'Falha na impressão',
          details: error.message 
        });
      }
    });

    // Listar impressoras
    this.app.get('/printers', this.authMiddleware.bind(this), async (req, res) => {
      try {
        const printers = await this.printerManager.listPrinters();
        const defaultPrinter = this.printerManager.getDefaultPrinter();
        
        res.json({
          printers,
          default: defaultPrinter
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Configurar impressora padrão
    this.app.post('/printers/default', this.authMiddleware.bind(this), (req, res) => {
      const { printer } = req.body;
      
      if (!printer) {
        return res.status(400).json({ error: 'Nome da impressora é obrigatório' });
      }
      
      this.printerManager.setDefaultPrinter(printer);
      res.json({ success: true, printer });
    });

    // Token management endpoints
    this.app.get('/token/status', (req, res) => {
      const tokenConfig = this.getTokenConfig();
      
      res.json({
        configured: !!tokenConfig?.token,
        createdAt: tokenConfig?.createdAt,
        lastUsed: tokenConfig?.lastUsed
      });
    });

    this.app.post('/token/generate', (req, res) => {
      console.log('[Server] POST /token/generate - Gerando token');
      const newToken = this.generateSecureToken();
      console.log('[Server] Token gerado:', newToken);
      this.saveToken(newToken);
      console.log('[Server] Token salvo');
      
      res.json({
        success: true,
        token: newToken,
        message: 'Token gerado com sucesso. Configure este token no sistema de avaliação.'
      });
    });

    this.app.post('/token/validate', (req, res) => {
      const { token } = req.body;
      const configuredToken = this.getConfiguredToken();
      
      if (!configuredToken) {
        return res.json({ valid: false, message: 'Nenhum token configurado' });
      }
      
      const valid = token === configuredToken;
      res.json({ 
        valid,
        message: valid ? 'Token válido' : 'Token inválido'
      });
    });
  }

  /**
   * Expande itens baseado na quantidade
   */
  expandItems(items) {
    const expanded = [];
    
    for (const item of items) {
      const qtd = parseInt(item.qtd) || 1;
      
      // Adicionar item 'qtd' vezes
      for (let i = 0; i < qtd; i++) {
        expanded.push({
          descricao: item.descricao,
          codbarras: item.codbarras,
          valor: item.valor,
          tamanho: item.tamanho || '',
          valor_giracredito: item.valor_giracredito
        });
      }
    }
    
    return expanded;
  }

  /**
   * Imprime múltiplas etiquetas agrupando em pares
   */
  async printMultipleLabels(printerName, items) {
    const pairs = [];
    
    // Agrupar em pares
    for (let i = 0; i < items.length; i += 2) {
      const pair = [items[i], items[i + 1] || null];
      pairs.push(pair);
    }
    
    // Imprimir cada par
    for (const [item1, item2] of pairs) {
      if (item2) {
        // Par completo - imprimir 2 colunas (80mm)
        await this.printerManager.printPair(printerName, item1, item2);
      } else {
        // Último item ímpar - imprimir 1 coluna (40mm)
        await this.printerManager.printSingle(printerName, item1);
      }
      
      // Pequeno delay entre impressões para evitar sobrecarga
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Limpar cache periodicamente
    if (this.qrCache.size > this.maxCacheSize) {
      this.clearQRCache();
    }
  }

  /**
   * Limpa cache de QR Codes
   */
  clearQRCache() {
    const oldSize = this.qrCache.size;
    this.qrCache.clear();
    console.log(`[Server] Cache limpo: ${oldSize} QR codes removidos`);
    
    // Forçar garbage collection se disponível
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Token Management
   */
  generateSecureToken() {
    const prefix = 'etq_';
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return prefix + randomBytes;
  }

  getTokenConfigPath() {
    return path.join(electronApp.getPath('userData'), 'connection-token.json');
  }

  saveToken(token) {
    const configPath = this.getTokenConfigPath();
    const config = {
      token: token,
      createdAt: new Date().toISOString(),
      lastUsed: null
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  }

  getTokenConfig() {
    try {
      const configPath = this.getTokenConfigPath();
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config;
    } catch {
      return null;
    }
  }

  getConfiguredToken() {
    const config = this.getTokenConfig();
    return config?.token || null;
  }

  updateTokenLastUsed() {
    try {
      const config = this.getTokenConfig();
      if (config) {
        config.lastUsed = new Date().toISOString();
        fs.writeFileSync(this.getTokenConfigPath(), JSON.stringify(config, null, 2));
      }
    } catch (error) {
      console.error('[Server] Erro ao atualizar lastUsed do token:', error);
    }
  }

  /**
   * Inicia o servidor
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        console.log(`[Server] Servidor HTTP iniciado na porta ${this.port}`);
        console.log(`[Server] Acesse: http://localhost:${this.port}/health`);
        resolve();
      });

      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`[Server] Porta ${this.port} já está em uso`);
        } else {
          console.error('[Server] Erro ao iniciar servidor:', error);
        }
        reject(error);
      });
    });
  }

  /**
   * Para o servidor
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('[Server] Servidor HTTP parado');
      });
      this.server = null;
    }
  }
}

module.exports = PrintServer;
