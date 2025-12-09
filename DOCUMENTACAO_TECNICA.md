# Documentação Técnica - Sistema de Impressão de Etiquetas Argox OS-2140

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura da Solução](#arquitetura-da-solução)
3. [Fluxo de Impressão](#fluxo-de-impressão)
4. [Implementação .NET](#implementação-net)
5. [Implementação Electron.js](#implementação-electronjs)
6. [Especificações Técnicas](#especificações-técnicas)
7. [Troubleshooting](#troubleshooting)

---

## 1. Visão Geral

### 1.1. Objetivo
Sistema desktop para impressão de etiquetas térmicas com QR Code e texto em impressora Argox OS-2140 PPLA.

### 1.2. Tecnologias
- **Impressora**: Argox OS-2140 (203 DPI, emulação PPLA)
- **Driver**: Driver oficial Argox PPLA para Windows
- **Linguagem**: C# .NET 8 / Electron.js + Node.js
- **Protocolo**: Sistema de impressão Windows (PrintDocument API)

### 1.3. Requisitos
- Windows 10/11
- .NET 8 Runtime (para aplicativo .NET)
- Node.js 18+ (para Electron.js)
- Driver Argox OS-2140 PPLA instalado
- Conexão USB

---

## 2. Arquitetura da Solução

### 2.1. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    APLICAÇÃO DESKTOP                         │
│  ┌────────────────────┐         ┌──────────────────────┐   │
│  │   Interface UI     │────────▶│  Serviço Impressão   │   │
│  │  - ComboBox        │         │  - Gera QR Code      │   │
│  │  - TextBoxes       │         │  - Desenha Graphics  │   │
│  │  - Botão Imprimir  │         │  - PrintDocument     │   │
│  └────────────────────┘         └──────────┬───────────┘   │
└─────────────────────────────────────────────┼───────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA OPERACIONAL WINDOWS                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Windows Print Spooler                      │   │
│  │  - Gerencia fila de impressão                        │   │
│  │  - Converte para formato do driver                   │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          │                                   │
│  ┌───────────────────────▼──────────────────────────────┐   │
│  │         Driver Argox OS-2140 PPLA                     │   │
│  │  - Converte Graphics para comandos PPLA              │   │
│  │  - Gerencia configurações (temperatura, velocidade)  │   │
│  │  - Controla comunicação USB                          │   │
│  └───────────────────────┬──────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │ USB
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  IMPRESSORA FÍSICA                           │
│                  Argox OS-2140 PPLA                          │
│  - Recebe comandos PPLA                                      │
│  - Renderiza etiqueta (203 DPI)                              │
│  - Imprime termicamente                                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. Camadas de Abstração

**Camada 1: Aplicação**
- Responsabilidade: Interface com usuário e lógica de negócio
- Tecnologia: C# Windows Forms / Electron.js + React/Vue

**Camada 2: Renderização**
- Responsabilidade: Converter dados em imagem
- Tecnologia: System.Drawing (C#) / Canvas/node-canvas (Node.js)

**Camada 3: Sistema de Impressão**
- Responsabilidade: Gerenciar trabalhos de impressão
- Tecnologia: Windows Print Spooler

**Camada 4: Driver**
- Responsabilidade: Protocolo específico da impressora
- Tecnologia: Driver oficial Argox PPLA

**Camada 5: Hardware**
- Responsabilidade: Impressão física
- Tecnologia: Impressora térmica Argox OS-2140

---

## 3. Fluxo de Impressão

### 3.1. Fluxo Completo

```
[1] Usuário clica "Imprimir"
    ↓
[2] Validação de dados (texto, código, impressora)
    ↓
[3] Geração do QR Code (biblioteca ZXing/.NET ou qrcode.js)
    ↓
[4] Criação do contexto gráfico (Graphics/Canvas)
    ↓
[5] Desenho dos elementos:
    - Background branco
    - QR Code (esquerda, centralizado verticalmente)
    - Texto principal (direita, negrito)
    - Código (abaixo do texto)
    ↓
[6] PrintDocument.Print() / printer.print()
    ↓
[7] Windows Spooler recebe trabalho
    ↓
[8] Driver Argox converte para PPLA:
    - Comandos de configuração (temperatura, velocidade)
    - Comandos de posicionamento
    - Dados bitmap para QR Code
    - Comandos de texto
    ↓
[9] Transmissão USB para impressora
    ↓
[10] Impressora processa e imprime
    ↓
[11] Callback de sucesso/erro para aplicação
    ↓
[12] Feedback visual ao usuário
```

### 3.2. Exemplo de Comandos PPLA Gerados pelo Driver

```ppla
STX                     # Início da etiqueta
W800                    # Largura: 800 dots (100mm @ 203dpi)
H400                    # Altura: 400 dots (50mm @ 203dpi)
S4                      # Velocidade: 4
D10                     # Temperatura: 10
N                       # Limpa buffer
103010001501500100100G  # Bitmap do QR Code (comprimido)
120050000300100100Produto Teste  # Texto
120080000200100100123456789      # Código
E1                      # Imprime 1 cópia
ETX                     # Fim da etiqueta
```

**Nota:** O aplicativo NÃO gera esses comandos manualmente. O driver faz isso automaticamente!

---

## 4. Implementação .NET

### 4.1. Estrutura do Projeto

```
EtiquetasDesktop/
├── EtiquetasDesktop.csproj
├── Program.cs
├── Services/
│   ├── ArgoxPrinterService.cs    # Lógica de impressão
│   └── UpdateService.cs           # Atualização automática
├── Forms/
│   └── MainForm.cs                # Interface gráfica
└── Models/
    └── VersionInfo.cs             # Modelo de dados
```

### 4.2. Classe Principal: ArgoxPrinterService

```csharp
public class ArgoxPrinterService
{
    private readonly string _printerName;
    
    // Método principal de impressão
    public bool PrintLabel(string texto, string codigoBarras, 
                          int larguraMm, int alturaMm)
    {
        // 1. Cria documento de impressão
        var printDocument = new PrintDocument();
        printDocument.PrinterSettings.PrinterName = _printerName;
        
        // 2. Valida impressora
        if (!printDocument.PrinterSettings.IsValid)
            throw new InvalidOperationException("Impressora indisponível");
        
        // 3. Configura tamanho do papel
        ConfigurarTamanhoPapel(printDocument, larguraMm, alturaMm);
        
        // 4. Registra handler de renderização
        printDocument.PrintPage += PrintDocument_PrintPage;
        
        // 5. Envia para impressão
        printDocument.Print();
        
        return true;
    }
    
    // Método de renderização
    private void PrintDocument_PrintPage(object sender, PrintPageEventArgs e)
    {
        Graphics g = e.Graphics;
        
        // Configurações de qualidade
        g.PageUnit = GraphicsUnit.Pixel;
        g.SmoothingMode = SmoothingMode.HighQuality;
        g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
        
        // Gera QR Code
        var qrBitmap = GerarQRCode(_codigoBarras);
        
        // Desenha elementos
        g.Clear(Color.White);
        g.DrawImage(qrBitmap, x, y, width, height);
        g.DrawString(_texto, font, brush, textX, textY);
        
        e.HasMorePages = false;
    }
}
```

### 4.3. Tecnologias Utilizadas

| Componente | Biblioteca | Versão |
|------------|-----------|--------|
| Framework | .NET | 8.0 |
| Interface | Windows Forms | Built-in |
| QR Code | ZXing.Net | 0.16.11 |
| Drawing | System.Drawing.Common | 10.0.0 |
| HTTP | System.Net.Http.Json | Built-in |

### 4.4. APIs Principais

**System.Drawing.Printing.PrintDocument**
- Classe central do sistema de impressão
- Permite renderização via Graphics
- Integra com spooler do Windows

**System.Drawing.Graphics**
- API de desenho 2D
- Suporta texto, imagens, formas
- Hardware-accelerated quando possível

**PrinterSettings**
- Gerencia configurações da impressora
- Lista impressoras disponíveis
- Valida status e capacidades

---

## 5. Implementação Electron.js

### 5.1. Estrutura do Projeto

```
etiquetas-electron/
├── package.json
├── main.js                    # Processo principal
├── preload.js                 # Ponte IPC
├── renderer/
│   ├── index.html            # Interface
│   ├── app.js                # Lógica do renderer
│   └── styles.css            # Estilos
└── services/
    ├── printerService.js     # Serviço de impressão
    └── qrcodeService.js      # Geração QR Code
```

### 5.2. Abordagens Possíveis

#### **Opção 1: node-printer (Recomendado para Windows)**

```javascript
// services/printerService.js
const printer = require('printer');
const { createCanvas } = require('canvas');
const QRCode = require('qrcode');

class ArgoxPrinterService {
    async printLabel(printerName, texto, codigo, larguraMm, alturaMm) {
        // 1. Cria canvas
        const dpi = 203;
        const width = Math.floor(larguraMm / 25.4 * dpi);
        const height = Math.floor(alturaMm / 25.4 * dpi);
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // 2. Fundo branco
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // 3. Gera e desenha QR Code
        const qrCanvas = createCanvas(150, 150);
        await QRCode.toCanvas(qrCanvas, codigo);
        ctx.drawImage(qrCanvas, 10, (height - 150) / 2);
        
        // 4. Desenha texto
        ctx.fillStyle = 'black';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(texto, 170, 60);
        
        ctx.font = '20px Arial';
        ctx.fillText(codigo, 170, 100);
        
        // 5. Converte para buffer
        const buffer = canvas.toBuffer('image/png');
        
        // 6. Envia para impressora
        printer.printDirect({
            data: buffer,
            printer: printerName,
            type: 'PNG',
            success: () => console.log('Impresso!'),
            error: (err) => console.error('Erro:', err)
        });
    }
    
    static getInstalledPrinters() {
        return printer.getPrinters();
    }
}

module.exports = ArgoxPrinterService;
```

#### **Opção 2: electron print API (Simples mas limitado)**

```javascript
// main.js
const { BrowserWindow } = require('electron');

async function printLabel(texto, codigo) {
    // 1. Cria janela invisível
    const win = new BrowserWindow({
        show: false,
        webPreferences: { offscreen: true }
    });
    
    // 2. Carrega HTML com etiqueta
    await win.loadURL(`data:text/html,
        <html>
        <body style="margin:0; padding:20px;">
            <div id="qrcode"></div>
            <h2>${texto}</h2>
            <p>${codigo}</p>
        </body>
        <script src="qrcode.min.js"></script>
        <script>
            new QRCode(document.getElementById("qrcode"), "${codigo}");
        </script>
        </html>
    `);
    
    // 3. Imprime
    win.webContents.print({
        silent: false,
        printBackground: true,
        deviceName: 'Argox OS-2140 PPLA'
    });
}
```

#### **Opção 3: node-native-printer (Máximo controle)**

```javascript
const printer = require('node-native-printer');

// Acesso direto ao driver Windows
printer.print({
    printer: 'Argox OS-2140 PPLA',
    data: canvasBuffer,
    type: 'RAW',
    options: {
        media: '100mmx50mm',
        collate: false,
        copies: 1
    }
});
```

### 5.3. Package.json

```json
{
  "name": "etiquetas-electron",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "dependencies": {
    "electron": "^28.0.0",
    "printer": "^0.4.0",
    "canvas": "^2.11.2",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "electron-builder": "^24.9.1"
  }
}
```

### 5.4. IPC (Comunicação Main ↔ Renderer)

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('printer', {
    getInstalledPrinters: () => ipcRenderer.invoke('get-printers'),
    printLabel: (printer, texto, codigo) => 
        ipcRenderer.invoke('print-label', { printer, texto, codigo })
});

// renderer/app.js
async function imprimir() {
    const printer = document.getElementById('impressora').value;
    const texto = document.getElementById('texto').value;
    const codigo = document.getElementById('codigo').value;
    
    try {
        await window.printer.printLabel(printer, texto, codigo);
        alert('Etiqueta enviada!');
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}
```

---

## 6. Especificações Técnicas

### 6.1. Impressora Argox OS-2140

| Especificação | Valor |
|---------------|-------|
| Resolução | 203 DPI |
| Largura máxima | 104 mm (832 dots) |
| Velocidade | 127 mm/s |
| Memória | 4 MB Flash + 8 MB SDRAM |
| Interfaces | USB 2.0, RS-232 |
| Emulações | PPLA, PPLB, PPLZ |
| Sistema operacional | Windows, Linux, macOS |

### 6.2. Comandos PPLA (Referência)

| Comando | Função | Exemplo |
|---------|--------|---------|
| `STX` (0x02) | Início da etiqueta | - |
| `W` | Define largura | `W800` = 800 dots |
| `H` | Define altura | `H400` = 400 dots |
| `S` | Velocidade (1-6) | `S4` = média |
| `D` | Temperatura (1-20) | `D10` = média |
| `N` | Limpa buffer | - |
| `1` | Texto | `1X0100Y0100...` |
| `B` | Código de barras | `BX0100Y0100...` |
| `G` | Gráfico/bitmap | `GX0100Y0100...` |
| `E` | Imprime N cópias | `E1` = 1 cópia |
| `ETX` (0x03) | Fim da etiqueta | - |

**Importante:** Na nossa abordagem, o driver gera esses comandos automaticamente!

### 6.3. Conversões

**DPI para Dots:**
```
dots = mm × (DPI / 25.4)

Exemplo: 100mm @ 203 DPI
dots = 100 × (203 / 25.4) = 800 dots
```

**Pixels para MM:**
```
mm = pixels × 25.4 / DPI

Exemplo: 800 pixels @ 203 DPI
mm = 800 × 25.4 / 203 = 100 mm
```

### 6.4. Configurações Recomendadas

| Parâmetro | Valor | Observação |
|-----------|-------|------------|
| Temperatura | 10-12 | ↑ se muito claro, ↓ se borrando |
| Velocidade | 4 | Equilíbrio qualidade/velocidade |
| Largura etiqueta | 100mm | Padrão mais comum |
| Altura etiqueta | 50mm | Padrão mais comum |
| Margem | 0mm | Aproveita área total |
| QR Code tamanho | 40% largura | Proporcional |

---

## 7. Troubleshooting

### 7.1. Problemas Comuns

**Problema: Impressora não aparece na lista**
```
Causa: Driver não instalado ou impressora desconectada
Solução:
1. Verificar conexão USB
2. Instalar driver oficial Argox PPLA
3. Reiniciar serviço spooler: net stop spooler && net start spooler
```

**Problema: Etiqueta sai em branco**
```
Causa: Temperatura muito baixa ou modo de emulação errado
Solução:
1. Verificar modo PPLA (não PPLB/PPLZ)
2. Aumentar temperatura para 12-14
3. Verificar tipo de etiqueta (térmica direta vs transferência)
```

**Problema: Impressão cortada ou desalinhada**
```
Causa: Tamanho do papel incorreto ou calibração
Solução:
1. Calibrar impressora (FEED ao ligar)
2. Ajustar tamanho nas propriedades
3. Verificar posição das etiquetas no suporte
```

**Problema: Erro de comunicação USB**
```
Causa: Driver USB ou porta com problema
Solução:
1. Trocar porta USB (preferir USB 2.0)
2. Atualizar drivers chipset da placa-mãe
3. Desabilitar suspend USB no Gerenciador de Dispositivos
```

### 7.2. Logs e Diagnóstico

**Windows Event Viewer:**
```powershell
# Ver erros de impressão
Get-WinEvent -LogName "Microsoft-Windows-PrintService/Operational" -MaxEvents 50
```

**Verificar fila:**
```powershell
Get-PrintJob -PrinterName "Argox OS-2140 PPLA"
```

**Limpar fila travada:**
```powershell
Get-PrintJob -PrinterName "Argox OS-2140 PPLA" | Remove-PrintJob
net stop spooler
net start spooler
```

### 7.3. Performance

**Tempo típico de impressão:**
- Geração QR Code: ~50ms
- Renderização gráfica: ~100ms
- Envio ao driver: ~50ms
- Processamento PPLA: ~200ms
- Impressão física: ~1-2 segundos
- **Total: ~2-3 segundos por etiqueta**

**Otimizações:**
1. Cache de QR Codes repetidos
2. Pré-processamento em background
3. Batch printing (múltiplas etiquetas)
4. Ajustar densidade/velocidade conforme qualidade necessária

---

## 8. Referências

### 8.1. Documentação Oficial
- [Argox Programming Guide](https://www.argox.com.br/suporte)
- [PPLA Command Reference](https://www.argox.com.br/manuais)
- [Microsoft PrintDocument](https://learn.microsoft.com/en-us/dotnet/api/system.drawing.printing.printdocument)

### 8.2. Bibliotecas Utilizadas
- [ZXing.Net](https://github.com/micjahn/ZXing.Net) - Geração QR Code
- [System.Drawing.Common](https://www.nuget.org/packages/System.Drawing.Common)
- [node-printer](https://www.npmjs.com/package/printer) - Impressão Node.js
- [node-canvas](https://github.com/Automattic/node-canvas) - Canvas para Node.js

### 8.3. Códigos de Exemplo
- Projeto .NET: `C:\Users\matheussilva\Documents\projetos\dfcom\etiquetas-desktop\EtiquetasDesktop`
- Projeto Delphi (referência): `C:\Users\matheussilva\Documents\projetos\dfcom\etiquetas-desktop\Etiquetas_Delphi`

---

## 9. Conclusão

### 9.1. Lições Aprendidas

✅ **O que FUNCIONA:**
- Usar o driver Windows como intermediário
- Renderizar via Graphics/Canvas (alto nível)
- Deixar o driver converter para PPLA

❌ **O que NÃO funciona bem:**
- Gerar comandos PPLA manualmente
- Enviar bytes raw sem driver
- Ignorar validações de impressora

### 9.2. Recomendações

**Para .NET:**
- Use `PrintDocument` + `System.Drawing`
- Bibliotecas: ZXing.Net para QR Code
- Framework: Windows Forms ou WPF

**Para Electron/Node.js:**
- Use `node-printer` + `canvas`
- Biblioteca: `qrcode` para QR Code
- IPC para comunicação main/renderer

**Para Web:**
- Não é possível controlar impressora diretamente
- Use backend (API) com .NET ou Node.js
- Frontend envia dados via HTTP

---

**Autor:** Sistema de Etiquetas DFCOM  
**Versão:** 1.0.0  
**Data:** Dezembro 2025  
**Licença:** Uso interno

