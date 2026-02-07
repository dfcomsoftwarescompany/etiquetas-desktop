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
            PrinterStatus: p.PrinterStatus || 0,
            StatusText: this.getPrinterStatusText(p.PrinterStatus),
            Online: this.isPrinterOnline(p.PrinterStatus),
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
   * Verifica se a impressora está online
   */
  isPrinterOnline(status) {
    // Status 0 = Normal/Ready, outros valores indicam problemas
    return status === 0 || status === undefined;
  }

  /**
   * Retorna texto legível do status da impressora
   */
  getPrinterStatusText(status) {
    const statusMap = {
      0: 'Pronta',
      1: 'Pausada',
      2: 'Erro',
      3: 'Excluindo',
      4: 'Atolamento de Papel',
      5: 'Sem Papel',
      6: 'Alimentação Manual',
      7: 'Problema de Papel',
      8: 'Offline',
      9: 'Ocupada',
      10: 'Imprimindo',
      11: 'Bandeja de Saída Cheia',
      128: 'Desligada/Offline',
      131072: 'Servidor Offline'
    };
    return statusMap[status] || (status > 0 ? 'Indisponível' : 'Pronta');
  }

  /**
   * Verifica status de uma impressora específica
   */
  async checkPrinterStatus(printerName) {
    return new Promise((resolve) => {
      const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer -Name '${printerName}' | Select-Object Name, PrinterStatus | ConvertTo-Json -Compress"`;

      exec(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 }, (error, stdout) => {
        if (error) {
          resolve({ online: false, status: 'Erro ao verificar', statusCode: -1 });
          return;
        }

        try {
          const printer = JSON.parse(stdout.trim());
          const statusCode = printer.PrinterStatus || 0;
          resolve({
            online: this.isPrinterOnline(statusCode),
            status: this.getPrinterStatusText(statusCode),
            statusCode: statusCode
          });
        } catch {
          resolve({ online: false, status: 'Não encontrada', statusCode: -1 });
        }
      });
    });
  }

  /**
   * Gera etiqueta individual (1 coluna)
   * Layout: GIRA em cima (área info), Preço à vista embaixo
   * Etiqueta: 40x60mm = 320x480px @ 203dpi
   */
  async generateSingleLabel(labelData) {
    // Sanitizar dados com valores padrão seguros
    const texto = (labelData.texto || labelData.descricao || 'PRODUTO').toString();
    const codigo = (labelData.codigo || labelData.codbarras || labelData.cod || '123456789').toString();
    const preco = (labelData.preco || labelData.valor || '0,00').toString();
    const tamanho = (labelData.tamanho || labelData.tam || '').toString();
    const valorCredito = labelData.valorCredito || labelData.valueStoreCredit || null;
    const produtoNovo = labelData.produto_novo === true;
    const evento = labelData.evento || null;

    const canvas = createCanvas(this.config.labelWidthPx, this.config.labelHeightPx);
    const ctx = canvas.getContext('2d');

    ctx.antialias = 'subpixel';
    ctx.patternQuality = 'best';

    const margin = 8;
    const centerX = this.config.labelWidthPx / 2;
    
    // Área de preço (embaixo)
    const areaPrecoAltura = 80;
    const areaPrecoY = this.config.labelHeightPx - areaPrecoAltura;
    
    // Fundo branco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.config.labelWidthPx, this.config.labelHeightPx);

    // ========================================
    // LATERAL ESQUERDA - Data de Impressão (vertical)
    // ========================================
    const dataImpressao = new Date();
    const mes = String(dataImpressao.getMonth() + 1).padStart(2, '0');
    const dia = String(dataImpressao.getDate()).padStart(2, '0');
    const ano = String(dataImpressao.getFullYear()).slice(-2);
    const dataFormatada = `${mes}${dia}${ano}`;
    
    ctx.save();
    ctx.translate(6, this.config.labelHeightPx / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#666666';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dataFormatada, 0, 0);
    ctx.restore();

    // ========================================
    // LATERAL DIREITA - Faixa "PRODUTO NOVO" (vertical)
    // ========================================
    if (produtoNovo) {
      const faixaLargura = 20;
      const faixaX = this.config.labelWidthPx - faixaLargura;
      
      // Fundo verde vibrante
      ctx.fillStyle = '#00C853';
      ctx.fillRect(faixaX, 0, faixaLargura, this.config.labelHeightPx);
      
      // Texto vertical "PRODUTO NOVO"
      ctx.save();
      ctx.translate(faixaX + faixaLargura / 2, this.config.labelHeightPx / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PRODUTO NOVO', 0, 0);
      ctx.restore();
    }

    // ========================================
    // HEADER - Logo DFCOM
    // ========================================
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 26px Arial';
    ctx.fillText('DFCOM', centerX, 8);

    // ========================================
    // QR CODE (centralizado, com margem superior maior)
    // ========================================
    const qrSize = 120;
    const qrCanvas = createCanvas(qrSize, qrSize);
    await QRCode.toCanvas(qrCanvas, codigo, {
      width: qrSize,
      margin: 0,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    });

    const qrX = Math.floor((this.config.labelWidthPx - qrSize) / 2);
    const qrY = 50;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // ========================================
    // CÓDIGO DE BARRAS (fonte maior)
    // ========================================
    let currentY = qrY + qrSize + 10;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Ajusta fonte baseado no tamanho do código
    const codigoLen = codigo.length;
    let codigoFontSize = 16;
    if (codigoLen > 20) codigoFontSize = 12;
    else if (codigoLen > 15) codigoFontSize = 13;
    else if (codigoLen > 10) codigoFontSize = 14;

    ctx.font = `bold ${codigoFontSize}px Arial`;
    
    // Se código muito longo, quebra em 2 linhas
    const maxCodigoWidth = this.config.labelWidthPx - (margin * 2);
    const codigoMetrics = ctx.measureText(codigo);
    
    if (codigoMetrics.width > maxCodigoWidth && codigoLen > 15) {
      const meio = Math.ceil(codigoLen / 2);
      const linha1 = codigo.substring(0, meio);
      const linha2 = codigo.substring(meio);
      ctx.fillText(linha1, centerX, currentY);
      currentY += codigoFontSize + 3;
      ctx.fillText(linha2, centerX, currentY);
      currentY += codigoFontSize + 8;
    } else {
      ctx.fillText(codigo, centerX, currentY);
      currentY += codigoFontSize + 10;
    }

    // ========================================
    // DESCRIÇÃO DO PRODUTO (quebra automática, SEM truncamento)
    // ========================================
    ctx.font = 'bold 16px Arial';
    const maxWidth = this.config.labelWidthPx - (margin * 2);
    const palavras = texto.split(' ');
    let linha = '';
    const linhaAltura = 17;

    for (let i = 0; i < palavras.length; i++) {
      const testeLinha = linha + palavras[i] + ' ';
      const metricas = ctx.measureText(testeLinha);
      
      if (metricas.width > maxWidth && linha !== '') {
        ctx.fillText(linha.trim(), centerX, currentY);
        linha = palavras[i] + ' ';
        currentY += linhaAltura;
      } else {
        linha = testeLinha;
      }
    }
    
    if (linha.trim() !== '') {
      ctx.fillText(linha.trim(), centerX, currentY);
      currentY += linhaAltura + 4;
    }

    // ========================================
    // TAMANHO (fonte maior)
    // ========================================
    if (tamanho) {
      currentY += 2;
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`TAM: ${tamanho}`, centerX, currentY);
      currentY += 20;
    }

    // ========================================
    // LINHA DE EVENTO (fonte maior e destacada)
    // ========================================
    if (evento) {
      currentY += 4;
      
      // Fundo amarelo para destaque
      const eventoBoxH = 28;
      const eventoBoxW = this.config.labelWidthPx - (margin * 2);
      const eventoBoxX = margin;
      
      ctx.fillStyle = '#FFF9C4';
      ctx.fillRect(eventoBoxX, currentY, eventoBoxW, eventoBoxH);
      
      // Borda amarela escura
      ctx.strokeStyle = '#F9A825';
      ctx.lineWidth = 2;
      ctx.strokeRect(eventoBoxX, currentY, eventoBoxW, eventoBoxH);

      // Texto do evento
      ctx.fillStyle = '#F57F17';
      ctx.font = 'bold 11px Arial';
      ctx.textBaseline = 'middle';
      
      // Quebra texto do evento se necessário
      const eventoMaxWidth = eventoBoxW - 8;
      const eventoTexto = evento.toString();
      const eventoMetrics = ctx.measureText(eventoTexto);
      
      if (eventoMetrics.width > eventoMaxWidth) {
        // Texto muito longo, reduz fonte
        ctx.font = 'bold 9px Arial';
      }
      
      ctx.fillText(eventoTexto, centerX, currentY + eventoBoxH / 2);
      currentY += eventoBoxH + 6;
    }

    // ========================================
    // VALOR GIRA/CRÉDITO (na área de informações)
    // ========================================
    if (valorCredito) {
      currentY += 4;
      
      // Fundo verde claro para destaque
      const giraBoxY = currentY;
      const giraBoxH = 50;
      const giraBoxW = this.config.labelWidthPx - (margin * 2);
      const giraBoxX = margin;
      
      ctx.fillStyle = '#e8f5e9';
      ctx.fillRect(giraBoxX, giraBoxY, giraBoxW, giraBoxH);
      
      // Borda verde
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 2;
      ctx.strokeRect(giraBoxX, giraBoxY, giraBoxW, giraBoxH);

      // Label "NO GIRA"
      ctx.fillStyle = '#2e7d32';
      ctx.font = 'bold 10px Arial';
      ctx.textBaseline = 'middle';
      ctx.fillText('NO GIRA', centerX, giraBoxY + 12);

      // Preço GIRA grande
      const precoGira = this.formatPrice(valorCredito);
      ctx.fillStyle = '#1b5e20';
      ctx.font = 'bold 28px Arial';
      ctx.fillText(precoGira, centerX, giraBoxY + 35);
    }

    // ========================================
    // ÁREA DE PREÇO À VISTA (embaixo, centralizado)
    // ========================================
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, areaPrecoY, this.config.labelWidthPx, areaPrecoAltura);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const precoTexto = this.formatPrice(preco);
    
    // Valor grande e centralizado
    ctx.fillStyle = 'black';
    ctx.font = 'bold 44px Arial';
    ctx.fillText(precoTexto, centerX, areaPrecoY + areaPrecoAltura / 2);

    return canvas;
  }

  /**
   * Formata preço para exibição
   */
  formatPrice(value) {
    if (!value) return 'R$ 0,00';
    const str = value.toString().replace(',', '.');
    const num = parseFloat(str);
    if (isNaN(num)) return `R$ ${value}`;
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  }

  /**
   * Desenha retângulo com bordas arredondadas
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
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
