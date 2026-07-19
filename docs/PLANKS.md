# Plank Exercise Family

Plank variations are defined in `src/shared/planks.js` and appear in the Workouts exercise picker under the `Planks` section. Saved workout rows continue to use the existing `workout_exercises` schema: `muscle_group`, `exercise`, `sets`, `reps`, `weight`, `seconds`, `mode`, and `pounds`.

No database migration is required. Existing workout records, templates, backups, imports, exports, history, charts, and daily ledger rows remain compatible because plank rows use the same storage model as other exercises. `Plank Walk-Ups` is the canonical entry for the movement also known as `Plank Up-Downs`; that alias resolves to the same plank definition instead of creating a duplicate selectable row.

## Variations

Static or primarily duration-based:

- Forearm Plank: 3.3 MET
- High Plank: 3.4 MET
- Knee Forearm Plank: 2.6 MET
- Knee High Plank: 2.7 MET
- Side Plank: 3.8 MET
- Knee Side Plank: 3.0 MET
- Reverse Plank: 3.8 MET
- Reverse Tabletop Plank: 3.2 MET
- Long-Lever Plank: 4.5 MET
- RKC Plank: 4.6 MET
- Copenhagen Plank: 4.8 MET
- Star Side Plank: 4.8 MET
- Weighted Forearm Plank: 3.8 MET
- Weighted High Plank: 3.9 MET
- Stability-Ball Forearm Plank: 4.1 MET
- Stability-Ball High Plank: 4.2 MET
- Suspension-Trainer Plank: 4.3 MET
- Extended Plank: 4.2 MET
- Single-Arm Plank: 4.4 MET
- Single-Leg Plank: 4.2 MET
- Single-Arm Single-Leg Plank: 4.8 MET

Dynamic variations:

- Plank Shoulder Taps: 4.6 MET, 1.5 seconds per rep
- Plank Hip Dips: 4.5 MET, 1.6 seconds per rep
- Plank Jacks: 6.5 MET, 1.0 seconds per rep
- Plank Walk-Ups: 5.0 MET, 2.0 seconds per rep
- Plank Knee-to-Elbow: 5.2 MET, 1.4 seconds per rep
- Plank Knee-to-Opposite-Elbow: 5.4 MET, 1.4 seconds per rep
- Plank Mountain Climbers: 7.0 MET, 0.8 seconds per rep
- Plank Toe Taps: 4.7 MET, 1.3 seconds per rep
- Plank Arm Raises: 4.5 MET, 1.8 seconds per rep
- Plank Leg Raises: 4.7 MET, 1.8 seconds per rep
- Bird-Dog Plank: 4.6 MET, 2.0 seconds per rep
- Walking Plank: 5.3 MET, 2.2 seconds per rep
- Body Saw Plank: 4.8 MET, 2.0 seconds per rep
- Side Plank Hip Lifts: 4.8 MET, 1.8 seconds per rep
- Side Plank Rotation: 4.9 MET, 2.0 seconds per rep
- Side Plank Thread-the-Needle: 5.0 MET, 2.1 seconds per rep
- Plank with Row: 5.2 MET, 2.2 seconds per rep
- Renegade Row Plank: 5.6 MET, 2.2 seconds per rep
- Stability-Ball Stir-the-Pot: 5.5 MET, 2.0 seconds per rep
- Suspension-Trainer Body Saw: 5.7 MET, 2.0 seconds per rep

## Tracking And Calories

Static plank entries use `seconds` as the active duration per set. Dynamic plank entries use entered `seconds` first; if seconds are blank, reps are converted to active time using the cadence assumptions above. If both seconds and reps are entered, seconds are the active-time source and reps are not added again.

Unilateral variations use the existing `sets` field to avoid adding a side column. To track 30 seconds per side, enter `sets = 2` and `seconds = 30`. To enter a combined one-minute total, enter `sets = 1` and `seconds = 60`. Do not enter both styles for the same work.

Plank calories use:

```text
MET * 3.5 * body_weight_kg / 200 * active_minutes * added_weight_multiplier * effort_multiplier
```

Effort multipliers use the existing workout session effort: `light = 0.9`, `moderate = 1.0`, `vigorous = 1.12`.

Weighted variations use a conservative capped adjustment:

```text
ratio = min(0.5, added_weight / body_weight)
added_weight_multiplier = 1 + min(0.15, ratio * 0.3)
```

Active seconds are capped at 7,200 seconds per exercise row to prevent accidental extreme estimates. Missing body weight follows the app's existing renderer fallback: most recent weight log, then profile current weight, then zero. If no body weight is available, plank calories are zero.

## Weight Challenge

Plank variations use `mode = timed`, so they add workout calorie burn once but contribute `0` lifting pounds. This preserves the existing 1,000,000 Pound Challenge convention for timed exercises while still counting the workout session in the challenge's session/week/month summaries.

Calorie burn is an estimate based on body weight, active duration, exercise classification, and available intensity data. It is not medically exact.
