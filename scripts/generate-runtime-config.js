/**
 * Gera build/runtime-config.json, o arquivo de ambiente embutido no instalador.
 *
 * Uso: node scripts/generate-runtime-config.js <prod|beta|test>
 *
 * As URLs vêm dos secrets PRINTER_WS_URL_PROD / _BETA / _TEST.
 * BETA e TEST falham sem secret, para nunca publicar um instalador de
 * homologação apontando para o socket de produção.
 */

const fs = require('fs');
const path = require('path');

const { DEFAULT_WS_URL, RUNTIME_CONFIG_FILENAME } = require('../src/main/modules/runtime-config');

const CHANNELS = {
  prod: { envVar: 'PRINTER_WS_URL_PROD', versionTag: null },
  beta: { envVar: 'PRINTER_WS_URL_BETA', versionTag: 'env-beta' },
  test: { envVar: 'PRINTER_WS_URL_TEST', versionTag: 'env-test' },
};

function assertVersionMatchesChannel(channel, version, versionTag) {
  if (versionTag === null) {
    if (version.includes('-')) {
      throw new Error(
        `Canal prod exige versão estável, mas package.json está em "${version}". ` +
          'Use uma versão sem sufixo (ex.: 2.0.73) na branch main.'
      );
    }
    return;
  }

  if (!version.includes(`-${versionTag}.`)) {
    throw new Error(
      `Canal ${channel} exige versão no formato X.Y.Z-${versionTag}.N, mas package.json está em "${version}". ` +
        `Sem esse sufixo o auto-update do canal ${channel} não encontra a release.`
    );
  }
}

function buildRuntimeConfig({ channel, version, env = process.env }) {
  const spec = CHANNELS[channel];

  if (!spec) {
    throw new Error(
      `Canal "${channel}" não suportado. Canais válidos: ${Object.keys(CHANNELS).join(', ')}.`
    );
  }

  assertVersionMatchesChannel(channel, version, spec.versionTag);

  const printerWsUrl = env[spec.envVar];

  if (!printerWsUrl) {
    if (channel !== 'prod') {
      throw new Error(
        `Secret ${spec.envVar} não configurado. Cadastre a URL do socket de ${channel} ` +
          'em Settings → Secrets and variables → Actions.'
      );
    }

    return { channel, printerWsUrl: DEFAULT_WS_URL };
  }

  return { channel, printerWsUrl };
}

function main() {
  const channel = process.argv[2];
  const { version } = require('../package.json');
  const config = buildRuntimeConfig({ channel, version });
  const outputPath = path.join(__dirname, '..', 'build', RUNTIME_CONFIG_FILENAME);

  fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`[runtime-config] canal=${config.channel} socket=${config.printerWsUrl}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[runtime-config] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  buildRuntimeConfig,
  assertVersionMatchesChannel,
  CHANNELS,
};
