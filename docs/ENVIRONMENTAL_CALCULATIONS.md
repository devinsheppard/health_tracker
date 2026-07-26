# Environmental exercise calculations

Environmental handling is a post-processing layer. The existing activity or workout calorie calculation runs first and produces `base_calories`. Only an entry explicitly saved as `outdoor` can receive an environmental adjustment:

`final_calories = base_calories × (1 + calorie_adjustment_percent / 100)`

Indoor entries always use 0%. Historical entries created before schema version 11 have no environment snapshot and continue to use their original saved calories.

## Effective temperature

- Heat index is calculated with the NOAA/NWS Rothfusz regression when air temperature is at least 80°F and relative humidity is at least 40%.
- Wind chill is calculated with the NWS wind-chill equation when air temperature is at most 50°F and wind speed is greater than 3 mph.
- Effective temperature uses heat index in hot conditions, wind chill in cold conditions, and actual air temperature otherwise.
- Exactly one calorie band is selected from `CALORIE_ADJUSTMENT_BANDS` in `src/shared/environmental.js`.

| Effective temperature | Adjustment |
| --- | ---: |
| Below 20°F | +6% |
| 20°F–29°F | +4% |
| 30°F–39°F | +2% |
| 40°F–49°F | +1% |
| 50°F–70°F | 0% |
| 71°F–84°F | +1% |
| 85°F–94°F | +2% |
| 95°F–104°F | +4% |
| 105°F and above | +6% |

## Environmental load and notices

The load rating is independent of calories. It combines effective-temperature thresholds with humidity and wind:

- `Extreme`: effective temperature at least 105°F or below 20°F, at least 95°F with humidity at least 70%, or wind at least 40 mph.
- `High`: effective temperature at least 95°F or below 30°F, at least 85°F with humidity at least 60%, or wind at least 25 mph.
- `Moderate`: effective temperature outside 50°F–70°F, humidity at least 75%, or wind at least 15 mph.
- `Low`: conditions below all of the thresholds above.

Safety notices are informational only and never add another calculation multiplier.

## Stored snapshot

Outdoor sessions and activity rows store the raw conditions, derived temperatures, provider/manual source, automatic/manual flag, retrieval timestamp, effective temperature, load, notices, base calories, adjustment percentage, final calories, and a versioned `environmental_data` JSON field reserved for future factors such as altitude, pressure, UV, solar radiation, elevation, and terrain.

Automatic lookup uses Open-Meteo geocoding plus hourly forecast or historical archive data. The closest available hourly observation to the entered local workout time is stored in SQLite; saved records are never recalculated from live weather.
