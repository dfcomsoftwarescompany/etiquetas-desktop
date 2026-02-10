# 🏷️ Layout de Etiquetas V2 - Ajustes Implementados

## 📋 Resumo das Alterações

Esta versão implementa melhorias significativas no layout das etiquetas de impressão, focando em legibilidade, funcionalidade e melhor aproveitamento do espaço.

---

## ✨ Novas Funcionalidades

### 1. **Nome do Produto - Quebra Automática Completa**
- ✅ Exibição completa do nome do produto
- ✅ Quebra de linha automática (sem limite de linhas)
- ✅ SEM truncamento de texto
- ✅ Fonte ajustada para 16px (melhor legibilidade)

**Antes:** Limitado a 2 linhas com truncamento  
**Depois:** Todas as palavras são exibidas com quebra automática

---

### 2. **Preço - Rodapé Centralizado**
- ✅ Preço (R$) exibido apenas na parte inferior
- ✅ Centralizado vertical e horizontalmente
- ✅ Fonte grande e legível (44px)
- ✅ Fundo cinza claro (#f0f0f0) para destaque
- ✅ Altura da área de preço reduzida para 80px

**Layout:**
```
┌─────────────────────┐
│                     │
│   [Área Info]       │
│                     │
├─────────────────────┤
│                     │
│   R$ 99,90          │ ← Centralizado
│                     │
└─────────────────────┘
```

---

### 3. **QR Code - Reposicionamento**
- ✅ Margem superior aumentada de 40px para 50px
- ✅ Tamanho reduzido de 135px para 120px
- ✅ Garante que o furo do prendedor não perfure o código
- ✅ Melhor aproveitamento do espaço vertical

**Antes:** QR Code muito próximo do topo  
**Depois:** QR Code com margem segura para o furo

---

### 4. **Faixa "PRODUTO NOVO" - Lateral Direita**
- ✅ Faixa vertical verde vibrante (#00C853)
- ✅ Texto "PRODUTO NOVO" em branco, rotacionado 90°
- ✅ Largura de 20px
- ✅ Ativada apenas quando `produto_novo: true`
- ✅ Valor padrão: `false` (não exibe se não receber a prop)

**Parâmetro:**
```javascript
{
  produto_novo: true  // Exibe faixa verde
}
```

**Visual:**
```
┌──────────────────┬──┐
│                  │P │
│   Conteúdo       │R │
│   da             │O │
│   Etiqueta       │D │
│                  │U │
│                  │T │
│                  │O │
│                  │  │
│                  │N │
│                  │O │
│                  │V │
│                  │O │
└──────────────────┴──┘
```

---

### 5. **Linha de Evento - Destaque Especial**
- ✅ Caixa amarela destacada para eventos
- ✅ Fonte maior (11px bold, reduz para 9px se texto longo)
- ✅ Borda amarela escura (#F9A825)
- ✅ Fundo amarelo claro (#FFF9C4)
- ✅ Texto em laranja escuro (#F57F17)
- ✅ Altura de 28px

**Parâmetro:**
```javascript
{
  evento: "QUEM TEM GIRACREDITO PAGA METADE"
}
```

**Exemplo de uso:**
- "QUEM TEM GIRACREDITO PAGA METADE"
- "PROMOÇÃO RELÂMPAGO - 50% OFF"
- "BLACK FRIDAY - DESCONTO ESPECIAL"

---

### 6. **Data de Impressão - Lateral Esquerda**
- ✅ Data no formato MMDDYY (estritamente)
- ✅ Posição vertical na lateral esquerda
- ✅ Texto rotacionado 90° (vertical)
- ✅ Fonte 10px em cinza (#666666)
- ✅ Gerada automaticamente no momento da impressão

**Formato:**
```
MMDDYY
012725 = 27 de Janeiro de 2025
020725 = 7 de Fevereiro de 2025
123124 = 31 de Dezembro de 2024
```

**Visual:**
```
┌──────────────────┐
│0                 │
│1                 │
│2                 │
│7  [Conteúdo]     │
│2                 │
│5                 │
└──────────────────┘
```

---

## 📊 Comparação Visual

### Layout Anterior
```
┌─────────────────────┐
│ DFCOM               │
│  ┌─────┐            │
│  │ QR  │ PRODUTO... │ ← Truncado
│  │CODE │ 123456     │
│  └─────┘            │
│                     │
│ TAM: M              │
│ ┌─────────────────┐ │
│ │ NO GIRA         │ │
│ │ R$ 45,90        │ │
│ └─────────────────┘ │
├─────────────────────┤
│ À VISTA             │
│ R$ 89,90            │
└─────────────────────┘
```

### Layout Novo
```
┌──────────────────┬──┐
│0 DFCOM           │P │
│1  ┌────┐         │R │
│2  │ QR │ PRODUTO │O │
│7  │CODE│ COMPLETO│D │
│2  └────┘ SEM     │U │
│5 123456  CORTES  │T │
│                  │O │
│ TAM: M           │  │
│ ┌──────────────┐ │N │
│ │ EVENTO!!!    │ │O │
│ └──────────────┘ │V │
│ ┌──────────────┐ │O │
│ │ NO GIRA      │ │  │
│ │ R$ 45,90     │ │  │
│ └──────────────┘ │  │
├──────────────────┴──┤
│                     │
│   R$ 89,90          │
│                     │
└─────────────────────┘
```

---

## 🔧 Parâmetros da API

### Estrutura Completa

```javascript
{
  // Obrigatórios
  texto: "Nome do Produto Completo",
  codigo: "123456789",
  preco: "89,90",
  
  // Opcionais
  tamanho: "M",
  valorCredito: "45,90",
  produto_novo: true,        // ← NOVO
  evento: "PROMOÇÃO ESPECIAL", // ← NOVO
  copies: 1
}
```

### Exemplos de Uso

#### Produto Normal
```javascript
{
  texto: "Camiseta Básica Algodão",
  codigo: "7891234567890",
  preco: "29,90",
  tamanho: "M"
}
```

#### Produto Novo com Evento
```javascript
{
  texto: "Jaqueta Corta Vento Impermeável",
  codigo: "7891234567891",
  preco: "95,00",
  tamanho: "G",
  produto_novo: true,
  evento: "LANÇAMENTO - COLEÇÃO INVERNO 2025"
}
```

#### Produto com Crédito e Evento
```javascript
{
  texto: "Vestido Floral Verão Longo",
  codigo: "7891234567892",
  preco: "89,90",
  valorCredito: "44,95",
  tamanho: "P",
  evento: "QUEM TEM GIRACREDITO PAGA METADE"
}
```

---

## 📐 Especificações Técnicas

### Dimensões (40x60mm @ 203dpi)
- **Canvas Total:** 320x480 pixels
- **QR Code:** 120x120 pixels (margem superior: 50px)
- **Área de Preço:** 80 pixels de altura
- **Faixa Produto Novo:** 20 pixels de largura
- **Caixa de Evento:** 28 pixels de altura
- **Data Impressão:** Lateral esquerda, 6px do canto

### Cores
| Elemento | Cor | Hex |
|----------|-----|-----|
| Faixa Produto Novo | Verde vibrante | #00C853 |
| Fundo Evento | Amarelo claro | #FFF9C4 |
| Borda Evento | Amarelo escuro | #F9A825 |
| Texto Evento | Laranja escuro | #F57F17 |
| Fundo Preço | Cinza claro | #f0f0f0 |
| Data Impressão | Cinza médio | #666666 |

### Fontes
| Elemento | Tamanho | Peso |
|----------|---------|------|
| Logo DFCOM | 26px | Bold |
| Preço Principal | 44px | Bold |
| Descrição Produto | 16px | Bold |
| Código Barras | 12-16px | Bold |
| Evento | 9-11px | Bold |
| Data Impressão | 10px | Bold |

---

## 🧪 Testes Recomendados

### Cenários de Teste

1. **Produto Simples**
   - Apenas texto, código e preço
   - Verificar quebra de linha do nome

2. **Produto Novo**
   - Com `produto_novo: true`
   - Verificar faixa verde lateral

3. **Produto com Evento**
   - Com texto de evento longo
   - Verificar ajuste automático de fonte

4. **Produto Completo**
   - Todos os campos preenchidos
   - Verificar layout não sobrepõe elementos

5. **Nome Muito Longo**
   - Texto com 50+ caracteres
   - Verificar quebra automática completa

---

## 📝 Notas Importantes

### Data de Impressão
- Formato **MMDDYY** é estritamente seguido
- Gerada automaticamente pelo sistema
- Não pode ser alterada via API
- Sempre reflete o momento da impressão

### Produto Novo
- Valor padrão é `false`
- Só exibe se explicitamente `true`
- Não exibe se campo ausente ou `false`

### Evento
- Texto ajusta automaticamente se muito longo
- Máximo recomendado: 50 caracteres
- Fonte reduz de 11px para 9px se necessário

### Quebra de Linha
- Nome do produto não tem limite de linhas
- Quebra automática por palavras
- Nunca trunca o texto

---

## 🚀 Compatibilidade

- ✅ Argox OS-2140 PPLA
- ✅ Etiquetas 40x60mm (2 colunas)
- ✅ Papel térmico direto
- ✅ Resolução 203 DPI

---

**Versão:** 2.0  
**Data:** Fevereiro 2025  
**Branch:** `feature/ajustes-layout-etiqueta`
