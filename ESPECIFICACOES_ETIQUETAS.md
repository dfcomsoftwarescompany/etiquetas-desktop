# 🏷️ Especificações das Etiquetas - DFCOM

## 📦 Etiquetas Utilizadas

### Modelo: Etiqueta Tag 40x60 2c Roupas Preço Argox OS-214/2140

**Fornecedor/Referência:** Etiqueta compatível com Argox OS-214 e OS-2140

---

## 📏 Dimensões

| Especificação | Valor |
|---------------|-------|
| **Largura** | 40 mm |
| **Altura** | 60 mm |
| **Formato** | Retângulo vertical |
| **Colunas** | 2 colunas por rolo |
| **Gap (espaçamento)** | ~3 mm entre etiquetas |

### Visualização

```
┌─────────────┬─────────────┐
│             │             │
│   40mm      │   40mm      │
│   x         │   x         │
│   60mm      │   60mm      │
│             │             │
│   Col 1     │   Col 2     │
│             │             │
└─────────────┴─────────────┘
    Gap 3mm entre linhas
```

---

## 🎯 Uso Recomendado

### Aplicação
- ✅ Etiquetas de preço para roupas
- ✅ Tags de identificação de produtos
- ✅ Controle de estoque
- ✅ Códigos de barras/QR Codes

### Tipo de Impressão
- **Térmica Direta** ou **Transferência Térmica**
- Recomendado: **Térmica Direta** (sem ribbon)

---

## ⚙️ Configurações da Impressora

### Para Etiquetas 40x60mm (2 colunas)

#### Configuração no Aplicativo .NET

```csharp
// Tamanho individual da etiqueta
int larguraMm = 40;  // ← IMPORTANTE: 40mm, não 100mm
int alturaMm = 60;   // ← IMPORTANTE: 60mm, não 50mm

var printerService = new ArgoxPrinterService("Argox OS-2140 PPLA");
printerService.PrintLabel(texto, codigo, larguraMm, alturaMm);
```

#### Configuração no Aplicativo Electron.js

```javascript
// Tamanho individual da etiqueta
const larguraMm = 40;  // ← IMPORTANTE: 40mm
const alturaMm = 60;   // ← IMPORTANTE: 60mm

await window.electronAPI.printLabel(
    impressora,
    texto,
    codigo,
    larguraMm,
    alturaMm
);
```

#### Conversão para Dots (203 DPI)

```
Largura: 40mm × (203 ÷ 25.4) = 320 dots
Altura:  60mm × (203 ÷ 25.4) = 480 dots
```

---

## 🖨️ Propriedades do Driver Windows

### 1. Tamanho do Papel

**Opção 1: Usar tamanho pré-definido**
- Procure por: `40mm x 60mm` ou `1.57" x 2.36"`
- Se não existir, crie customizado

**Opção 2: Criar tamanho customizado**

1. Painel de Controle → Dispositivos e Impressoras
2. Botão direito na Argox → **Propriedades da impressora**
3. Aba **Preferências de Impressão**
4. **Tamanho do papel** → **Personalizar**
   - Nome: `Etiqueta 40x60`
   - Largura: `40 mm`
   - Altura: `60 mm`

### 2. Orientação
- **Retrato** (vertical)
- A etiqueta é mais alta que larga

### 3. Configurações Avançadas

| Parâmetro | Valor Recomendado | Observação |
|-----------|-------------------|------------|
| **Temperatura** | 10-12 | ↑ se impressão clara |
| **Velocidade** | 4 (média) | Equilíbrio qualidade/velocidade |
| **Densidade** | 10 | Padrão para térmica direta |
| **Margem** | 0mm | Aproveita área total |
| **Gap** | 3mm | Espaçamento entre etiquetas |

---

## 📐 Layout da Etiqueta 40x60mm

### Distribuição Recomendada

```
┌─────────────────────────────┐
│         40mm x 60mm         │
├─────────────────────────────┤
│  ┌───────┐                  │
│  │       │  PRODUTO TESTE   │ ← Texto principal
│  │  QR   │                  │
│  │ CODE  │  123456789       │ ← Código
│  │       │                  │
│  │ 25x25 │  R$ 99,90       │ ← Preço (opcional)
│  └───────┘                  │
│                             │
│  Tamanho: P M G            │ ← Info adicional
│                             │
└─────────────────────────────┘
```

### Dimensões dos Elementos

| Elemento | Tamanho | Posição |
|----------|---------|---------|
| QR Code | 25mm x 25mm | Esquerda, centralizado |
| Texto principal | Font 12-14pt | Direita do QR |
| Código | Font 8-10pt | Abaixo do texto |
| Margem interna | 2-3mm | Todas bordas |

---

## 🎨 Código Atualizado

### Ajustes no ArgoxPrinterService.cs

