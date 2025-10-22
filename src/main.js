const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { PrinterManager } = require('./printer/printer-manager');
const { templatesExemplo } = require('./templates/exemplos');

// Inicializar store para configurações
const store = new Store();

// Carregar templates de exemplo na primeira execução
function loadDefaultTemplates() {
  const templates = store.get('templates', []);
  
  // IDs dos templates de exemplo
  const exemploIds = ['exemplo-produto-simples', 'exemplo-qrcode-rastreio'];
  
  // Remover templates de exemplo antigos
  const templatesLimpos = templates.filter(t => !exemploIds.includes(t.id));
  
  // Adicionar os novos templates de exemplo
  const templatesAtualizados = [...templatesLimpos, ...templatesExemplo];
  
  console.log('📦 Carregando/Atualizando templates de exemplo...');
  store.set('templates', templatesAtualizados);
}

// Carregar templates de exemplo ao iniciar
app.on('ready', () => {
  loadDefaultTemplates();
});

let mainWindow = null;

// Habilitar hot reload em desenvolvimento
const isDev = process.argv.includes('--dev');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'default',
    backgroundColor: '#f0f0f0'
  });

  // Carregar arquivo HTML principal
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Abrir DevTools em desenvolvimento
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Menu da aplicação
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Nova Etiqueta',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('new-label');
            }
          }
        },
        {
          label: 'Abrir Template',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-template');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Desfazer', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Refazer', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Recortar', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copiar', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Colar', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'Visualizar',
      submenu: [
        { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Tela Cheia', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-about');
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Eventos do Electron
app.whenReady().then(async () => {
  createWindow();

  // Detectar e configurar automaticamente impressora Argox OS-2140
  console.log('🖨️ Inicializando detecção de impressoras...');
  const printerManager = PrinterManager.getInstance();
  
  try {
    await printerManager.autoConfigureArgox();
    console.log('✅ Detecção de impressoras concluída');
  } catch (error) {
    console.error('⚠️ Erro ao detectar impressoras:', error);
    console.log('ℹ️ Você pode configurar manualmente depois');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  
  try {
    // Obter impressoras do sistema
    const systemPrinters = await mainWindow.webContents.getPrintersAsync();
    
    // Obter impressoras configuradas (seriais)
    const printerManager = PrinterManager.getInstance();
    const configuredPrinters = printerManager.listPrinters();
    
    console.log('🖨️ Impressoras do sistema:', systemPrinters.length);
    console.log('🔌 Impressoras seriais configuradas:', configuredPrinters.length);
    
    // Combinar as listas
    const allPrinters = [
      ...configuredPrinters.map(printer => ({
        name: printer.name,
        displayName: `🔌 ${printer.name}`,
        description: `Protocolo: ${printer.protocol} | Porta: ${printer.connection.port}`,
        isConfigured: true,
        protocol: printer.protocol,
        isSerial: true
      })),
      ...systemPrinters.map(printer => ({
        ...printer,
        displayName: printer.displayName || printer.name,
        isConfigured: false,
        isSerial: false
      }))
    ];
    
    return allPrinters;
  } catch (error) {
    console.error('❌ Erro ao obter impressoras:', error);
    return [];
  }
});

ipcMain.handle('save-settings', async (_event, settings) => {
  store.set('settings', settings);
  return { success: true };
});

ipcMain.handle('get-settings', async () => {
  return store.get('settings', {
    defaultPrinter: '',
    defaultProtocol: 'PPLA',
    defaultLabelSize: { width: 100, height: 50 },
    units: 'mm'
  });
});

ipcMain.handle('save-template', async (_event, template) => {
  const templates = store.get('templates', []);
  
  // Adicionar timestamps
  if (!template.createdAt) {
    template.createdAt = new Date().toISOString();
  }
  template.updatedAt = new Date().toISOString();
  
  // Verificar se é atualização ou novo
  const existingIndex = templates.findIndex(t => t.id === template.id);
  if (existingIndex >= 0) {
    templates[existingIndex] = template;
  } else {
    templates.push(template);
  }
  
  store.set('templates', templates);
  return { success: true, id: template.id };
});

ipcMain.handle('get-templates', async () => {
  return store.get('templates', []);
});

ipcMain.handle('delete-template', async (_event, templateId) => {
  const templates = store.get('templates', []);
  const filtered = templates.filter(t => t.id !== templateId);
  store.set('templates', filtered);
  return { success: true };
});

// Handler de impressão
ipcMain.handle('print-label', async (_event, printData) => {
  try {
    console.log('📄 Iniciando impressão...', printData);
    
    const { printerName, protocol, elements, labelSize, copies } = printData;
    
    // Validações
    if (!printerName) {
      throw new Error('Nome da impressora não fornecido');
    }
    
    if (!protocol) {
      throw new Error('Protocolo não especificado');
    }
    
    if (!elements || elements.length === 0) {
      throw new Error('Nenhum elemento para imprimir');
    }
    
    console.log(`🖨️ Impressora: ${printerName}`);
    console.log(`📋 Protocolo: ${protocol}`);
    console.log(`📦 Elementos: ${elements.length}`);
    console.log(`🔢 Cópias: ${copies}`);
    
    // Obter o gerenciador de impressoras
    const printerManager = PrinterManager.getInstance();
    
    // Verificar se é impressora configurada (Argox) ou do sistema
    const configuredPrinters = printerManager.listPrinters();
    const isConfiguredPrinter = configuredPrinters.some(p => p.name === printerName);
    
    if (isConfiguredPrinter) {
      console.log('🔧 Impressora serial detectada - usando conexão direta');
      
      try {
        // Conectar à impressora serial
        console.log('🔌 Conectando à impressora...');
        await printerManager.connect(printerName);
        console.log('✅ Conectado com sucesso!');
        
        // Imprimir
        console.log('📄 Enviando dados para impressão...');
        await printerManager.printLabel(elements, copies || 1);
        console.log('✅ Dados enviados!');
        
        // Desconectar
        console.log('🔌 Desconectando...');
        await printerManager.disconnect();
        console.log('✅ Desconectado!');
      } catch (error) {
        console.error('❌ Erro na impressão serial:', error);
        
        // Garantir que desconecta mesmo em caso de erro
        try {
          await printerManager.disconnect();
        } catch (disconnectError) {
          console.error('Erro ao desconectar:', disconnectError);
        }
        
        throw error;
      }
    } else {
      console.log('🖨️ Impressora do sistema - usando impressão nativa');
      
      // Usar impressão nativa do Electron para impressoras do sistema
      const { PPLAProtocol } = require('./protocols/ppla.js');
      const { EPL2Protocol } = require('./protocols/epl2.js');
      const { ZPLProtocol } = require('./protocols/zpl.js');
      
      let protocolInstance;
      switch (protocol) {
        case 'PPLA':
          protocolInstance = new PPLAProtocol();
          break;
        case 'EPL2':
          protocolInstance = new EPL2Protocol();
          break;
        case 'ZPL':
          protocolInstance = new ZPLProtocol();
          break;
        default:
          throw new Error(`Protocolo não suportado: ${protocol}`);
      }
      
      // Gerar código da etiqueta
      console.log('📝 Gerando código da etiqueta...');
      protocolInstance.clearBuffer();
      
      // Processar cada elemento
      elements.forEach(element => {
        console.log(`  - Adicionando ${element.type}: ${element.content}`);
        
        // Converter pixels para mm (assumindo 3.78 pixels por mm)
        const pixelsToMm = (px) => Math.round(px / 3.78);
        
        switch (element.type) {
          case 'text':
            protocolInstance.addText(
              element.content || '',
              { 
                x: pixelsToMm(element.x), 
                y: pixelsToMm(element.y) 
              },
              {
                name: element.fontFamily || 'A',
                width: 1,
                height: 1,
                rotation: element.rotation || 0
              }
            );
            break;

          case 'barcode':
            protocolInstance.addBarcode(
              element.content || '',
              { 
                x: pixelsToMm(element.x), 
                y: pixelsToMm(element.y) 
              },
              {
                type: element.barcodeType || 'CODE128',
                width: 2,
                height: pixelsToMm(element.height) || 10,
                humanReadable: element.humanReadable !== false,
                rotation: element.rotation || 0
              }
            );
            break;

          case 'qrcode':
            protocolInstance.addQRCode(
              element.content || '',
              { 
                x: pixelsToMm(element.x), 
                y: pixelsToMm(element.y) 
              },
              5
            );
            break;

          case 'line':
            const x2 = element.x + (element.width || 100);
            const y2 = element.y;
            protocolInstance.addLine(
              { x: pixelsToMm(element.x), y: pixelsToMm(element.y) },
              { x: pixelsToMm(x2), y: pixelsToMm(y2) },
              element.thickness || 1
            );
            break;

          case 'rectangle':
            protocolInstance.addRectangle(
              { 
                x: pixelsToMm(element.x), 
                y: pixelsToMm(element.y) 
              },
              pixelsToMm(element.width) || 20,
              pixelsToMm(element.height) || 20,
              element.thickness || 1
            );
            break;
        }
      });
      
      // Gerar código
      const code = protocolInstance.print(copies || 1);
      console.log('✅ Código gerado:', code.substring(0, 100) + '...');
      
      // Enviar para impressora do sistema
      if (mainWindow) {
        const printOptions = {
          silent: true, // Imprimir sem diálogo
          printBackground: false,
          deviceName: printerName,
          color: false,
          margins: {
            marginType: 'none'
          },
          landscape: false,
          scaleFactor: 100,
          pagesPerSheet: 1,
          collate: false,
          copies: copies || 1
        };
        
        // Criar uma janela oculta para impressão
        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        });
        
        // Carregar conteúdo (código da etiqueta)
        await printWindow.loadURL(`data:text/plain;charset=utf-8,${encodeURIComponent(code)}`);
        
        // Imprimir
        await printWindow.webContents.print(printOptions);
        
        // Fechar janela
        printWindow.close();
        
        console.log('✅ Impressão enviada para a impressora');
      }
    }
    
    console.log('✅ Impressão concluída com sucesso!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erro ao imprimir:', error);
    console.error('Stack trace:', error.stack);
    
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido ao imprimir',
      details: error.stack
    };
  }
});

// Handler para gerar preview do código
ipcMain.handle('generate-preview', async (_event, previewData) => {
  try {
    const { protocol, elements, labelSize } = previewData;
    
    const printerManager = PrinterManager.getInstance();
    
    // Gerar preview sem conectar à impressora
    const code = printerManager.generatePreview(elements, protocol);
    
    return { success: true, code };
  } catch (error) {
    console.error('Erro ao gerar preview:', error);
    return { success: false, error: error.message };
  }
});