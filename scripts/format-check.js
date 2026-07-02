const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = ['README.md', 'package.json', 'src', 'scripts'];
const ignoredDirs = new Set(['node_modules', 'release', '.git']);
const textExtensions = new Set(['.js', '.json', '.html', '.css', '.md', '.svg']);
let failed = false;

function walk(targetPath) {
  const stats = fs.statSync(targetPath);
  if (stats.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
      walk(path.join(targetPath, entry.name));
    }
    return;
  }
  if (stats.isFile() && textExtensions.has(path.extname(targetPath))) {
    checkTextFile(targetPath);
  }
}

function checkTextFile(filePath) {
  const relative = path.relative(root, filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/[ \t]$/.test(line)) {
      failed = true;
      console.error(`${relative}:${index + 1} has trailing whitespace`);
    }
    if (line.includes('\t')) {
      failed = true;
      console.error(`${relative}:${index + 1} contains a tab character`);
    }
  });
  if (text && !text.endsWith('\n')) {
    failed = true;
    console.error(`${relative} must end with a newline`);
  }
}

for (const target of targets) {
  walk(path.join(root, target));
}

if (failed) process.exit(1);
console.log('Format check passed');
