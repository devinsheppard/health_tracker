# My Health Tracker

My Health Tracker is a Windows desktop app for local personal health tracking. It is built with Electron, HTML/CSS/JavaScript, and SQLite through `better-sqlite3`.

## Download

Windows installers are distributed as release artifacts. Starting with `v1.1.0`, installer binaries should be attached to GitHub Releases instead of committed directly to the repository.

Run the installer to install the app. It creates Start Menu integration, supports uninstall through Windows Add/Remove Programs, and stores health data locally in the user's AppData folder.

## Features

- Profile, goals, diet type, protein target, and A1c goal
- BMR and TDEE calculations using Katch-McArdle and MET-based activity burn
- Food, calorie, net carb, protein, and fat logging
- Blood glucose logging with context-specific thresholds and estimated A1c
- Workout tracking with a 1,000,000 lb lifetime lifting challenge
- Weight, body fat, lean body mass, sleep, medication, and lab tracking
- Chart.js trends
- SQLite backup, restore, and clear-all-data controls
- Dark and light themes

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

The app database is created automatically on first launch under Electron's `userData` path.
