(function initWeight(root, factory) {
  const weight = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = weight;
  }

  root.HealthWeight = weight;
})(typeof globalThis !== 'undefined' ? globalThis : this, function weightFactory() {
  function effectiveWeightOnOrBefore(rows = [], date = '') {
    return [...rows]
      .filter((row) => row?.date && row.date <= date && isRecordedWeight(row.weight))
      .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id || 0) - Number(a.id || 0))[0] || null;
  }

  function isRecordedWeight(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
  }

  return { effectiveWeightOnOrBefore, isRecordedWeight };
});
