(function initTrends(root, factory) {
  const trends = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = trends;
  }

  root.HealthTrends = trends;
})(typeof globalThis !== 'undefined' ? globalThis : this, function trendsFactory() {
  function n(value) {
    return Number(value) || 0;
  }

  function recentLedgerRows(rows = [], limit = 30) {
    return [...rows]
      .filter((row) => row.date)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(-limit);
  }

  function movingAverage(values = [], windowSize = 7) {
    return values.map((value, index) => {
      if (!Number.isFinite(Number(value))) return null;
      const window = values
        .slice(Math.max(0, index - windowSize + 1), index + 1)
        .map(Number)
        .filter(Number.isFinite);
      return window.length ? window.reduce((sum, item) => sum + item, 0) / window.length : null;
    });
  }

  function ledgerTrendSeries(ledgerRows = [], limit = 30, bmrCalories = 0) {
    const rows = recentLedgerRows(ledgerRows, limit);
    const labels = rows.map((row) => row.date);
    const weight = rows.map((row) => finiteOrNull(row.weight));
    const glucose = rows.map((row) => n(row.glucose_count) ? finiteOrNull(row.glucose_avg) : null);
    const a1c = glucose.map((value) => value === null ? null : (value + 46.7) / 28.7);
    const balance = rows.map((row) => n(row.food_calories) - n(bmrCalories) - n(row.activity_calories) - n(row.workout_calories));
    const volume = rows.map((row) => n(row.workout_volume));

    return {
      labels,
      weight,
      weightAverage: movingAverage(weight),
      glucose,
      a1c,
      balance,
      volume
    };
  }

  function trendDelta(values = []) {
    const clean = values
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map(Number)
      .filter(Number.isFinite);
    if (clean.length < 2) return null;
    return clean[clean.length - 1] - clean[0];
  }

  function finiteOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return { movingAverage, ledgerTrendSeries, trendDelta };
});
