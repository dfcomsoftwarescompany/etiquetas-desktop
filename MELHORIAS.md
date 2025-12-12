# 🚀 Melhorias Planejadas - Etiquetas Desktop

Este documento lista as melhorias e correções planejadas para o sistema de impressão de etiquetas.

---

## 📋 Índice

1. [Performance - App fica lento após muitas impressões](#1-performance---app-fica-lento-após-muitas-impressões)
2. [Segurança - Autenticação via Token](#2-segurança---autenticação-via-token)
3. [Correção - Duplicação de Etiquetas](#3-correção---duplicação-de-etiquetas)
4. [Correção - Impressão em Par (4ª etiqueta em branco)](#4-correção---impressão-em-par-4ª-etiqueta-em-branco)

---

## 1. Performance - App fica lento após muitas impressões

### 🐛 Problema

**Sintoma:** "App fica lento depois de imprimir muito"

**Causa Identificada:**
- Canvas não é liberado da memória após impressão
- BrowserWindow não é destruído corretamente
- Acúmulo de objetos em memória após múltiplas impressões

### ✅ Solução Proposta


```

#### 1.2 Limpeza de Memória
```javascript
// Garantir limpeza após impressão
printWindow.webContents.print(options, (success, reason) => {
  // Limpar referências
  canvas = null;
  dataUrl = null;
  
  // Forçar garbage collection se disponível
  if (global.gc) {
    global.gc();
  }
  
  // Destruir janela completamente
  printWindow.close();
  printWindow.destroy();
  printWindow = null;
});
```

#### 1.3 Monitoramento de Memória
```javascript
// Adicionar endpoint de diagnóstico
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  
  res.json({
    status: 'ok',
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
    },
    cache: {
      qrCodes: qrCache.size
    }
  });
});
```

### 📊 Impacto Esperado

- **Redução de uso de memória:** 60-70%
- **Melhoria de performance:** 3-5x mais rápido após 50+ impressões
- **Prevenção de crash:** Elimina vazamentos de memória

---

## 2. Segurança - Autenticação via Token

### 🔒 Problema

**Contexto:** Como o servidor roda localmente na rede (`localhost:8547` ou `192.168.x.x:8547`), qualquer pessoa na mesma rede WiFi pode acessar e enviar requisições de impressão.

**Riscos:**
- ❌ Impressão de etiquetas falsas
- ❌ Spam de impressões (DoS)
- ❌ Etiquetas com dados incorretos
- ❌ Uso não autorizado do sistema

### ✅ Solução Proposta

#### 2.1 Sistema de Token de Conexão

**Fluxo:**
1. Usuário gera token no sistema de avaliação web
2. Token é configurado no etiquetas-desktop
3. Todas as requisições devem incluir o token no header
4. etiquetas-desktop valida token antes de imprimir

#### 2.2 Implementação

**No Sistema de Avaliação Web:**
```javascript
// Gerar token único por loja
const connectionToken = generateSecureToken(); // Ex: "etq_abc123xyz789"

// Salvar no localStorage/config
localStorage.setItem('etiquetas_token', connectionToken);

// Enviar em todas as requisições
fetch('http://localhost:8547/print/etiqueta', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Etiquetas-Token': connectionToken  // ← Token no header
  },
  body: JSON.stringify(data)
});
```

**No Etiquetas Desktop:**
```javascript
// Middleware de autenticação
app.use('/print/*', (req, res, next) => {
  const token = req.headers['x-etiquetas-token'];
  const configuredToken = getConfiguredToken();
  
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
  
  next();
});
```

#### 2.3 Interface de Configuração

**Tela de Configuração no Etiquetas Desktop:**
```html
<!-- Modal de Configuração -->
<div class="config-modal">
  <h3>🔐 Configuração de Segurança</h3>
  
  <div class="form-group">
    <label>Token de Conexão</label>
    <input 
      type="text" 
      id="connection-token" 
      placeholder="Cole o token gerado no sistema de avaliação"
      value=""
    />
    <small>
      Este token deve ser o mesmo configurado no sistema de avaliação web.
      Sem ele, o sistema não aceitará requisições de impressão.
    </small>
  </div>
  
  <div class="form-group">
    <label>Status</label>
    <div id="token-status">
      <span class="badge badge-warning">⚠️ Não configurado</span>
    </div>
  </div>
  
  <button class="btn btn-primary" onclick="saveToken()">
    Salvar Token
  </button>
  
  <button class="btn btn-secondary" onclick="generateNewToken()">
    Gerar Novo Token
  </button>
