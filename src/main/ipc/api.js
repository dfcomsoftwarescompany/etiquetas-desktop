/**
 * IPC Handlers - API Externa
 */

const { ipcMain } = require('electron');
const http = require('http');

function registerAPIHandlers(apiClient) {
  async function getNgrokUrl() {
    await new Promise(r => setTimeout(r, 800));

    return new Promise((resolve, reject) => {
      const req = http.get(
        'http://127.0.0.1:4040/api/tunnels',
        {
          headers: {
            'Accept': 'application/json'
          }
        },
        (res) => {
          let data = '';
  
          res.on('data', chunk => data += chunk);
  
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const url = json?.tunnels?.[0]?.public_url || null;
              resolve(url);
            } catch (err) {
              reject(err);
            }
          });
        }
      );
  
      req.on('error', reject);
    });
  }

  ipcMain.handle('ngrok:geturl', async () => {
    return await getNgrokUrl();
  });

  ipcMain.handle('api:setBaseURL', (event, url) => {
    apiClient.setBaseURL(url);
    if (url && !url.includes('localhost')) {
      apiClient.setMockMode(false);
    }
    return { success: true };
  });

  ipcMain.handle('api:setMockMode', (event, enabled) => {
    apiClient.setMockMode(enabled);
    return { success: true };
  });

  ipcMain.handle('api:buscarProdutos', async (event, filters) => {
    try {
      const produtos = await apiClient.buscarProdutos(filters);
      return { success: true, data: produtos };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('api:buscarProdutoPorCodigo', async (event, codigo) => {
    try {
      const produto = await apiClient.buscarProdutoPorCodigo(codigo);
      return { success: true, data: produto };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('api:buscarProdutoPorNome', async (event, termo) => {
    try {
      const produtos = await apiClient.buscarProdutoPorNome(termo);
      return { success: true, data: produtos };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('api:testarConexao', async () => {
    try {
      const connected = await apiClient.testarConexao();
      return { success: true, connected };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('api:registrarImpressao', async (event, labelData) => {
    try {
      const result = await apiClient.registrarImpressao(labelData);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAPIHandlers };

