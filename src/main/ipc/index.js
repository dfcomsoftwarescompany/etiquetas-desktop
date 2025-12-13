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
}

module.exports = { registerAllHandlers };

