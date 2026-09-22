/**
 * Configuração de ambiente gravada no instalador (TEST / BETA / PROD).
 *
 * O arquivo runtime-config.json é gerado no build (scripts/generate-runtime-config.js)
 * e copiado para os resources do pacote. Assim cada .exe fala com o socket do
 * seu ambiente sem depender de variável de ambiente na máquina do cliente.
 *
 * PROD fica sem updateChannel: a versão do próprio pacote (X.Y.Z-main) já define o
 * canal no electron-updater, e o canal publicado continua sendo latest.yml para
 * que builds antigos (sem sufixo na versão) também encontrem a atualização.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_CHANNEL = 'prod';
const DEFAULT_WS_URL = 'https://socket.dfcom.com.br/notifications-printer';
const RUNTIME_CONFIG_FILENAME = 'runtime-config.json';

const UPDATE_CHANNEL_BY_CHANNEL = {
  prod: null,
  beta: 'beta',
  test: 'test',
};

let cachedRuntimeConfig = null;

function readRuntimeConfigFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    // Build sem runtime-config (dev) ou arquivo inválido — usa defaults
    return null;
  }
}

function resolveRuntimeConfigPath() {
  try {
    const { app } = require('electron');
    if (app?.isPackaged) {
      return path.join(process.resourcesPath, RUNTIME_CONFIG_FILENAME);
    }
  } catch {
    // testes / fora do Electron
  }

  return path.join(__dirname, '..', '..', '..', 'build', RUNTIME_CONFIG_FILENAME);
}

function resolveChannel(channel) {
  if (typeof channel !== 'string') {
    return DEFAULT_CHANNEL;
  }

  const normalized = channel.trim().toLowerCase();

  if (!Object.prototype.hasOwnProperty.call(UPDATE_CHANNEL_BY_CHANNEL, normalized)) {
    return DEFAULT_CHANNEL;
  }

  return normalized;
}

function resolveRuntimeConfig({ fileConfig = null, env = process.env } = {}) {
  const channel = resolveChannel(fileConfig?.channel);
  const printerWsUrl = env.PRINTER_WS_URL || fileConfig?.printerWsUrl || DEFAULT_WS_URL;

  return {
    channel,
    printerWsUrl,
    updateChannel: UPDATE_CHANNEL_BY_CHANNEL[channel],
  };
}

function getRuntimeConfig() {
  if (cachedRuntimeConfig === null) {
    cachedRuntimeConfig = resolveRuntimeConfig({
      fileConfig: readRuntimeConfigFile(resolveRuntimeConfigPath()),
    });
  }

  return cachedRuntimeConfig;
}

function resetRuntimeConfigCacheForTests() {
  cachedRuntimeConfig = null;
}

module.exports = {
  getRuntimeConfig,
  resolveRuntimeConfig,
  readRuntimeConfigFile,
  resetRuntimeConfigCacheForTests,
  DEFAULT_CHANNEL,
  DEFAULT_WS_URL,
  RUNTIME_CONFIG_FILENAME,
  UPDATE_CHANNEL_BY_CHANNEL,
};