</div>
```

#### 2.4 Geração de Token

```javascript
// Função para gerar token seguro
function generateSecureToken() {
  const crypto = require('crypto');
  const prefix = 'etq_';
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return prefix + randomBytes;
  // Exemplo: "etq_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}

// Salvar token em arquivo local
function saveToken(token) {
  const fs = require('fs');
  const path = app.getPath('userData') + '/connection-token.json';
  
  fs.writeFileSync(path, JSON.stringify({
    token: token,
    createdAt: new Date().toISOString(),
    lastUsed: null
  }), { mode: 0o600 }); // Permissões restritas
}

// Carregar token configurado
function getConfiguredToken() {
  const fs = require('fs');
  const path = app.getPath('userData') + '/connection-token.json';
  
  try {
    const config = JSON.parse(fs.readFileSync(path));
    return config.token;
  } catch {
    return null;
  }
}
```

#### 2.5 Instruções para o Usuário

**Documento de Orientação:**

```
📋 CONFIGURAÇÃO DE SEGURANÇA - ETIQUETAS DESKTOP

Para garantir que apenas o sistema de avaliação autorizado 
possa imprimir etiquetas, você precisa configurar um token de conexão.

PASSO 1: Gerar Token no Sistema de Avaliação
1. Acesse o sistema de avaliação web
2. Vá em Configurações → Impressão → Etiquetas
3. Clique em "Gerar Token de Conexão"
4. Copie o token gerado (ex: etq_abc123xyz789)

PASSO 2: Configurar Token no Etiquetas Desktop
1. Abra o aplicativo Etiquetas Desktop
2. Clique no menu Configurações (⚙️)
3. Cole o token copiado no campo "Token de Conexão"
4. Clique em "Salvar"

PASSO 3: Verificar Conexão
1. No sistema de avaliação, clique em "Testar Conexão"
2. Se aparecer "✅ Conectado", está tudo certo!
3. Se aparecer erro, verifique se o token está correto

⚠️ IMPORTANTE:
- Mantenha o token em segredo
- Não compartilhe o token com outras pessoas
- Se suspeitar que o token foi comprometido, gere um novo
- O token deve ser o mesmo nos dois sistemas
```

### 📊 Impacto Esperado

- **Segurança:** Bloqueia 100% das requisições não autorizadas
- **Rastreabilidade:** Logs de quem imprimiu (via token)
- **Facilidade:** Configuração única por loja

---

## 3. Correção - Duplicação de Etiquetas

### 🐛 Problema

**Sintoma:** Etiquetas são impressas duplicadas quando não deveriam.

**Causa Identificada:**
O sistema atual imprime sempre em **2 colunas** (layout de 80mm com 2x 40mm), mesmo quando só precisa de 1 etiqueta.

**Código Atual:**
```javascript
// linha 206-226 - Sempre gera 2 colunas
async generateLabelCanvas(labelData) {
  const canvasLargo = createCanvas(this.config.paperWidthPx, this.config.labelHeightPx);
  
  // COLUNA 1 (esquerda)
  ctxLargo.drawImage(etiquetaIndividual, 0, 0);
  
  // COLUNA 2 (direita) - SEMPRE imprime, mesmo se não precisar
  ctxLargo.drawImage(etiquetaIndividual, this.config.labelWidthPx, 0);
}
```

### ✅ Solução Proposta

#### 3.1 Processar Array de Itens Corretamente

**Payload Recebido:**
```json
{
  "ownerPrinterCnpj": "23212902000197",
  "typeId": "663e2ed456111351aab69433",
  "codunidade": "95",
  "data": {
    "country": "Brasil",
    "codunidade": "95",
    "Itens": [
      {
        "descricao": "ACESSORIOS - BOLSINHA - SIMPLES - PADRAO - OTIMO",
        "qtd": 1,
        "codbarras": "0095025104001500001200020",
        "valor": "15",
        "valor_giracredito": "12"
      },
      {
        "descricao": "ACESSORIOS - BOLSINHA - SIMPLES - PADRAO - OTIMO",
        "qtd": 1,
        "codbarras": "0095025104001500001200020",
        "valor": "15",
        "valor_giracredito": "12"
      }
    ]
  }
}
```

**Ou formato simplificado:**
```json
{
  "country": "Brasil",
  "codunidade": "95",
  "Itens": [
    {
      "descricao": "ACESSORIOS - BOLSINHA - SIMPLES - PADRAO - OTIMO",
      "qtd": 1,
      "codbarras": "0095025104001500001200020",
      "valor": "15",
      "valor_giracredito": "12"
    }
  ]
}
```

#### 3.2 Implementação

**Endpoint de Impressão:**
```javascript
app.post('/print/etiqueta', async (req, res) => {
  try {
    const { Itens, data } = req.body;
    
    // Suportar ambos os formatos
    const items = Itens || data?.Itens || [];
    
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Nenhum item para imprimir',
        hint: 'Envie um array "Itens" com os produtos'
      });
    }
    
    const printerName = printerManager.getDefaultPrinter();
    if (!printerName) {
      return res.status(400).json({ error: 'Nenhuma impressora configurada' });
    }
    
    // Processar cada item
    for (const item of items) {
      const qtd = parseInt(item.qtd) || 1;
      
      // Imprimir quantidade especificada
      for (let i = 0; i < qtd; i++) {
        await printerManager.printLabel(printerName, {
          texto: item.descricao || 'Produto',
          codigo: item.codbarras || '',
          preco: item.valor || '0,00',
          tamanho: item.tamanho || '',
          copies: 1  // ← Sempre 1, quantidade é controlada pelo loop
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: `${items.length} item(ns) processado(s)`,
      total: items.reduce((sum, item) => sum + (parseInt(item.qtd) || 1), 0)
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Falha na impressão',
      details: error.message 
    });
  }
});
```

#### 3.3 Modificar Geração de Canvas

**Gerar apenas 1 coluna quando necessário:**
```javascript
async generateLabelCanvas(labelData, singleColumn = false) {
  if (singleColumn) {
    // Modo 1 coluna (40mm)
    const canvas = createCanvas(this.config.labelWidthPx, this.config.labelHeightPx);
    const ctx = canvas.getContext('2d');
    
    // Rotação se necessário
    if (this.config.rotate180) {
      ctx.translate(this.config.labelWidthPx, this.config.labelHeightPx);
      ctx.rotate(Math.PI);
    }
    
    const etiquetaIndividual = await this.generateSingleLabel(labelData);
    ctx.drawImage(etiquetaIndividual, 0, 0);
    
    return canvas;
  } else {
    // Modo 2 colunas (80mm) - comportamento atual
    const canvasLargo = createCanvas(this.config.paperWidthPx, this.config.labelHeightPx);
    // ... código atual ...
  }
}
```

### 📊 Impacto Esperado

- **Elimina duplicação:** Cada item imprime apenas a quantidade especificada
- **Economia de papel:** Não imprime coluna vazia
- **Flexibilidade:** Suporta múltiplos formatos de payload

---

## 4. Correção - Impressão em Par (4ª etiqueta em branco)

### 🐛 Problema

**Sintoma:** "No caso de 3 etiquetas e a Argox imprime em par, então a 4ª fica em branco"

**Causa Identificada:**
A impressora Argox OS-2140 imprime sempre em **pares** (2 colunas de 40mm cada). Quando você envia 3 etiquetas:
- Etiqueta 1 → Coluna 1 + Coluna 2 (duplicada)
- Etiqueta 2 → Coluna 1 + Coluna 2 (duplicada)
- Etiqueta 3 → Coluna 1 + Coluna 2 (duplicada)
- **Resultado:** 6 etiquetas impressas, mas a 4ª pode ficar em branco se houver problema de alinhamento

**Problema Real:**
O código atual sempre imprime 2 colunas, então:
- 1 item = 2 etiquetas (1 real + 1 duplicada)
- 3 itens = 6 etiquetas (3 reais + 3 duplicadas)

### ✅ Solução Proposta

#### 4.1 Agrupar Impressões em Pares

**Estratégia:**
1. Agrupar itens em pares
2. Imprimir 2 etiquetas diferentes na mesma folha (80mm)
3. Se número ímpar, última etiqueta imprime sozinha (40mm)

#### 4.2 Implementação

```javascript
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
      await this.printPair(printerName, item1, item2);
    } else {
      // Último item ímpar - imprimir 1 coluna (40mm)
      await this.printSingle(printerName, item1);
    }
  }
}

