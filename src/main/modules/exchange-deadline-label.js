const EXCHANGE_DEADLINE_LABEL_MESSAGE = 'Prazo para troca 3 dias com a etiqueta.';

/** Slugs de tenant da unidade Giramini Kids (Loopii). */
const GIRAMINI_KIDS_TENANT_NAMES = new Set(['giramini-kids']);

const normalizeLabelKey = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const isGiraminiKidsStoreName = (storeName) => {
  const normalized = normalizeLabelKey(storeName);
  return normalized === 'giramini kids' || normalized === 'giramini kids loopii';
};

const shouldShowExchangeDeadlineLabel = ({ tenantName, storeName } = {}) => {
  const normalizedTenant = normalizeLabelKey(tenantName);
  if (normalizedTenant && GIRAMINI_KIDS_TENANT_NAMES.has(normalizedTenant)) {
    return true;
  }

  return isGiraminiKidsStoreName(storeName);
};

module.exports = {
  EXCHANGE_DEADLINE_LABEL_MESSAGE,
  GIRAMINI_KIDS_TENANT_NAMES,
  shouldShowExchangeDeadlineLabel,
};
