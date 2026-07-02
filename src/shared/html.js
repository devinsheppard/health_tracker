(function initHtml(root, factory) {
  const html = factory();
  if (typeof module === 'object' && module.exports) module.exports = html;
  root.HealthHtml = html;
})(typeof globalThis !== 'undefined' ? globalThis : this, function htmlFactory() {
  const TRUSTED_HTML = '__healthTrackerTrustedHtml';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function attribute(value) {
    return escapeHtml(value);
  }

  function trustedHtml(html) {
    return { [TRUSTED_HTML]: true, html };
  }

  function cellHtml(value) {
    if (value && value[TRUSTED_HTML]) return value.html;
    return escapeHtml(value ?? '');
  }

  return {
    escapeHtml,
    attribute,
    trustedHtml,
    cellHtml
  };
});
