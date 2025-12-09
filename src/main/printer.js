const { createCanvas } = require('canvas');
const QRCode = require('qrcode');
const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

/**
 * Gerenciador de impressoras para Argox OS-2140
 * ABORDAGEM CORRETA: Canvas + Electron Print API
 * 
 * Etiquetas: 40mm x 60mm (Tag Roupas/Preço)
 * Layout: TOPO (44mm) Info + EMBAIXO (16mm) Preço
 */
class PrinterManager {
  constructor() {
    this.tempDir = os.tmpdir();
    
    // Configurações da etiqueta
    // Etiqueta individual: 40x60mm
    // Papel: 80mm (2 colunas de 40mm)
    this.config = {
      dpi: 203,
      larguraMm: 40,
      alturaMm: 60,
      larguraPx: 320,  // 40mm * (203/25.4) ≈ 320 pixels
      alturaPx: 480,   // 60mm * (203/25.4) ≈ 480 pixels
      papelLarguraMm: 80,  // Papel com 2 colunas
      papelLarguraPx: 640, // 80mm * (203/25.4) ≈ 640 pixels
      colunas: 2
    };
    
    console.log('[PrinterManager] Inicializado com Canvas + Electron Print API');
  }

  mmToPixels(mm) {
    return Math.round(mm * (this.config.dpi / 25.4));
  }

