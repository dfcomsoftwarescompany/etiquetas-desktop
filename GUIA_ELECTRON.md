# 🚀 Guia Prático - Electron.js + Argox OS-2140

## 📦 Setup Inicial

### 1. Criar Projeto

```bash
mkdir etiquetas-electron
cd etiquetas-electron
npm init -y
```

### 2. Instalar Dependências

```bash
# Electron e ferramentas
npm install electron --save-dev
npm install electron-builder --save-dev

# Impressão e QR Code
npm install printer
npm install canvas
npm install qrcode

# Utilitários
npm install node-gyp --save-dev
```

**Nota Windows:** `canvas` requer Python e Visual Studio Build Tools:
```bash
npm install --global windows-build-tools
```

---

## 📁 Estrutura do Projeto

```
etiquetas-electron/
├── package.json
├── main.js                    # Processo principal Electron
├── preload.js                 # Ponte de comunicação segura
├── src/
│   ├── index.html            # Interface principal
│   ├── app.js                # Lógica do renderer
│   ├── styles.css            # Estilos
│   └── services/
│       ├── printerService.js # Serviço de impressão
│       └── qrcodeService.js  # Geração de QR Code
└── build/
    └── icon.ico              # Ícone do app
```

---

## 🔧 Implementação

### package.json

```json
{
  "name": "etiquetas-electron",
  "version": "1.0.0",
  "description": "Sistema de Etiquetas Argox OS-2140",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --dev",
    "build": "electron-builder",
    "build:win": "electron-builder --win"
  },
  "build": {
    "appId": "com.dfcom.etiquetas",
    "productName": "Etiquetas Desktop",
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    }
  },
  "dependencies": {
    "canvas": "^2.11.2",
    "printer": "^0.4.0",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1"
  }
}
```

### main.js (Processo Principal)

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const PrinterService = require('./src/services/printerService');

let mainWindow;
const printerService = new PrinterService();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 500,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        resizable: false,
        icon: path.join(__dirname, 'build/icon.ico')
    });

    mainWindow.loadFile('src/index.html');

    // DevTools em desenvolvimento
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

// IPC Handlers
ipcMain.handle('get-printers', async () => {
    return printerService.getInstalledPrinters();
});

