const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const asar = require('@electron/asar');

const root = path.join(__dirname, '..');
const sourcePackage = require(path.join(root, 'package.json'));
const productName = sourcePackage.build.productName;
const unpackedDir = path.join(root, 'release', 'win-unpacked');
const executable = path.join(unpackedDir, `${productName}.exe`);
const asarPath = path.join(unpackedDir, 'resources', 'app.asar');
const nativeModule = path.join(
  unpackedDir,
  'resources',
  'app.asar',
  'node_modules',
  'better-sqlite3'
);

if (!fs.existsSync(executable)) {
  throw new Error(`Packaged executable not found: ${executable}`);
}
const packagedPackage = JSON.parse(asar.extractFile(asarPath, 'package.json').toString());
const packagedRenderer = asar.extractFile(asarPath, 'src\\renderer\\app.js').toString();
if (packagedPackage.version !== sourcePackage.version) {
  throw new Error(`Packaged version ${packagedPackage.version} does not match source version ${sourcePackage.version}.`);
}
if (
  !packagedRenderer.includes("weather_is_automatic.value = '0'")
  || !packagedRenderer.includes('data-weather-error')
  || !packagedRenderer.includes('dashboard-primary')
  || !packagedRenderer.includes('nav-group')
) {
  throw new Error('Packaged renderer does not contain the final v2 dashboard and environmental UI implementation.');
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-tracker-packaged-smoke-'));
const smokeSource = `
  const path = require('path');
  const Database = require(process.argv[1]);
  const database = new Database(path.join(process.argv[2], 'native-smoke.sqlite'));
  database.exec('CREATE TABLE smoke_test (id INTEGER PRIMARY KEY)');
  database.close();
  console.log(JSON.stringify({
    electron: process.versions.electron,
    nodeModuleVersion: process.versions.modules
  }));
`;

try {
  const result = spawnSync(
    executable,
    ['-e', smokeSource, nativeModule, tempDir],
    {
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Packaged native dependency check failed.\n${result.stderr || result.stdout}`.trim()
    );
  }

  const details = result.stdout.trim();
  console.log(`Packaged native dependency check passed: ${details}`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
