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
- Step tracking with calorie estimates and walking double-count prevention
- Weight, body fat, lean body mass, sleep, medication, and lab tracking
- Search-first lab test catalog with common built-in tests, aliases, editable units/reference ranges, and personal custom tests
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
- Built-in lab reference ranges are editable defaults only. Use the range from your actual lab report when it differs.
- When steps are logged for a day, manually logged walking activities remain visible but are not added again to TDEE.
- Weather, temperature, humidity, wearable data, and cloud sync are not integrated.
- Data is local to the installed Windows user unless manually backed up, exported, or restored.
- Installer artifacts in `release/` are local build outputs and should be published through GitHub Releases, not committed.

## Manual Release Checklist

- Edit an existing lab result and confirm the row updates without a duplicate.
- Add or edit daily steps in Activity & Burn and confirm TDEE and deficit/surplus update.
- Add steps and a walking activity on the same date and confirm walking calories are not added twice.
- Add steps and a non-walking activity on the same date and confirm the non-walking activity still counts.
- Export and import full JSON and confirm step history and lab edits are retained.
- Backup and restore the SQLite database before installing a release build.

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

### v1.1.25

- Added final documentation and backup/restore coverage for editable labs and step tracking.

### v1.1.24

- Clarified step and walking double-count behavior in Activity & Burn and added regression coverage for step-inclusive deficit/surplus totals.

### v1.1.23

- Added Activity & Burn UI for entering, editing, and reviewing daily step counts.

### v1.1.22

- Added step calorie estimates to daily ledger activity burn and TDEE calculations, with walking activity double-count prevention when steps exist.

### v1.1.21

- Added database storage, validation, migration, and JSON import/export support for daily step history.

### v1.1.20

- Added editing for existing lab results while preserving record IDs.

### v1.1.19

- Completed the lab selection feature test/documentation pass.
- Added coverage for built-in lab defaults and older lab exports missing catalog metadata.

### v1.1.18

- Added the option to save manually entered lab tests to the personal catalog while logging a result.

### v1.1.17

- Added a search-first lab picker that searches built-in and custom tests by name, abbreviation, alias, and category.

### v1.1.16

- Added lab result catalog metadata for selected built-in or custom lab tests.

### v1.1.15

- Added custom lab test catalog storage for personal tests.

### v1.1.14

- Added a built-in common lab test catalog with searchable aliases and editable default units/reference ranges.

### v1.1.13

- Completed the v1.1.0 improvement roadmap wrap-up before beginning the lab catalog work.

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
