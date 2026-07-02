const assert = require('node:assert/strict');
const test = require('node:test');

const html = require('../src/shared/html');

test('escapes text for HTML body and attribute contexts', () => {
  const input = `"><img src=x onerror=alert('x')>&`;
  const escaped = '&quot;&gt;&lt;img src=x onerror=alert(&#39;x&#39;)&gt;&amp;';

  assert.equal(html.escapeHtml(input), escaped);
  assert.equal(html.attribute(input), escaped);
});

test('escapes ordinary table cells but allows trusted app-generated HTML', () => {
  assert.equal(html.cellHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(html.cellHtml(html.trustedHtml('<button type="button">Edit</button>')), '<button type="button">Edit</button>');
});
