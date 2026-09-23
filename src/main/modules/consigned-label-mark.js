function isConsignedLabelCode(code) {
  return String(code ?? '').toLowerCase().includes('/dp-');
}

function applyConsignedLabelMark(texto, isConsigned) {
  const description = String(texto ?? '').trim() || 'PRODUTO';
  if (!isConsigned) return description;
  return description.startsWith('*') ? description : `* ${description}`;
}

module.exports = {
  isConsignedLabelCode,
  applyConsignedLabelMark,
};
