const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Gerenciador de impressoras para Argox OS-2140
 * Protocolo: PPLA (Printer Programming Language Argox)
 */
class PrinterManager {
  constructor() {
    this.STX = '\x02'; // Start of Text
    this.tempDir = os.tmpdir();
  }

  /**
   * Lista todas as impressoras instaladas no Windows
   */
  async listPrinters() {
    return new Promise((resolve, reject) => {
      // Script melhorado para detectar impressoras
      const script = `
        $printers = Get-WmiObject -Class Win32_Printer | Select-Object Name, PortName, DriverName, PrinterStatus, Default
        if ($printers) {
          $printers | ConvertTo-Json -Compress
        } else {
          Write-Output "[]"
        }
      `;

      console.log('[PrinterManager] Listando impressoras...');

      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script}"`,
        { encoding: 'utf8', maxBuffer: 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            console.error('[PrinterManager] Erro ao listar:', error.message);
            console.error('[PrinterManager] Stderr:', stderr);
            reject(new Error(`Erro ao listar impressoras: ${error.message}`));
            return;
          }

          try {
            const output = stdout.trim();
            console.log('[PrinterManager] Output bruto:', output);
            
            if (!output || output === '[]') {
              console.log('[PrinterManager] Nenhuma impressora encontrada');
              resolve([]);
              return;
            }
            
            let printers = JSON.parse(output);
            
            // Garante que seja sempre um array
            if (!Array.isArray(printers)) {
              printers = [printers];
            }
            
            console.log(`[PrinterManager] ${printers.length} impressora(s) encontrada(s):`);
            printers.forEach(p => console.log(`  - ${p.Name} (${p.PortName})`));
            
            resolve(printers);
          } catch (parseError) {
            console.error('[PrinterManager] Erro ao parsear JSON:', parseError.message);
            console.error('[PrinterManager] Output:', stdout);
            resolve([]);
          }
        }
      );
    });
  }

  /**
   * Lista impressoras usando WMIC (método alternativo mais compatível)
   */
  async listPrintersWMIC() {
    return new Promise((resolve, reject) => {
      console.log('[PrinterManager] Tentando WMIC...');
      
      exec('wmic printer list brief', { encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
          console.error('[PrinterManager] Erro WMIC:', error.message);
          reject(error);
          return;
        }

        try {
          const lines = stdout.trim().split('\n').filter(l => l.trim());
          console.log('[PrinterManager] WMIC retornou', lines.length, 'linhas');
          
          if (lines.length < 2) {
            resolve([]);
            return;
          }

          // Primeira linha tem os headers
          const headers = lines[0].split(/\s{2,}/).map(h => h.trim());
          const printers = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/\s{2,}/).map(v => v.trim());
            
            if (values.length > 0 && values[0]) {
              const printer = {
                Name: values[0] || '',
                PortName: values[1] || '',
                DriverName: values[2] || '',
                PrinterStatus: values[3] || ''
              };
              
              console.log(`[PrinterManager] WMIC encontrou: ${printer.Name}`);
              printers.push(printer);
            }
          }

          resolve(printers);
        } catch (e) {
          console.error('[PrinterManager] Erro ao processar WMIC:', e.message);
          resolve([]);
        }
      });
    });
  }

  /**
   * Gera comandos PPLA para imprimir texto
   * @param {string} text - Texto a ser impresso
   * @param {object} options - Opções de formatação
   */
  generatePPLA(text, options = {}) {
    const {
      x = 100,           // Posição X (em dots, 203 dpi)
      y = 100,           // Posição Y
      fontHeight = 2,    // Altura da fonte (1-5)
      fontWidth = 2,     // Largura da fonte (1-5)
      rotation = 0,      // Rotação: 0, 1, 2, 3 (0°, 90°, 180°, 270°)
      copies = 1         // Número de cópias
    } = options;

    // Comandos PPLA
    const commands = [
      this.STX + 'L',                    // Início do modo de impressão
      'D11',                              // Densidade de impressão (00-15)
      `H${Math.min(fontHeight, 9)}`,     // Altura do caractere
      `Q${copies}`,                       // Quantidade de cópias
      // Formato: Acoluna,linha,rotação,fonte,mult_horiz,mult_vert,N/R,"texto"
      `A${x},${y},${rotation},${fontHeight},${fontWidth},${fontWidth},N,"${text}"`,
      'E'                                 // Fim e imprimir
    ].join('\n');

    return commands;
  }

  /**
   * Gera etiqueta de teste "Olá Mundo"
   */
  generateTestLabel() {
    const commands = [
      this.STX + 'L',           // Início do modo de impressão
      'D11',                     // Densidade
      'H15',                     // Altura da etiqueta
      'Q1',                      // 1 cópia
      'S3',                      // Velocidade
      // Título
      'A50,30,0,4,1,1,N,"ETIQUETAS DESKTOP"',
      // Linha separadora
      'LO50,80,400,2',
      // Texto principal
      'A50,100,0,3,1,1,N,"Ola Mundo!"',
      // Info adicional
      'A50,150,0,2,1,1,N,"Impressora: Argox OS-2140"',
      'A50,180,0,2,1,1,N,"Protocolo: PPLA"',
      // Borda decorativa
      'X50,20,2,460,220',
      'E'                        // Fim e imprimir
    ].join('\n');

    return commands;
  }

  /**
   * Envia comandos PPLA para a impressora
   * @param {string} printerName - Nome da impressora
   * @param {string} commands - Comandos PPLA
   */
  async printPPLA(printerName, commands) {
    return new Promise((resolve, reject) => {
      // Cria arquivo temporário com os comandos
      const tempFile = path.join(this.tempDir, `label_${Date.now()}.prn`);
      
      fs.writeFile(tempFile, commands, 'binary', (err) => {
        if (err) {
          reject(new Error(`Erro ao criar arquivo temporário: ${err.message}`));
          return;
        }

        // Envia para a impressora usando COPY do Windows
        const printCmd = `copy /b "${tempFile}" "${printerName}"`;
        
        exec(printCmd, { shell: 'cmd.exe' }, (error, stdout, stderr) => {
          // Remove arquivo temporário
          fs.unlink(tempFile, () => {});

          if (error) {
            // Tenta método alternativo via PowerShell
            this.printViaPowerShell(printerName, commands)
              .then(resolve)
              .catch(reject);
            return;
          }

          resolve();
        });
      });
    });
  }

  /**
   * Método alternativo de impressão via PowerShell
   */
  async printViaPowerShell(printerName, commands) {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(this.tempDir, `label_${Date.now()}.prn`);
      
      fs.writeFile(tempFile, commands, 'binary', (err) => {
        if (err) {
          reject(new Error(`Erro ao criar arquivo: ${err.message}`));
          return;
        }

        const psScript = `
          $printer = Get-WmiObject -Query "SELECT * FROM Win32_Printer WHERE Name='${printerName.replace(/'/g, "''")}'";
          if ($printer) {
            $printer.PrintFile("${tempFile.replace(/\\/g, '\\\\')}");
          } else {
            # Método alternativo: Out-Printer
            Get-Content -Path "${tempFile.replace(/\\/g, '\\\\')}" -Raw | Out-Printer -Name "${printerName}"
          }
        `;

        exec(`powershell -Command "${psScript}"`, (error, stdout, stderr) => {
          // Limpa arquivo temporário após delay
          setTimeout(() => fs.unlink(tempFile, () => {}), 2000);

          if (error) {
            reject(new Error(`Erro ao imprimir: ${error.message}`));
            return;
          }

          resolve();
        });
      });
    });
  }

  /**
   * Imprime etiqueta de teste
   */
  async printTestLabel(printerName) {
    const commands = this.generateTestLabel();
    return this.printPPLA(printerName, commands);
  }

  /**
   * Imprime texto simples
   */
  async printText(printerName, text, options = {}) {
    const commands = this.generatePPLA(text, options);
    return this.printPPLA(printerName, commands);
  }

  /**
   * Envia dados RAW diretamente para uma porta (USB001, COM1, etc)
   * @param {string} portName - Nome da porta (ex: USB001, COM1, LPT1)
   * @param {string} commands - Comandos PPLA
   */
  async printToPort(portName, commands) {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(this.tempDir, `label_${Date.now()}.prn`);
      
      fs.writeFile(tempFile, commands, 'binary', (err) => {
        if (err) {
          reject(new Error(`Erro ao criar arquivo: ${err.message}`));
          return;
        }

        // Formata o nome da porta para Windows (\\.\USB001)
        let targetPort = portName;
        if (!portName.startsWith('\\\\.\\')) {
          targetPort = `\\\\.\\${portName}`;
        }

        const cmd = `copy /b "${tempFile}" "${targetPort}"`;
        
        exec(cmd, { shell: 'cmd.exe', timeout: 10000 }, (error, stdout, stderr) => {
          fs.unlink(tempFile, () => {});
          
          if (error) {
            reject(new Error(`Erro ao enviar para porta ${portName}: ${error.message}`));
            return;
          }
          resolve();
        });
      });
    });
  }
}

module.exports = PrinterManager;