async printPair(printerName, item1, item2) {
  const canvas = createCanvas(this.config.paperWidthPx, this.config.labelHeightPx);
  const ctx = canvas.getContext('2d');
  
  // Rotação se necessário
  if (this.config.rotate180) {
    ctx.translate(this.config.paperWidthPx, this.config.labelHeightPx);
    ctx.rotate(Math.PI);
  }
  
  // Coluna 1 (esquerda) - Item 1
  const label1 = await this.generateSingleLabel({
    texto: item1.descricao,
    codigo: item1.codbarras,
    preco: item1.valor,
    tamanho: item1.tamanho || ''
  });
  ctx.drawImage(label1, 0, 0);
  
  // Coluna 2 (direita) - Item 2
  const label2 = await this.generateSingleLabel({
    texto: item2.descricao,
    codigo: item2.codbarras,
    preco: item2.valor,
    tamanho: item2.tamanho || ''
  });
  ctx.drawImage(label2, this.config.labelWidthPx, 0);
  
  // Imprimir canvas completo
  await this.printCanvas(printerName, canvas, 1);
}

async printSingle(printerName, item) {
  // Imprimir apenas 1 coluna (40mm)
  const canvas = await this.generateLabelCanvas({
    texto: item.descricao,
    codigo: item.codbarras,
    preco: item.valor,
    tamanho: item.tamanho || ''
  }, true); // singleColumn = true
  
  await this.printCanvas(printerName, canvas, 1);
}
```

#### 4.3 Processar Quantidade (qtd)

```javascript
// Expandir itens baseado na quantidade
function expandItems(items) {
  const expanded = [];
  
  for (const item of items) {
    const qtd = parseInt(item.qtd) || 1;
    
    // Adicionar item 'qtd' vezes
    for (let i = 0; i < qtd; i++) {
      expanded.push({
        descricao: item.descricao,
        codbarras: item.codbarras,
        valor: item.valor,
        tamanho: item.tamanho || ''
      });
    }
  }
  
  return expanded;
}