```csharp
private void PrintDocument_PrintPage(object sender, PrintPageEventArgs e)
{
    Graphics g = e.Graphics;
    
    // Configurações
    g.PageUnit = GraphicsUnit.Pixel;
    g.SmoothingMode = SmoothingMode.HighQuality;
    
    float dpiX = g.DpiX;  // 203 DPI
    float dpiY = g.DpiY;
    
    // Para etiqueta 40x60mm
    float larguraPx = MmToPixels(40, dpiX);  // ~320 pixels
    float alturaPx = MmToPixels(60, dpiY);   // ~480 pixels

    g.Clear(Color.White);

    // QR Code menor para etiqueta pequena
    var qrBitmap = GerarQRCode(_codigoBarras);
    float qrSize = 100;  // 25mm @ 203dpi ≈ 100 pixels
    float qrX = 10;
    float qrY = (alturaPx - qrSize) / 2;
    
    g.DrawImage(qrBitmap, qrX, qrY, qrSize, qrSize);
    
    // Texto à direita do QR Code
    float textX = qrX + qrSize + 10;
    float textY = qrY;
    
    // Texto menor para etiqueta pequena
    using (var fontGrande = new Font("Arial", 10, FontStyle.Bold))
    {
        g.DrawString(_texto, fontGrande, Brushes.Black, 
            new RectangleF(textX, textY, larguraPx - textX - 10, 30));
    }
    
    using (var fontPequena = new Font("Arial", 8, FontStyle.Regular))
    {
        g.DrawString(_codigoBarras, fontPequena, Brushes.Black, 
            textX, textY + 35);
    }
    
    e.HasMorePages = false;
}
```

### Ajustes no Interface (MainForm.cs)

```csharp
// Valores padrão atualizados para 40x60mm
_numLargura = new NumericUpDown 
{ 
    Minimum = 20, 
    Maximum = 200, 
    Value = 40  // ← Mudou de 100 para 40
};

_numAltura = new NumericUpDown 
{ 
    Minimum = 10, 
    Maximum = 200, 
    Value = 60  // ← Mudou de 50 para 60
};
```

### Ajustes no Electron.js (app.js)

```javascript
document.getElementById('largura').value = '40';  // ← Mudou de 100
document.getElementById('altura').value = '60';    // ← Mudou de 50
```

---

## 🛒 Informações de Compra

### Fornecedor
- **Produto**: Etiqueta Tag 40x60 2c Roupas Preço
- **Compatibilidade**: Argox OS-214 / OS-2140
- **Material**: Papel térmico ou cuché (com ribbon)
- **Colunas**: 2 por rolo
- **Quantidade típica**: 1000 a 5000 etiquetas por rolo

### Especificações Técnicas do Material
- **Gramatura**: 60-90 g/m²
- **Adesivo**: Permanente ou removível
- **Núcleo (tubete)**: 25mm ou 40mm
- **Diâmetro externo**: Variável conforme quantidade

---

## 🔧 Calibração para Etiquetas 40x60mm

### Procedimento de Calibração

1. **Carregue as etiquetas** no suporte
2. **Desligue a impressora**
3. **Segure o botão PAUSE**
4. **Ligue a impressora** (ainda segurando PAUSE)
5. **Solte quando começar a avançar o papel**
6. A impressora detectará automaticamente:
   - Tamanho da etiqueta
   - Posição do gap
   - Sensor (gap ou marca preta)

### Verificação Pós-Calibração

Execute teste de impressão:
- A etiqueta deve sair centralizada
- Sem cortes no meio da impressão
- Alinhamento perfeito com o gap

---

## ⚠️ Problemas Comuns com Etiquetas 40x60mm

### Problema: Etiqueta imprime cortada

**Causa:** Tamanho configurado incorretamente (ex: 100x50 em vez de 40x60)

**Solução:**
```csharp
// ERRADO
printerService.PrintLabel(texto, codigo, 100, 50);

// CORRETO
printerService.PrintLabel(texto, codigo, 40, 60);
```

### Problema: Imprime pulando etiquetas

**Causa:** Sensor não detecta o gap corretamente

**Solução:**
1. Limpe o sensor com ar comprimido
2. Recalibre (procedimento acima)
3. Verifique se gap está visível (3mm)

### Problema: QR Code muito grande

**Causa:** Código dimensionado para etiqueta 100mm

**Solução:** Reduza tamanho do QR Code para 25mm (100 pixels @ 203dpi)

---

## 📊 Comparação de Tamanhos

| Tamanho | Largura | Altura | Uso Típico | QR Code |
|---------|---------|--------|------------|---------|
| **Pequena** | 40mm | 60mm | Roupas, preço | 25x25mm |
| Média | 50mm | 75mm | Produtos variados | 30x30mm |
| **Grande** | 100mm | 50mm | Logística, envio | 40x40mm |
| Extra Grande | 100mm | 150mm | Caixas, pallets | 50x50mm |

**✅ Vocês usam: 40mm x 60mm (Pequena)**

---

## ✅ Checklist de Configuração

Para usar etiquetas 40x60mm:

- [ ] Etiquetas carregadas na impressora
- [ ] Impressora calibrada (procedimento PAUSE)
- [ ] Driver configurado para 40x60mm
- [ ] Aplicativo configurado para largura=40, altura=60
- [ ] Teste de impressão bem-sucedido
- [ ] QR Code visível e escaneável
- [ ] Texto legível
- [ ] Etiqueta não corta informações

---

## 📞 Suporte

Em caso de problemas com as etiquetas:

1. **Verifique dimensões** no código (40x60, não 100x50)
2. **Recalibre** a impressora
3. **Ajuste temperatura** se impressão clara/escura
4. **Consulte** fornecedor das etiquetas

---

**Última atualização:** Dezembro 2025  
**Aplicável a:** Argox OS-2140 PPLA  
**Etiquetas:** Tag 40x60 2c Roupas Preço


