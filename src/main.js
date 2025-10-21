const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { PrinterManager } = require('./printer/printer-manager');

// Inicializar store para configurações
const store = new Store();

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
app.whenReady().then(() => {
  createWindow();

  // Configurar impressora Argox OS-214
  const printerManager = PrinterManager.getInstance();
  printerManager.configureArgoxOS214();

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
  
  // Obter impressoras do sistema
  const systemPrinters = await mainWindow.webContents.getPrintersAsync();
  
  // Obter impressoras configuradas
  const printerManager = PrinterManager.getInstance();
  const configuredPrinters = printerManager.listPrinters();
  
  // Combinar as listas
  return [
    ...systemPrinters,
    ...configuredPrinters.map(printer => ({
      name: printer.name,
      displayName: `${printer.name} (${printer.model})`,
      description: `Protocolo: ${printer.protocol}`,
      isConfigured: true,
      protocol: printer.protocol
    }))
  ];
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