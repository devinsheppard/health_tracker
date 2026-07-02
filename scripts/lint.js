const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = ['src', 'scripts'];
const ignoredDirs = new Set(['node_modules', 'release', '.git']);
let failed = false;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) checkJs(fullPath);
  }
}

function checkJs(filePath) {
  const relative = path.relative(root, filePath);
  try {
    execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
  } catch (error) {
    failed = true;
    process.stderr.write(`Syntax check failed: ${relative}\n`);
    process.stderr.write(error.stderr?.toString() || error.message);
  }
}

for (const target of targets) {
  walk(path.join(root, target));
}

if (failed) process.exit(1);
console.log('Lint passed');
