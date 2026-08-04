/**
 * IPC Handlers - Registro centralizado
 */

const { registerPrinterHandlers } = require('./printer');
const { registerAPIHandlers } = require('./api');
const { registerAppHandlers } = require('./app');

function registerAllHandlers({ printerManager, apiClient, onPrinterConfigChange }) {
  registerPrinterHandlers(printerManager, { onConfigChange: onPrinterConfigChange });
  registerAPIHandlers(apiClient);
  registerAppHandlers(); // Sem updateManager - agora é automático
}

module.exports = { registerAllHandlers };