ipcMain.handle('print-label', async (event, { printer, texto, codigo, largura, altura }) => {
    try {
        await printerService.printLabel(printer, texto, codigo, largura, altura);
        return { success: true };
    } catch (error) {
        console.error('Erro ao imprimir:', error);
        return { success: false, error: error.message };
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
```

### preload.js (Ponte Segura)

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Expõe API segura para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Lista impressoras instaladas
    getInstalledPrinters: () => ipcRenderer.invoke('get-printers'),
    
    // Imprime etiqueta
    printLabel: (printer, texto, codigo, largura, altura) => 
        ipcRenderer.invoke('print-label', { printer, texto, codigo, largura, altura })
});
```

### src/services/printerService.js

```javascript
const printer = require('printer');
const { createCanvas } = require('canvas');
const QRCode = require('qrcode');

class PrinterService {
    constructor() {
        this.dpi = 203; // DPI da Argox OS-2140
    }

    /**
     * Retorna lista de impressoras instaladas
     */
    getInstalledPrinters() {
        try {
            const printers = printer.getPrinters();
            return printers.map(p => ({
                name: p.name,
                isDefault: p.isDefault,
                status: p.status
            }));
        } catch (error) {
            console.error('Erro ao listar impressoras:', error);
            return [];
        }
    }

    /**
     * Imprime etiqueta com QR Code e texto
     * @param {string} printerName - Nome da impressora
     * @param {string} texto - Texto principal
     * @param {string} codigo - Código para QR Code
     * @param {number} larguraMm - Largura em mm (padrão: 100)
     * @param {number} alturaMm - Altura em mm (padrão: 50)
     */
    async printLabel(printerName, texto, codigo, larguraMm = 100, alturaMm = 50) {
        // Valida impressora
        const printers = this.getInstalledPrinters();
        const printerExists = printers.some(p => p.name === printerName);
        
        if (!printerExists) {
            throw new Error(`Impressora '${printerName}' não encontrada`);
        }

        // Converte mm para pixels
        const width = Math.floor(larguraMm / 25.4 * this.dpi);
        const height = Math.floor(alturaMm / 25.4 * this.dpi);

        // Cria canvas
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Configurações de qualidade
        ctx.antialias = 'subpixel';
        ctx.patternQuality = 'best';
        ctx.quality = 'best';

        // Fundo branco
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        // Gera QR Code
        const qrSize = Math.min(width * 0.4, height * 0.8);
        const qrCanvas = createCanvas(150, 150);
        await QRCode.toCanvas(qrCanvas, codigo, {
            width: 150,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Desenha QR Code (centralizado verticalmente, à esquerda)
        const qrX = 10;
        const qrY = (height - qrSize) / 2;
        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

        // Desenha texto principal
        const textX = qrX + qrSize + 20;
        const textY = qrY + 30;

        ctx.fillStyle = 'black';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(texto, textX, textY);

        // Desenha código
        ctx.font = '20px Arial';
        ctx.fillText(codigo, textX, textY + 40);

        // Converte para buffer PNG
        const buffer = canvas.toBuffer('image/png');

        // Envia para impressora
        return new Promise((resolve, reject) => {
            printer.printDirect({
                data: buffer,
                printer: printerName,
                type: 'PNG',
                success: (jobID) => {
                    console.log(`Trabalho de impressão enviado: ${jobID}`);
                    resolve(jobID);
                },
                error: (error) => {
                    console.error('Erro ao imprimir:', error);
                    reject(new Error(`Falha na impressão: ${error}`));
                }
            });
        });
    }

    /**
     * Verifica status de uma impressora
     */
    getPrinterStatus(printerName) {
        const printers = this.getInstalledPrinters();
        const printer = printers.find(p => p.name === printerName);
        return printer ? printer.status : null;
    }
}

module.exports = PrinterService;
```

### src/index.html

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etiquetas Desktop - Argox OS-2140</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🖨️ Etiquetas Desktop</h1>
            <p>Argox OS-2140 PPLA</p>
        </header>

        <main>
            <div class="form-group">
                <label for="impressora">Impressora:</label>
                <div class="input-with-button">
                    <select id="impressora">
                        <option value="">Carregando...</option>
                    </select>
                    <button id="btnAtualizar" class="btn-icon" title="Atualizar lista">↻</button>
                </div>
            </div>

            <div class="form-group">
                <label for="texto">Texto da Etiqueta:</label>
                <input type="text" id="texto" value="Produto Teste" placeholder="Digite o texto">
            </div>

            <div class="form-group">
                <label for="codigo">Código de Barras:</label>
                <input type="text" id="codigo" value="123456789" placeholder="Digite o código">
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="largura">Largura (mm):</label>
                    <input type="number" id="largura" value="100" min="20" max="200">
                </div>

                <div class="form-group">
                    <label for="altura">Altura (mm):</label>
                    <input type="number" id="altura" value="50" min="10" max="200">
                </div>
            </div>

            <button id="btnImprimir" class="btn-primary">
                🖨️ Imprimir Etiqueta
            </button>

            <div id="status" class="status"></div>
        </main>

        <footer>
            <p>Versão 1.0.0 | DFCOM</p>
        </footer>
    </div>

    <script src="app.js"></script>
</body>
</html>
```

### src/app.js

```javascript
// Variáveis globais
let impressoras = [];

// Carrega impressoras ao iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await carregarImpressoras();
    configurarEventos();
});

// Configura event listeners
function configurarEventos() {
    document.getElementById('btnAtualizar').addEventListener('click', carregarImpressoras);
    document.getElementById('btnImprimir').addEventListener('click', imprimir);
}

// Carrega lista de impressoras
async function carregarImpressoras() {
    try {
        setStatus('Carregando impressoras...', 'info');
        
        impressoras = await window.electronAPI.getInstalledPrinters();
        
        const select = document.getElementById('impressora');
        select.innerHTML = '';

        if (impressoras.length === 0) {
            select.innerHTML = '<option value="">Nenhuma impressora encontrada</option>';
            setStatus('Nenhuma impressora encontrada', 'error');
            return;
        }

        impressoras.forEach(printer => {
            const option = document.createElement('option');
            option.value = printer.name;
            option.textContent = printer.name;
            
            // Seleciona Argox automaticamente
            if (printer.name.toLowerCase().includes('argox')) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });

        setStatus(`${impressoras.length} impressora(s) encontrada(s)`, 'success');
    } catch (error) {
        console.error('Erro ao carregar impressoras:', error);
        setStatus('Erro ao carregar impressoras', 'error');
    }
}

// Imprime etiqueta
async function imprimir() {
    const impressora = document.getElementById('impressora').value;
    const texto = document.getElementById('texto').value.trim();
    const codigo = document.getElementById('codigo').value.trim();
    const largura = parseInt(document.getElementById('largura').value);
    const altura = parseInt(document.getElementById('altura').value);

    // Validações
    if (!impressora) {
        setStatus('Selecione uma impressora', 'error');
        return;
    }

    if (!texto) {
        setStatus('Informe o texto da etiqueta', 'error');
        document.getElementById('texto').focus();
        return;
    }

    if (!codigo) {
        setStatus('Informe o código de barras', 'error');
        document.getElementById('codigo').focus();
        return;
    }

    // Desabilita botão durante impressão
    const btnImprimir = document.getElementById('btnImprimir');
    btnImprimir.disabled = true;
    btnImprimir.textContent = 'Imprimindo...';
    setStatus('Enviando para impressora...', 'info');

    try {
        const result = await window.electronAPI.printLabel(
            impressora,
            texto,
            codigo,
            largura,
            altura
        );

        if (result.success) {
            setStatus('✓ Etiqueta enviada com sucesso!', 'success');
        } else {
            setStatus(`Erro: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao imprimir:', error);
        setStatus(`Erro: ${error.message}`, 'error');
    } finally {
        btnImprimir.disabled = false;
        btnImprimir.textContent = '🖨️ Imprimir Etiqueta';
    }
}

// Define status visual
function setStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // Remove após 5 segundos se for sucesso
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 5000);
    }
}
```

### src/styles.css

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    width: 100%;
    max-width: 500px;
    overflow: hidden;
}

header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 25px;
    text-align: center;
}

header h1 {
    font-size: 24px;
    margin-bottom: 5px;
}

header p {
    font-size: 14px;
    opacity: 0.9;
}

main {
    padding: 30px;
}

.form-group {
    margin-bottom: 20px;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
    font-size: 14px;
}

input, select {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.3s;
}

input:focus, select:focus {
    outline: none;
    border-color: #667eea;
}

.input-with-button {
    display: flex;
    gap: 10px;
}

.input-with-button select {
    flex: 1;
}

.btn-icon {
    padding: 12px 15px;
    background: #f0f0f0;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: background 0.3s;
}

.btn-icon:hover {
    background: #e0e0e0;
}

.btn-primary {
    width: 100%;
    padding: 15px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    margin-top: 10px;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.status {
    margin-top: 20px;
    padding: 12px;
    border-radius: 6px;
    text-align: center;
    font-size: 14px;
    min-height: 20px;
}

.status.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.status.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.status.info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}

footer {
    background: #f8f9fa;
    padding: 15px;
    text-align: center;
    border-top: 1px solid #e0e0e0;
}

footer p {
    font-size: 12px;
    color: #666;
}
```

---

## 🚀 Executar Projeto

### Modo Desenvolvimento

```bash
npm start
# ou com DevTools
npm run dev
```

### Compilar para Distribuição

```bash
# Windows (NSIS installer)
npm run build:win

# Resultado em: dist/Etiquetas Desktop Setup 1.0.0.exe
```

---

## 🐛 Troubleshooting Electron

### Erro: `Error: A dynamic link library (DLL) initialization routine failed`

**Causa:** canvas não compilou corretamente no Windows

**Solução:**
```bash
npm install --global windows-build-tools
npm rebuild canvas
```

### Erro: `Cannot find module 'printer'`

**Causa:** Módulo nativo precisa ser reconstruído para Electron

**Solução:**
```bash
npm install electron-rebuild --save-dev
npx electron-rebuild
```

### Impressora não imprime

**Verificar:**
1. Impressora está em `Get-Printer`?
2. Driver correto instalado (PPLA)?
3. Porta USB funcionando?
4. Testar impressão pelo Windows primeiro

---

## 📊 Comparação .NET vs Electron

| Aspecto | .NET (C#) | Electron.js |
|---------|-----------|-------------|
| Performance | ⭐⭐⭐⭐⭐ Excelente | ⭐⭐⭐⭐ Muito boa |
| Tamanho | ~50MB | ~150MB |
| Startup | Rápido | Médio |
| Desenvolvimento | Visual Studio | VSCode |
| Cross-platform | Windows only | Win/Mac/Linux |
| Comunidade | Grande | Enorme |
| Manutenção | Fácil | Fácil |

**Recomendação:** 
- **Apenas Windows** → .NET
- **Multi-plataforma** → Electron

---

## ✅ Checklist de Implementação

- [ ] Node.js 18+ instalado
- [ ] Python + Build Tools instalados
- [ ] Projeto criado com `npm init`
- [ ] Dependências instaladas
- [ ] Arquivo `main.js` criado
- [ ] Arquivo `preload.js` criado
- [ ] Serviço `printerService.js` implementado
- [ ] Interface HTML criada
- [ ] Estilos CSS aplicados
- [ ] Lógica `app.js` implementada
- [ ] Testado com `npm start`
- [ ] Impressora Argox detectada
- [ ] Etiqueta impressa com sucesso
- [ ] Build gerado com `npm run build`

---

**Pronto para começar! 🚀**

