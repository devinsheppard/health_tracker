# My Health Tracker

My Health Tracker is a Windows desktop app for local personal health tracking. It is built with Electron, HTML/CSS/JavaScript, and SQLite through `better-sqlite3`.

## Download

Windows installers are distributed as GitHub Release artifacts. Installer binaries are intentionally not committed to the repository.

Run the installer to install the app. It creates Start Menu integration, supports uninstall through Windows Add/Remove Programs, and stores health data locally on the same Windows account.

## Data Storage

The SQLite database is created automatically on first launch under Electron's `userData` folder:

```text
%APPDATA%\My Health Tracker\my-health-tracker.sqlite
```

The exact folder may vary by Electron packaging metadata, but it is inside the current user's AppData roaming profile. Health data is not synced to a cloud service by this app.

## Backup And Restore

Use Settings -> Backup database to create a checked SQLite backup copy. The backup flow runs a SQLite checkpoint, writes the backup, and validates the backup file before reporting success.

Use Settings -> Restore database to restore a SQLite backup. Restore validates the selected file and creates a safety copy of the current database before replacing it.

Use Settings -> Export JSON for a full JSON export of profile data and all tracker tables. Use Settings -> Import JSON to restore a full JSON export; import creates a safety backup first.

Recommended habit: make a database backup before installing a new version, before importing JSON, and after any large data-entry session.

## Features

- Profile, goals, diet type, protein target, A1C goal, theme, and text scaling
- Daily ledger summaries for weight, glucose, food totals, activity, workouts, sleep, labs, and notes
- BMR and TDEE calculations using Katch-McArdle and MET-based activity burn
- Food, calorie, net carb, protein, and fat logging
- Blood glucose logging with context-specific thresholds and estimated A1C
- Workout sessions, exercise rows, workout templates, bodyweight handling, and a 1,000,000 lb lifetime lifting challenge
- Activity tracking with linked workout burn
- Weight, body fat, lean body mass, sleep, medication, and lab tracking
- Chart.js trends for dashboard, glucose, weight, and labs
- SQLite backup/restore and full JSON export/import
- Dark/light themes and larger text scaling

## Screenshots

Add screenshots to GitHub Releases or repository documentation when preparing a public release. Suggested captures:

- Dashboard with weekly deficit/surplus, estimated A1C, and trend charts
- Food & Macros with daily totals
- Workouts with a saved template and exercise totals
- Activity & Burn detail screen
- Settings showing backup/restore and text size

## Limitations

- This app is for personal tracking and is not medical advice.
- Calorie burn, TDEE, A1C, and workout estimates are approximations.
- Weather, temperature, humidity, wearable data, and cloud sync are not integrated.
- Data is local to the installed Windows user unless manually backed up, exported, or restored.
- Installer artifacts in `release/` are local build outputs and should be published through GitHub Releases, not committed.

## Development

Install dependencies:

```powershell
npm install
```

Run the app locally:

```powershell
npm start
```

Run checks:

```powershell
npm run lint
npm run format
npm run test
npm run audit
```

Build the Windows NSIS installer:

```powershell
npm run build
```

## Changelog

### v1.1.12

- Expanded README with storage, backup/restore, limitations, screenshots, and changelog guidance.

### v1.1.11

- Added Settings text scaling for larger UI text.

### v1.1.10

- Improved dashboard trends with daily-ledger charts and moving averages.

### v1.1.9

- Added workout templates and improved bodyweight display.

### v1.1.8

- Split renderer catalog data into a separate tested module.

### v1.1.7

- Added full JSON export/import.

### v1.1.0 - v1.1.6

- Added tooling baseline, schema migrations, daily ledger summaries, validation, safer HTML escaping, and safer backup/restore.
