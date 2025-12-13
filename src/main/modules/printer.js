const { createCanvas } = require('canvas');
const QRCode = require('qrcode');
const { BrowserWindow } = require('electron');
const { exec } = require('child_process');

/**
 * Módulo de impressão - Argox OS-2140 PPLA
 * ABORDAGEM CORRETA: Canvas + Electron Print API + 2 Colunas
 * 
 * Etiquetas: 40x60mm em papel de 80mm (2 colunas)
 * Layout: TOPO (44mm) Info + EMBAIXO (16mm) Preço
 */
class PrinterManager {
  constructor() {
    // Configurações das etiquetas
    this.config = {
      dpi: 203,
      // Etiqueta individual
      labelWidth: 40,
      labelHeight: 60,
      labelWidthPx: 320,   // 40mm @ 203dpi
      labelHeightPx: 480,  // 60mm @ 203dpi
      // Papel completo (2 colunas)
      paperWidth: 80,
      paperWidthPx: 640,   // 80mm @ 203dpi
      columns: 2
    };
  }

  mmToPixels(mm) {
    return Math.round(mm * (this.config.dpi / 25.4));
  }

  /**
   * Lista impressoras do Windows
   */
  async listPrinters() {
    return new Promise((resolve) => {
      const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer | Select-Object Name, PortName, DriverName, PrinterStatus | ConvertTo-Json -Compress"`;

      exec(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 }, (error, stdout) => {
        if (error) {
          console.error('[Printer] Erro ao listar:', error.message);
          resolve([]);
          return;
        }

        try {
          let printers = JSON.parse(stdout.trim());
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
          
          resolve(formatted);
        } catch {
          resolve([]);
        }
      });
    });
  }

  /**
   * Gera etiqueta individual (1 coluna)
   */
  async generateSingleLabel(labelData) {
    // Sanitizar dados com valores padrão seguros
    const texto = (labelData.texto || labelData.descricao || 'PRODUTO').toString();
    const codigo = (labelData.codigo || labelData.codbarras || labelData.cod || '123456789').toString();
    const preco = (labelData.preco || labelData.valor || '0,00').toString();
    const tamanho = (labelData.tamanho || labelData.tam || '').toString();

    const canvas = createCanvas(this.config.labelWidthPx, this.config.labelHeightPx);
    const ctx = canvas.getContext('2d');

    ctx.antialias = 'subpixel';
    ctx.patternQuality = 'best';

    // NÃO rotaciona aqui - a rotação será feita no canvas completo

    const margin = 16;
    const areaInfoAltura = 350;   // 44mm no TOPO
    const areaPrecoAltura = 130;  // 16mm EMBAIXO
    const qrSize = 130;
    
    // Fundo branco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.config.labelWidthPx, this.config.labelHeightPx);

    // === ÁREA SUPERIOR (44mm) - INFORMAÇÕES ===
    
    // TÍTULO DFCOM
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('DFCOM', this.config.labelWidthPx / 2, 10);

    // Linha decorativa
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin + 40, 48);
    ctx.lineTo(this.config.labelWidthPx - margin - 40, 48);
    ctx.stroke();

    // QR CODE CENTRALIZADO
    const qrCanvas = createCanvas(qrSize, qrSize);
    await QRCode.toCanvas(qrCanvas, codigo, {
      width: qrSize,
      margin: 0,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H'
    });

    const qrX = (this.config.labelWidthPx - qrSize) / 2;
    const qrY = 65;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // INFORMAÇÕES ABAIXO DO QR
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let currentY = qrY + qrSize + 14;

    // REF - FONTE MAIOR
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`REF: ${codigo}`, this.config.labelWidthPx / 2, currentY);
    currentY += 32;

    // NOME - FONTE MAIOR E NEGRITO
    ctx.font = 'bold 20px Arial';
    const maxWidth = this.config.labelWidthPx - (margin * 2);
    const palavras = texto.split(' ');
    let linha = '';
    const linhaAltura = 24;
    let linhasDesenhadas = 0;
    const maxLinhas = 2;

    for (let i = 0; i < palavras.length && linhasDesenhadas < maxLinhas; i++) {
      const testeLinha = linha + palavras[i] + ' ';
      const metricas = ctx.measureText(testeLinha);
      
      if (metricas.width > maxWidth && linha !== '') {
        ctx.fillText(linha.trim(), this.config.labelWidthPx / 2, currentY);
        linha = palavras[i] + ' ';
        currentY += linhaAltura;
        linhasDesenhadas++;
      } else {
        linha = testeLinha;
      }
    }
    
    if (linha.trim() !== '' && linhasDesenhadas < maxLinhas) {
      ctx.fillText(linha.trim(), this.config.labelWidthPx / 2, currentY);
      currentY += linhaAltura;
    }

    // TAMANHO
    if (tamanho) {
      currentY += 10;
      ctx.font = 'bold 22px Arial';
      ctx.fillText(`TAMANHO: ${tamanho}`, this.config.labelWidthPx / 2, currentY);
    }

    // DIVISÓRIA
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, areaInfoAltura);
    ctx.lineTo(this.config.labelWidthPx, areaInfoAltura);
    ctx.stroke();

    // === ÁREA INFERIOR (16mm) - PREÇO ===
    const areaPrecoY = areaInfoAltura;
    
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, areaPrecoY, this.config.labelWidthPx, areaPrecoAltura);

    const precoTexto = preco ? `R$ ${preco}` : 'R$ ___,__';
    ctx.fillStyle = preco ? 'black' : '#999999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 54px Arial';
    
    ctx.fillText(precoTexto, this.config.labelWidthPx / 2, areaPrecoY + (areaPrecoAltura / 2));

    // BORDA
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, this.config.labelWidthPx - 2, this.config.labelHeightPx - 2);

    return canvas;
  }

  /**
   * Gera canvas completo com 2 COLUNAS
   */
  async generateLabelCanvas(labelData) {
    // Canvas largo (80mm = 2 colunas de 40mm)
    const canvasLargo = createCanvas(this.config.paperWidthPx, this.config.labelHeightPx);
    const ctxLargo = canvasLargo.getContext('2d');

    // ROTAÇÃO 180° DO CANVAS COMPLETO - Compensar saída invertida da impressora
    ctxLargo.translate(this.config.paperWidthPx, this.config.labelHeightPx);
    ctxLargo.rotate(Math.PI);

    // Gera etiqueta individual
    const etiquetaIndividual = await this.generateSingleLabel(labelData);

    // COLUNA 1 (esquerda)
    ctxLargo.drawImage(etiquetaIndividual, 0, 0);

    // COLUNA 2 (direita) - mesma etiqueta
    ctxLargo.drawImage(etiquetaIndividual, this.config.labelWidthPx, 0);

    return canvasLargo;
  }

  /**
   * Etiqueta de teste (2 colunas)
   */
  async generateTestCanvas() {
    const testData = {
      texto: 'Etiqueta Teste',
      codigo: 'TEST-DFCOM-2024',
      preco: '00,00',
      tamanho: 'M'
    };

    return this.generateLabelCanvas(testData);
  }

  /**
   * Imprime canvas via Electron Print API
   */
  async printCanvas(printerName, canvas, copies = 1) {
    return new Promise((resolve, reject) => {
      try {
        const dataUrl = canvas.toDataURL('image/png');

        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; }
    body { width: 80mm; height: 60mm; }
    img { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body><img src="${dataUrl}" /></body>
</html>`;

        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: { offscreen: true, nodeIntegration: false }
        });

        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        printWindow.webContents.once('did-finish-load', () => {
          const printOptions = {
            silent: true,
            printBackground: true,
            deviceName: printerName,
            color: false,
            margins: { marginType: 'none' },
            pageSize: { width: 80000, height: 60000 },
            dpi: { horizontal: 203, vertical: 203 },
            copies: copies,
            landscape: false,
            scaleFactor: 100,
            shouldPrintBackgrounds: true
          };

          printWindow.webContents.print(printOptions, (success, failureReason) => {
            if (success) {

              // Limpeza segura APÓS a impressão
              setTimeout(() => {
                try {
                  if (!printWindow.isDestroyed()) {
                    printWindow.close();
                  }
                } catch (e) {
                  console.error('[Printer] ⚠️ Erro ao fechar janela:', e);
                }

                // Limpeza de referências após mais tempo
                setTimeout(() => {
                  try {
                    if (!printWindow.isDestroyed()) {
                      printWindow.destroy();
                    }
                  } catch (e) {
                    console.error('[Printer] Erro na limpeza:', e);
                  }
                }, 2000);

                resolve();
              }, 500); // Tempo mínimo para impressora processar
            } else {
              console.error('[Printer] ❌ ✗ Falha na impressão:', failureReason);
              reject(new Error(failureReason || 'Falha na impressão'));
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
    } catch (error) {
      console.error('[Printer] Erro teste:', error.message);
      throw error;
    }
  }

  async printLabel(printerName, labelData) {
    try {
      const canvas = await this.generateLabelCanvas(labelData);
      
      const copies = parseInt(labelData.copies) || 1;
      await this.printCanvas(printerName, canvas, copies);
    } catch (error) {
      console.error('[Printer] Erro:', error.message);
      throw error;
    }
  }

  getPrinterStatus(printerName) {
    try {
      // Implementação básica
      return 'Ready';
    } catch {
      return 'Unknown';
    }
  }

  getConfig() {
    return { ...this.config };
  }

  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtém impressora padrão configurada
   */
  async getDefaultPrinter() {
    const printers = await this.listPrinters();
    
    // Buscar Argox primeiro
    const argox = printers.find(p => p.Name.toLowerCase().includes('argox'));
    if (argox) {
      return argox.Name;
    }
    
    // Se não encontrar Argox, usar a primeira impressora
    if (printers.length > 0) {
      return printers[0].Name;
    }
    
    return null;
  }

  /**
   * Define impressora padrão
   */
  setDefaultPrinter(printerName) {
    this.defaultPrinter = printerName;
  }

  /**
   * Imprime um par de etiquetas (2 colunas)
   */
  async printPair(printerName, item1, item2) {
    const canvas = createCanvas(this.config.paperWidthPx, this.config.labelHeightPx);
    const ctx = canvas.getContext('2d');
    
    // Rotação 180° do canvas completo
    ctx.translate(this.config.paperWidthPx, this.config.labelHeightPx);
    ctx.rotate(Math.PI);
    
    // Coluna 1 (esquerda) - Item 1
    const label1 = await this.generateSingleLabel(item1);
    ctx.drawImage(label1, 0, 0);

    // Coluna 2 (direita) - Item 2
    const label2 = await this.generateSingleLabel(item2);
    ctx.drawImage(label2, this.config.labelWidthPx, 0);
    ctx.drawImage(label2, this.config.labelWidthPx, 0);
    
    // Imprimir canvas completo
    await this.printCanvas(printerName, canvas, 1);
  }

  /**
   * Imprime uma única etiqueta (1 coluna)
   */
  async printSingle(printerName, item) {
    // Canvas de 40mm (1 coluna apenas)
    const canvas = createCanvas(this.config.labelWidthPx, this.config.labelHeightPx);
    const ctx = canvas.getContext('2d');
    
    // Rotação 180° do canvas
    ctx.translate(this.config.labelWidthPx, this.config.labelHeightPx);
    ctx.rotate(Math.PI);
    
    // Gerar e desenhar etiqueta
    const label = await this.generateSingleLabel(item);
    ctx.drawImage(label, 0, 0);
    
    // Ajustar opções de impressão para 40mm
    await this.printCanvasSingle(printerName, canvas, 1);
  }

  /**
   * Imprime canvas de etiqueta única (40mm)
   */
  async printCanvasSingle(printerName, canvas, copies = 1) {
    return new Promise((resolve, reject) => {
      try {

        const dataUrl = canvas.toDataURL('image/png');

        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; }
    body { width: 40mm; height: 60mm; }
    img { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body><img src="${dataUrl}" /></body>
</html>`;

        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: { offscreen: true, nodeIntegration: false }
        });

        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        printWindow.webContents.once('did-finish-load', () => {
          const printOptions = {
            silent: true,
            printBackground: true,
            deviceName: printerName,
            color: false,
            margins: { marginType: 'none' },
            pageSize: { width: 40000, height: 60000 }, // 40mm x 60mm
            dpi: { horizontal: 203, vertical: 203 },
            copies: copies,
            landscape: false,
            scaleFactor: 100,
            shouldPrintBackgrounds: true
          };

          printWindow.webContents.print(printOptions, (success, failureReason) => {
            // Limpeza de memória
            try {
              printWindow.close();
              printWindow.destroy();
            } catch (e) {
              console.error('[Printer] Erro ao destruir janela:', e);
            }

            if (success) {
              // Delay mínimo para a impressora processar
              setTimeout(() => {
                resolve();
              }, 200);
            } else {
              console.error('[Printer] ✗ Falha:', failureReason);
              reject(new Error(failureReason || 'Falha na impressão'));
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
}

module.exports = PrinterManager;
