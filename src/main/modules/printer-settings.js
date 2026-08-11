/**
 * Serialização das configurações de impressora para disco.
 * Mantém flags e impressoras selecionadas entre reinícios do app.
 */

function buildPersistedSettings(config = {}) {
  const labelPrintingEnabled = config.labelPrintingEnabled !== false;
  const couponPrintingEnabled = config.couponPrintingEnabled !== false;

  return {
    labelPrintingEnabled,
    couponPrintingEnabled,
    // Mantém campo legado para leitura por builds antigas
    printingEnabled: labelPrintingEnabled || couponPrintingEnabled,
    defaultPrinter: config.defaultPrinter || null,
    couponPrinter: config.couponPrinter || null,
    tenant_name: config.tenant_name || null,
  };
}

function resolveConfigFromPersisted(saved = {}) {
  const hasTypedFlags =
    typeof saved.labelPrintingEnabled === 'boolean' ||
    typeof saved.couponPrintingEnabled === 'boolean';

  const config = {};

  if (hasTypedFlags) {
    config.labelPrintingEnabled = saved.labelPrintingEnabled !== false;
    config.couponPrintingEnabled = saved.couponPrintingEnabled !== false;
  } else if (typeof saved.printingEnabled === 'boolean') {
    // Migração do switch global antigo
    config.labelPrintingEnabled = saved.printingEnabled;
    config.couponPrintingEnabled = saved.printingEnabled;
  }

  if (typeof saved.defaultPrinter === 'string' && saved.defaultPrinter) {
    config.defaultPrinter = saved.defaultPrinter;
  }

  if (typeof saved.couponPrinter === 'string' && saved.couponPrinter) {
    config.couponPrinter = saved.couponPrinter;
  }

  if (typeof saved.tenant_name === 'string' && saved.tenant_name) {
    config.tenant_name = saved.tenant_name;
  }

  return config;
}

module.exports = {
  buildPersistedSettings,
  resolveConfigFromPersisted,
};
