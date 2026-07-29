const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sourceDb = require('../src/db');
const { seedCurrentReleaseData } = require('../tests/fixtures/current-release-data');

const root = path.join(__dirname, '..');
const executable = path.join(root, 'release', 'win-unpacked', 'My Health Tracker.exe');
const packagedDb = path.join(root, 'release', 'win-unpacked', 'resources', 'app.asar', 'src', 'db.js');
const currentDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-tracker-current-release-'));
const upgradedDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-tracker-packaged-v2-'));
const expectedPath = path.join(upgradedDataDir, 'expected-data.json');

const upgradeScript = `
  const fs = require('fs');
  const db = require(process.argv[1]);
  const userDataDir = process.argv[2];
  const expected = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  db.init(userDataDir);
  const actual = db.getAllData();
  const schemaVersion = db.getSchemaVersion();
  db.close();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('Packaged v2 changed existing application data.');
  }
  console.log(JSON.stringify({
    schemaVersion,
    tablesVerified: Object.keys(actual).length,
    profile: actual.profile.name
  }));
`;

try {
  sourceDb.init(currentDataDir);
  seedCurrentReleaseData(sourceDb);
  const expected = sourceDb.getAllData();
  sourceDb.close();

  fs.copyFileSync(
    path.join(currentDataDir, 'my-health-tracker.sqlite'),
    path.join(upgradedDataDir, 'my-health-tracker.sqlite')
  );
  fs.writeFileSync(expectedPath, JSON.stringify(expected));

  const result = spawnSync(
    executable,
    ['-e', upgradeScript, packagedDb, upgradedDataDir, expectedPath],
    {
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Packaged upgrade-data check failed.\n${result.stderr || result.stdout}`.trim());
  }
  console.log(`Packaged upgrade-data check passed: ${result.stdout.trim()}`);
} finally {
  sourceDb.close();
  fs.rmSync(currentDataDir, { recursive: true, force: true });
  fs.rmSync(upgradedDataDir, { recursive: true, force: true });
}
