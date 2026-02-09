# Como Testar - Etiquetas Desktop (Servidor HTTP)

## 🔄 Mudanças no Projeto

O sistema agora funciona como **servidor HTTP local** que recebe requisições do sistema de avaliação web.

**Antes:**
- Interface buscava produtos de uma API
- Usuário clicava para imprimir

**Agora:**
- Servidor HTTP escuta em `localhost:3000`
- Sistema de avaliação envia payloads
- Interface mostra fila de impressão em tempo real

---

## 🚀 Como Testar

### 1. Iniciar o Aplicativo

```bash
npm run dev
```

O servidor iniciará automaticamente em `http://localhost:8547`

### 2. Verificar Status do Servidor

Abra no navegador:
```
http://localhost:8547/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "version": "2.0.0",
  "memory": {
    "heapUsed": "45 MB",
    "heapTotal": "60 MB",
    "rss": "120 MB"
  },
  "cache": {
    "qrCodes": 0
  },
  "printers": {
    "available": 3,
    "default": "Argox OS-2140"
  }
}
```

---

## 🧪 Testes de Impressão

### Opção 1: Usar Postman/Insomnia

**Endpoint:** `POST http://localhost:8547/print/etiqueta`

**Headers:**
```
Content-Type: application/json
X-Etiquetas-Token: seu-token-aqui
```

**Body (Payload Simples):**
```json
{
  "Itens": [
    {
      "descricao": "TESTE - PRODUTO 1",
      "qtd": 1,
      "codbarras": "7891234567890",
      "valor": "25.90",
      "valor_giracredito": "19.90",
      "tamanho": "M",
      "data": "2026-12-11",
      "produto_novo": true,
      "evento": "BLACK FRIDAY"
    }
  ]
}
```

**Campos Disponíveis:**
- `descricao` (obrigatório): Nome do produto
- `qtd` (obrigatório): Quantidade de etiquetas
- `codbarras` (obrigatório): Código de barras (gera QR Code)
- `valor` (obrigatório): Preço à vista
- `valor_giracredito` (opcional): Preço especial GIRA (exibido em coluna à direita com destaque verde)
- `tamanho` (opcional): Tamanho do produto (P, M, G, GG, 38, 40, etc)
- `data` (opcional): Data do produto no formato ISO (ex: "2026-12-11"). Será exibida como DDYYMM (112612). Se não informada, usa data atual.
- `produto_novo` (opcional): `true` = Exibe faixa verde "PRODUTO NOVO" na lateral direita
- `evento` (opcional): Texto de destaque (ex: "QUEIMA DE ESTOQUE", "BLACK FRIDAY")

**Body (Payload Completo do Sistema de Avaliação):**
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
        "valor": "49.90",
        "valor_giracredito": "39.90",
        "tamanho": "U",
        "data": "2026-12-11",
        "produto_novo": true,
        "evento": "SUPER PROMO - 20% OFF"
      },
      {
        "descricao": "CAMISETA POLO AZUL MARINHO",
        "qtd": 2,
        "codbarras": "0095025104001500001200021",
        "valor": "79.90",
        "valor_giracredito": "69.90",
        "tamanho": "M",
        "data": "2026-11-28"
      },
      {
        "descricao": "BERMUDA JEANS PRETA TRADICIONAL",
        "qtd": 1,
        "codbarras": "0095025104001500001200022",
        "valor": "129.90",
        "valor_giracredito": "109.90",
        "tamanho": "42",
        "data": "2026-12-05",
        "evento": "QUEIMA DE ESTOQUE"
      }
    ]
  }
}
```

### Opção 2: Usar cURL (Terminal)

**Sem token (vai falhar com 401):**
```bash
curl -X POST http://localhost:8547/print/etiqueta \
  -H "Content-Type: application/json" \
  -d '{
    "Itens": [
      {
        "descricao": "TESTE PRODUTO",
        "qtd": 1,
        "codbarras": "123456789",
        "valor": "10.00"
      }
    ]
  }'
```

**Com token:**
```bash
curl -X POST http://localhost:8547/print/etiqueta \
  -H "Content-Type: application/json" \
  -H "X-Etiquetas-Token: etq_abc123xyz789" \
  -d '{
    "Itens": [
      {
        "descricao": "TESTE PRODUTO",
        "qtd": 1,
        "codbarras": "123456789",
        "valor": "10.00"
      }
    ]
  }'
```

### Opção 3: Script Node.js

Crie um arquivo `test-print.js`:

```javascript
const axios = require('axios');