  async listPrinters() {
    return new Promise((resolve, reject) => {
      console.log('[PrinterManager] Listando impressoras via PowerShell...');
      
      const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer | Select-Object Name, PortName, DriverName, PrinterStatus | ConvertTo-Json -Compress"`;

      exec(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error('[PrinterManager] Erro ao listar:', error.message);
          resolve([]);
          return;
        }

        try {
          const output = stdout.trim();
          
          if (!output || output === '[]' || output === 'null') {
            resolve([]);
            return;
          }
          
          let printers = JSON.parse(output);
          
          if (!Array.isArray(printers)) {
            printers = [printers];
          }
          
          const formatted = printers.map(p => ({
            Name: p.Name,
            PortName: p.PortName || 'N/A',
            DriverName: p.DriverName || 'N/A',
            PrinterStatus: p.PrinterStatus || 'Ready',
            Default: false
          }));
          
          console.log(`[PrinterManager] ${formatted.length} impressora(s) encontrada(s):`);
          formatted.forEach(p => console.log(`  - ${p.Name} (${p.PortName})`));
          
          resolve(formatted);
        } catch (parseError) {
          console.error('[PrinterManager] Erro ao parsear:', parseError.message);
          resolve([]);
        }
      });
    });
  }

  /**
   * Gera etiqueta individual (uma coluna)
   */
  async generateSingleLabelCanvas(labelData) {
    const {
      texto = 'PRODUTO',
      codigo = '123456789',
      preco = '',
      tamanho = '',
    } = labelData;

    const canvas = createCanvas(this.config.larguraPx, this.config.alturaPx);
    const ctx = canvas.getContext('2d');

    ctx.antialias = 'subpixel';
    ctx.patternQuality = 'best';

    // ========== ROTAÇÃO 180° (CABEÇA PRA BAIXO) ==========
    ctx.translate(this.config.larguraPx, this.config.alturaPx);
    ctx.rotate(Math.PI);

    // ========== CONFIGURAÇÕES ==========
    const margin = 16;
    const areaInfoAltura = 350;   // 44mm TOPO
    const areaPrecoAltura = 130;  // 16mm EMBAIXO
    const qrSize = 130;
    
    // FUNDO BRANCO
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.config.larguraPx, this.config.alturaPx);

    // ========== ÁREA SUPERIOR (44mm) - INFORMAÇÕES ==========
    
    // TÍTULO DFCOM - FONTE MAIOR
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('DFCOM', this.config.larguraPx / 2, 10);

    // Linha decorativa
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin + 40, 48);
    ctx.lineTo(this.config.larguraPx - margin - 40, 48);
    ctx.stroke();

    // QR CODE CENTRALIZADO
    const qrCanvas = createCanvas(qrSize, qrSize);
    await QRCode.toCanvas(qrCanvas, codigo, {
      width: qrSize,
      margin: 0,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H'
    });

    const qrX = (this.config.larguraPx - qrSize) / 2;
    const qrY = 65;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // INFORMAÇÕES ABAIXO DO QR - FONTES MAIORES
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let currentY = qrY + qrSize + 14;

    // REF - FONTE BEM MAIOR
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`REF: ${codigo}`, this.config.larguraPx / 2, currentY);
    currentY += 32;

    // Nome do Produto - FONTE BEM MAIOR E NEGRITO
    ctx.font = 'bold 20px Arial';
    const maxWidth = this.config.larguraPx - (margin * 2);
    const palavras = texto.split(' ');
    let linha = '';
    const linhaAltura = 24;
    let linhasDesenhadas = 0;
    const maxLinhas = 2;

    for (let i = 0; i < palavras.length && linhasDesenhadas < maxLinhas; i++) {
      const testeLinha = linha + palavras[i] + ' ';
      const metricas = ctx.measureText(testeLinha);
      
      if (metricas.width > maxWidth && linha !== '') {
        ctx.fillText(linha.trim(), this.config.larguraPx / 2, currentY);
        linha = palavras[i] + ' ';
        currentY += linhaAltura;
        linhasDesenhadas++;
      } else {
        linha = testeLinha;
      }
    }
    
    if (linha.trim() !== '' && linhasDesenhadas < maxLinhas) {
      ctx.fillText(linha.trim(), this.config.larguraPx / 2, currentY);
      currentY += linhaAltura;
    }

    // Tamanho - FONTE BEM MAIOR
    if (tamanho) {
      currentY += 10;
      ctx.font = 'bold 22px Arial';
      ctx.fillText(`TAMANHO: ${tamanho}`, this.config.larguraPx / 2, currentY);
    }

    // ========== LINHA DIVISÓRIA ==========
    const divisoriaY = areaInfoAltura;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, divisoriaY);
    ctx.lineTo(this.config.larguraPx, divisoriaY);
    ctx.stroke();

    // ========== ÁREA INFERIOR (16mm) - PREÇO ==========
    const areaPrecoY = divisoriaY;
    
    // Fundo cinza
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, areaPrecoY, this.config.larguraPx, areaPrecoAltura);

    // Preço MUITO GRANDE E NEGRITO
    const precoTexto = preco ? `R$ ${preco}` : 'R$ ___,__';
    ctx.fillStyle = preco ? 'black' : '#999999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 54px Arial';
    
    const precoX = this.config.larguraPx / 2;
    const precoY = areaPrecoY + (areaPrecoAltura / 2);
    ctx.fillText(precoTexto, precoX, precoY);

    // BORDA EXTERNA
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, this.config.larguraPx - 2, this.config.alturaPx - 2);

    return canvas;
  }

  /**
   * Gera canvas com 2 colunas (80mm de largura)
   * Duplica a mesma etiqueta lado a lado
   */
  async generateLabelCanvas(labelData) {
    // Cria canvas largo (80mm = 2 colunas de 40mm)
    const canvasLargo = createCanvas(this.config.papelLarguraPx, this.config.alturaPx);
    const ctxLargo = canvasLargo.getContext('2d');

    // Rotação 180° para todo o canvas
    ctxLargo.translate(this.config.papelLarguraPx, this.config.alturaPx);
    ctxLargo.rotate(Math.PI);

    // Gera etiqueta individual
    const etiquetaIndividual = await this.generateSingleLabelCanvas(labelData);

    // Desenha COLUNA 1 (esquerda)
    ctxLargo.drawImage(etiquetaIndividual, 0, 0);

    // Desenha COLUNA 2 (direita) - mesma etiqueta
    ctxLargo.drawImage(etiquetaIndividual, this.config.larguraPx, 0);

    console.log('[PrinterManager] Canvas gerado: 2 colunas (80mm x 60mm)');

    return canvasLargo;
  }

  /**
   * Etiqueta de teste (também em 2 colunas)
   */
  async generateTestCanvas() {
    // Cria canvas largo (80mm = 2 colunas)
    const canvas = createCanvas(this.config.papelLarguraPx, this.config.alturaPx);
    const ctx = canvas.getContext('2d');

    ctx.translate(this.config.papelLarguraPx, this.config.alturaPx);
    ctx.rotate(Math.PI);

    const margin = 16;
    const areaInfoAltura = 350;
    const areaPrecoAltura = 130;
    const qrSize = 130;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.config.papelLarguraPx, this.config.alturaPx);

    // Função auxiliar para desenhar uma coluna
    const desenharColuna = async (offsetX) => {
      // TÍTULO
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 30px Arial';
      ctx.fillText('DFCOM', offsetX + (this.config.larguraPx / 2), 10);

      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(offsetX + margin + 40, 48);
      ctx.lineTo(offsetX + this.config.larguraPx - margin - 40, 48);
      ctx.stroke();

      // QR CODE
      const qrCanvas = createCanvas(qrSize, qrSize);
      await QRCode.toCanvas(qrCanvas, 'TESTE-DFCOM', {
        width: qrSize,
        margin: 0,
        errorCorrectionLevel: 'H'
      });

      const qrX = offsetX + (this.config.larguraPx - qrSize) / 2;
      const qrY = 65;
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // INFO - FONTES MAIORES
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      let currentY = qrY + qrSize + 14;

      ctx.font = 'bold 24px Arial';
      ctx.fillText('REF: TEST001', offsetX + (this.config.larguraPx / 2), currentY);
      currentY += 32;

      ctx.font = 'bold 20px Arial';
      ctx.fillText('Etiqueta Teste', offsetX + (this.config.larguraPx / 2), currentY);
      currentY += 26;

      ctx.font = 'bold 22px Arial';
      ctx.fillText('TAMANHO: M', offsetX + (this.config.larguraPx / 2), currentY);

      // DIVISÓRIA
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(offsetX, areaInfoAltura);
      ctx.lineTo(offsetX + this.config.larguraPx, areaInfoAltura);
      ctx.stroke();

      // PREÇO
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(offsetX, areaInfoAltura, this.config.larguraPx, areaPrecoAltura);

      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 54px Arial';
      ctx.fillText('R$ 00,00', offsetX + (this.config.larguraPx / 2), areaInfoAltura + (areaPrecoAltura / 2));

      // BORDA COLUNA
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(offsetX + 1, 1, this.config.larguraPx - 2, this.config.alturaPx - 2);
    };

    // Desenha COLUNA 1 (esquerda)
    await desenharColuna(0);

    // Desenha COLUNA 2 (direita)
    await desenharColuna(this.config.larguraPx);

    return canvas;
  }

  async printCanvas(printerName, canvas, copies = 1) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[PrinterManager] Imprimindo em: ${printerName}`);
        console.log(`[PrinterManager] Cópias: ${copies}`);

        const dataUrl = canvas.toDataURL('image/png');

        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      width: 80mm; 
      height: 60mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    img { 
      width: 100%;
      height: 100%;
      display: block;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  </style>
</head>
<body>
  <img src="${dataUrl}" />
</body>
</html>`;

        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            offscreen: true,
            nodeIntegration: false
          }
        });

        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        printWindow.webContents.once('did-finish-load', () => {
          const printOptions = {
            silent: true,
            printBackground: true,
            deviceName: printerName,
            color: false,
            margins: { marginType: 'none' },
            pageSize: {
              width: 80000,  // 80mm (2 colunas)
              height: 60000  // 60mm
            },
            dpi: {
              horizontal: 203,
              vertical: 203
            },
            copies: copies,
            landscape: false,
            scaleFactor: 100,
            shouldPrintBackgrounds: true
          };

          printWindow.webContents.print(printOptions, (success, failureReason) => {
            printWindow.close();

            if (success) {
              console.log(`[PrinterManager] ✓ Impressão OK!`);
              resolve();
            } else {
              console.error(`[PrinterManager] ✗ Falha:`, failureReason);
              reject(new Error(`Falha: ${failureReason || 'Desconhecida'}`));
            }
          });
        });

        setTimeout(() => {
          if (!printWindow.isDestroyed()) {
            printWindow.close();
            reject(new Error('Timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  async printTestLabel(printerName) {
    try {
      const canvas = await this.generateTestCanvas();
      await this.printCanvas(printerName, canvas, 1);
      console.log('[PrinterManager] ✓ Teste OK!');
    } catch (error) {
      console.error('[PrinterManager] Erro teste:', error.message);
      throw error;
    }
  }

  async printLabel(printerName, labelData) {
    try {
      console.log('[PrinterManager] Gerando etiqueta:', labelData);
      const canvas = await this.generateLabelCanvas(labelData);
      
      const copies = parseInt(labelData.copies) || 1;
      await this.printCanvas(printerName, canvas, copies);
      
      console.log('[PrinterManager] ✓ Etiqueta(s) OK!');
    } catch (error) {
      console.error('[PrinterManager] Erro:', error.message);
      throw error;
    }
  }

  getConfig() {
    return { ...this.config };
  }

  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.larguraMm) {
      this.config.larguraPx = this.mmToPixels(newConfig.larguraMm);
    }
    if (newConfig.alturaMm) {
      this.config.alturaPx = this.mmToPixels(newConfig.alturaMm);
    }
  }

  async getPrinterStatus(printerName) {
    return new Promise((resolve) => {
      const cmd = `powershell -NoProfile -Command "Get-Printer -Name '${printerName.replace(/'/g, "''")}' | Select-Object -ExpandProperty PrinterStatus"`;
      
      exec(cmd, (error, stdout) => {
        resolve(error ? 'Error' : (stdout.trim() || 'Ready'));
      });
    });
  }
}

module.exports = PrinterManager;
