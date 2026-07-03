(function initUi(root, factory) {
  const ui = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = ui;
  }

  root.HealthUi = ui;
})(typeof globalThis !== 'undefined' ? globalThis : this, function uiFactory() {
  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function today(date = new Date()) {
    return localDateKey(date);
  }

  function nowTime(date = new Date()) {
    return date.toTimeString().slice(0, 5);
  }

  function fmt(value, digits = 0) {
    return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '--';
  }

  function age(dob, now = new Date()) {
    if (!dob) return '';
    const birth = dateOnlyToLocalDate(dob);
    let years = now.getFullYear() - birth.getFullYear();
    const monthDelta = now.getMonth() - birth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) years--;
    return years;
  }

  function dateOnlyToLocalDate(value) {
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return new Date(value);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  return { localDateKey, today, nowTime, fmt, age };
});
