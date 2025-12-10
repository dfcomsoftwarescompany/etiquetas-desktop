/**
 * IPC Handlers - Registro centralizado
 */

const { registerPrinterHandlers } = require('./printer');
const { registerAPIHandlers } = require('./api');
const { registerAppHandlers } = require('./app');

function registerAllHandlers({ printerManager, apiClient, updateManager }) {
  registerPrinterHandlers(printerManager);
  registerAPIHandlers(apiClient);
  registerAppHandlers(updateManager);
  
  console.log('[IPC] Handlers registrados');
}

module.exports = { registerAllHandlers };

