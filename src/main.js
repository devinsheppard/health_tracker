const { app, BrowserWindow, ipcMain, dialog, nativeTheme, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const weather = require('./weather');

let mainWindow;

function createWindow() {
  const { workAreaSize } = screen.getPrimaryDisplay();
  const width = Math.min(1360, workAreaSize.width);
  const height = Math.min(860, workAreaSize.height);

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: Math.min(960, width),
    minHeight: Math.min(640, height),
    center: true,
    title: 'My Health Tracker',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#10151f' : '#f5f7fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady()
  .then(() => {
    db.init(app.getPath('userData'));
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch((error) => {
    console.error('Application startup failed:', error);
    dialog.showErrorBox(
      'My Health Tracker could not start',
      `The application encountered an error during startup and must close.\n\n${error.message}`
    );
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => db.close());

ipcMain.handle('data:getAll', () => db.getAllData());
ipcMain.handle('data:saveProfile', (_event, profile) => db.saveProfile(profile));
ipcMain.handle('data:settings', (_event, settings) => db.saveSettings(settings));
ipcMain.handle('data:add', (_event, table, row) => db.addRow(table, row));
ipcMain.handle('data:update', (_event, table, id, row) => db.updateRow(table, id, row));
ipcMain.handle('data:delete', (_event, table, id) => db.deleteRow(table, id));
ipcMain.handle('data:clearAll', () => db.clearAll());
ipcMain.handle('weather:getForWorkout', (_event, request) => weather.weatherForWorkout(request));

ipcMain.handle('db:backup', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose backup folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(result.filePaths[0], `my-health-tracker-backup-${stamp}.sqlite`);
  const backup = await db.backup(target);
  return { canceled: false, path: backup.path };
});

ipcMain.handle('db:restore', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose SQLite backup to restore',
    filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };

  const restore = db.restore(result.filePaths[0]);
  return { canceled: false, safetyBackupPath: restore.safetyBackupPath };
});

ipcMain.handle('app:exportJson', async (_event, payload) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export health summary',
    defaultPath: `health-summary-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2));
  return { canceled: false, path: result.filePath };
});

ipcMain.handle('app:exportFullJson', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export full health tracker JSON',
    defaultPath: `my-health-tracker-full-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, JSON.stringify(db.exportFullJson(), null, 2));
  return { canceled: false, path: result.filePath };
});

ipcMain.handle('app:importFullJson', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import full health tracker JSON',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  const payload = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
  const imported = db.importFullJson(payload);
  return { canceled: false, safetyBackupPath: imported.safetyBackupPath };
});