async function testPrint() {
  try {
    const response = await axios.post('http://localhost:8547/print/etiqueta', {
      Itens: [
        {
          descricao: 'TESTE - CAMISETA POLO - AZUL',
          qtd: 2,
          codbarras: '7891234567890',
          valor: '49.90',
          tamanho: 'M'
        },
        {
          descricao: 'TESTE - BERMUDA JEANS - PRETA',
          qtd: 1,
          codbarras: '7899876543210',
          valor: '79.90',
          tamanho: 'GG'
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Etiquetas-Token': 'etq_abc123xyz789'
      }
    });
    
    console.log('✅ Sucesso:', response.data);
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testPrint();
```

Execute:
```bash
node test-print.js
```

---

## 🔐 Configurar Token de Segurança

### 1. Gerar Token

**Via Interface:**
- Abrir app → Menu Configurações → Gerar Token

**Via API:**
```bash
curl -X POST http://localhost:8547/token/generate
```

Resposta:
```json
{
  "success": true,
  "token": "etq_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "message": "Token gerado com sucesso"
}
```

### 2. Verificar Status do Token

```bash
curl http://localhost:8547/token/status
```

Resposta:
```json
{
  "configured": true,
  "token": "etq_***o5p6",
  "createdAt": "2024-12-12T10:30:00.000Z"
}
```

### 3. Validar Token

```bash
curl -X POST http://localhost:8547/token/validate \
  -H "Content-Type: application/json" \
  -d '{"token": "etq_abc123xyz789"}'
```

---

## 🖨️ Listar Impressoras

```bash
curl http://localhost:8547/printers \
  -H "X-Etiquetas-Token: seu-token"
```

Resposta:
```json
{
  "success": true,
  "printers": [
    {
      "name": "Argox OS-2140",
      "status": "PRINTER_STATUS_READY",
      "isDefault": true
    },
    {
      "name": "Microsoft Print to PDF",
      "status": "PRINTER_STATUS_READY",
      "isDefault": false
    }
  ]
}
```

---

## 📊 Monitorar Impressões (Interface)

A interface mostrará:

1. **Status do Servidor**
   - 🟢 Servidor Ativo: `localhost:8547`
   - Token configurado: ✅ Sim

2. **Fila de Impressão**
   - Itens aguardando
   - Itens sendo impressos
   - Histórico de impressões

3. **Estatísticas**
   - Total impresso hoje
   - Tempo médio de impressão
   - Taxa de erro

---

## ⚠️ Problemas Comuns

### Erro 401: Token não fornecido

**Causa:** Header `X-Etiquetas-Token` não foi enviado

**Solução:**
```bash
curl -H "X-Etiquetas-Token: seu-token" ...
```

### Erro 403: Token inválido

**Causa:** Token enviado não corresponde ao configurado

**Solução:**
1. Verificar token configurado: `GET /token/status`
2. Usar o token correto nas requisições

### Erro: Nenhuma impressora configurada

**Causa:** Impressora padrão não está definida

**Solução:**
```bash
curl -X POST http://localhost:8547/printers/default \
  -H "Content-Type: application/json" \
  -H "X-Etiquetas-Token: seu-token" \
  -d '{"printer": "Argox OS-2140"}'
```

### Porta 8547 já está em uso

**Causa:** Outro processo usando a porta 8547 (raro)

**Solução:**
- Windows: `netstat -ano | findstr :8547` e `taskkill /PID xxxx /F`
- Linux/Mac: `lsof -i :8547` e `kill -9 PID`

---

## 🔄 Fluxo Completo de Teste

```bash
# 1. Verificar servidor
curl http://localhost:8547/health

# 2. Gerar token
curl -X POST http://localhost:8547/token/generate

# 3. Verificar token (copiar o token gerado)
curl http://localhost:8547/token/status

# 4. Listar impressoras
curl http://localhost:8547/printers \
  -H "X-Etiquetas-Token: TOKEN_AQUI"

# 5. Imprimir teste
curl -X POST http://localhost:8547/print/etiqueta \
  -H "Content-Type: application/json" \
  -H "X-Etiquetas-Token: TOKEN_AQUI" \
  -d '{
    "Itens": [
      {
        "descricao": "TESTE FINAL",
        "qtd": 1,
        "codbarras": "123456",
        "valor": "10.00"
      }
    ]
  }'
```

---

## 📝 Checklist de Testes

- [ ] Servidor inicia corretamente
- [ ] Endpoint `/health` responde
- [ ] Token pode ser gerado
- [ ] Requisição sem token retorna 401
- [ ] Requisição com token inválido retorna 403
- [ ] Impressora é listada corretamente
- [ ] Impressão de 1 item funciona
- [ ] Impressão de múltiplos itens funciona
- [ ] Quantidade (qtd) é respeitada
- [ ] QR Code é gerado corretamente
- [ ] Interface mostra fila em tempo real

---

**Última atualização:** Dezembro 2024  
**Versão:** 2.0.0

