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
- Daily ledger summaries for weight, glucose, blood pressure, heart rate, food totals, activity, workouts, sleep, labs, and notes
- BMR and TDEE calculations using Katch-McArdle and MET-based activity burn
- Food, calorie, net carb, protein, and fat logging
- Blood glucose logging with context-specific thresholds and estimated A1C
- Workout sessions, exercise rows, workout templates, bodyweight handling, and a 1,000,000 lb lifetime lifting challenge
- Duration-based plank exercise family with conservative MET-based calorie estimates
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

Plank exercise definitions, aliases, MET values, cadence assumptions, and weighted-duration notes are documented in [docs/PLANKS.md](docs/PLANKS.md).

The installer version comes from `package.json` and `package-lock.json`. For a new release, update both package versions, add a changelog entry, run the checks, then run `npm run build`. Electron Builder writes the NSIS installer to `release/`; curated release artifacts can be copied to `dist/release/<version>/` with release notes, checksums, and an artifact manifest. Developer build prerequisites are Node.js/npm plus the native build tools required by `better-sqlite3`; installed users do not need Node.js or developer tools.

Upgrades preserve user data because the installer keeps the same Electron app identity and the SQLite database remains in the current Windows user's `%APPDATA%\My Health Tracker\` user-data directory. Uninstalling removes installed program files but does not silently remove that user-created database.

## Changelog

### v1.1.38

- Replaced shared native number inputs with text-backed numeric controls and explicit step buttons so manual numeric replacement continues working after deleting saved records.

### v1.1.37

- Replaced native delete confirmation dialogs with an app-rendered confirmation modal so deleting records does not leave Electron's native modal focus state stuck and block typing or dropdown interaction.

### v1.1.36

- Rebuilt the Windows installer after verifying Electron-native SQLite startup so the packaged app opens correctly after installation.

### v1.1.35

- Added a real-renderer regression harness for post-delete keyboard input and saved-value verification across glucose, blood pressure, weight, and workout exercise forms.
- Kept shared delete cleanup from taking over global input focus after saved-record deletion.

### v1.1.34

- Added a duration-based plank exercise family with static, dynamic, unilateral, weighted, stability-ball, and suspension-trainer variations.
- Added conservative plank calorie estimates using centralized MET, cadence, active-time, effort, and added-weight assumptions while preserving workout history and 1,000,000 lb challenge conventions.
- Fixed numeric fields becoming unable to accept direct keyboard input after deleting entries in shared form/delete workflows, including workout, glucose, blood pressure, and related numeric-entry screens.

### v1.1.33

- Added `Behind-the-Body Cable Curl` to Biceps as a standard weighted cable curl using the existing bilateral exercise volume logic.
- Added `Behind-the-Body Pronated Cable Curl` to Biceps as a distinct weighted cable curl variation using the existing bilateral exercise volume logic.

### v1.1.32

- Added `Cable Kong Curl` to Biceps as an alternating bilateral cable movement with helper text for rep and resistance entry conventions.

### v1.1.31

- Added `Barbell curls` to the Biceps workout exercise list as a bilateral barbell movement.

### v1.1.30

- Added a Blood Pressure section with systolic, diastolic, heart rate, position, notes, validation, JSON import/export, and daily ledger averages.

### v1.1.29

- Added `drink` as a Food & Macros meal type and allowed it through food log validation.

### v1.1.28

- Removed step notes from the Activity & Burn history table and added newest/oldest date ordering for step and activity history.

### v1.1.27

- Made renderer step-calorie/TDEE calculation pass weight and height explicitly and added regression coverage for step-inclusive burn totals.

### v1.1.26

- Constrained the startup window size to the current monitor work area so the app no longer opens larger than the screen.

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