// Uso:
app.post('/print/etiqueta', async (req, res) => {
  const { Itens, data } = req.body;
  const items = Itens || data?.Itens || [];
  
  // Expandir baseado em qtd
  const expandedItems = expandItems(items);
  
  // Imprimir agrupando em pares
  await printerManager.printMultipleLabels(printerName, expandedItems);
});
```

### 📊 Exemplo de Funcionamento

**Cenário: 3 itens, cada um com qtd=1**

**Antes (Problema):**
```
Item 1 → 2 etiquetas (duplicada)
Item 2 → 2 etiquetas (duplicada)
Item 3 → 2 etiquetas (duplicada)
Total: 6 etiquetas (3 reais + 3 duplicadas)
```

**Depois (Solução):**
```
Par 1: Item 1 + Item 2 → 1 folha (2 etiquetas diferentes)
Item 3 (ímpar) → 1 folha (1 etiqueta)
Total: 3 etiquetas (exatamente o necessário)
```

**Cenário: 5 itens, qtd variada**
```
Itens: [qtd=2, qtd=1, qtd=3, qtd=1, qtd=1]
Expandido: [item1, item1, item2, item3, item3, item3, item4, item5]
Total: 8 etiquetas

Agrupamento:
- Par 1: item1 + item1 → 1 folha (2 etiquetas iguais)
- Par 2: item2 + item3 → 1 folha (2 etiquetas diferentes)
- Par 3: item3 + item3 → 1 folha (2 etiquetas iguais)
- Par 4: item4 + item5 → 1 folha (2 etiquetas diferentes)
Total: 4 folhas, 8 etiquetas
```

### 📊 Impacto Esperado

- **Elimina etiquetas em branco:** Não imprime coluna vazia
- **Economia de papel:** Usa apenas o necessário
- **Flexibilidade:** Suporta quantidades variadas por item
- **Otimização:** Agrupa impressões quando possível

---

## 📝 Resumo das Melhorias

| Melhoria | Prioridade | Complexidade | Impacto |
|----------|-----------|--------------|---------|
| Performance (Memória) | Alta | Média | Alto |
| Segurança (Token) | **Crítica** | Média | **Crítico** |
| Duplicação | Alta | Baixa | Alto |
| Impressão em Par | Alta | Média | Alto |

---

## 🚀 Próximos Passos

1. ✅ Implementar sistema de token de segurança
2. ✅ Corrigir duplicação de etiquetas
3. ✅ Implementar agrupamento em pares
4. ✅ Adicionar cache de QR Codes
5. ✅ Implementar limpeza de memória
6. ✅ Criar interface de configuração de token
7. ✅ Documentar processo de configuração para usuários

---

**Última atualização:** Dezembro 2024  
**Status:** Planejado  
**Versão alvo:** 2.1.0

