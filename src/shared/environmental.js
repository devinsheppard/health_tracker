(function initEnvironmental(root, factory) {
  const environmental = factory();
  if (typeof module === 'object' && module.exports) module.exports = environmental;
  root.HealthEnvironmental = environmental;
})(typeof globalThis !== 'undefined' ? globalThis : this, function environmentalFactory() {
  // Centralized bands keep policy changes independent from the workout calorie formula.
  const CALORIE_ADJUSTMENT_BANDS = Object.freeze([
    Object.freeze({ maxExclusive: 20, percent: 6 }),
    Object.freeze({ maxExclusive: 30, percent: 4 }),
    Object.freeze({ maxExclusive: 40, percent: 2 }),
    Object.freeze({ maxExclusive: 50, percent: 1 }),
    Object.freeze({ maxExclusive: 71, percent: 0 }),
    Object.freeze({ maxExclusive: 85, percent: 1 }),
    Object.freeze({ maxExclusive: 95, percent: 2 }),
    Object.freeze({ maxExclusive: 105, percent: 4 }),
    Object.freeze({ maxExclusive: Infinity, percent: 6 })
  ]);

  function finite(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  // NOAA/NWS Rothfusz regression. It is only used in its intended hot/humid range.
  function calculateHeatIndex(temperatureF, humidityPercent) {
    const t = finite(temperatureF);
    const rh = finite(humidityPercent);
    if (t === null || rh === null || t < 80 || rh < 40) return null;
    let heatIndex = -42.379
      + 2.04901523 * t
      + 10.14333127 * rh
      - 0.22475541 * t * rh
      - 0.00683783 * t * t
      - 0.05481717 * rh * rh
      + 0.00122874 * t * t * rh
      + 0.00085282 * t * rh * rh
      - 0.00000199 * t * t * rh * rh;
    if (rh < 13 && t >= 80 && t <= 112) {
      heatIndex -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
    } else if (rh > 85 && t >= 80 && t <= 87) {
      heatIndex += ((rh - 85) / 10) * ((87 - t) / 5);
    }
    return Number(heatIndex.toFixed(1));
  }

  // NWS wind-chill equation for temperatures at/below 50°F and wind above 3 mph.
  function calculateWindChill(temperatureF, windMph) {
    const t = finite(temperatureF);
    const wind = finite(windMph);
    if (t === null || wind === null || t > 50 || wind <= 3) return null;
    const chill = 35.74 + 0.6215 * t - 35.75 * wind ** 0.16 + 0.4275 * t * wind ** 0.16;
    return Number(chill.toFixed(1));
  }

  function effectiveTemperature(temperatureF, heatIndex, windChill) {
    const temperature = finite(temperatureF);
    const heat = finite(heatIndex);
    const chill = finite(windChill);
    if (temperature === null) return null;
    if (temperature >= 80 && heat !== null) return heat;
    if (temperature <= 50 && chill !== null) return chill;
    return temperature;
  }

  function calorieAdjustmentPercent(effectiveTemperatureF) {
    const effective = finite(effectiveTemperatureF);
    if (effective === null) return 0;
    return CALORIE_ADJUSTMENT_BANDS.find((band) => effective < band.maxExclusive).percent;
  }

  function environmentalLoad(effectiveTemperatureF, humidityPercent, windMph) {
    const effective = finite(effectiveTemperatureF);
    const humidity = finite(humidityPercent);
    const wind = finite(windMph);
    if (effective === null) return null;
    if (effective >= 105 || effective < 20 || (effective >= 95 && humidity >= 70) || wind >= 40) return 'Extreme';
    if (effective >= 95 || effective < 30 || (effective >= 85 && humidity >= 60) || wind >= 25) return 'High';
    if (effective > 70 || effective < 50 || humidity >= 75 || wind >= 15) return 'Moderate';
    return 'Low';
  }

  function safetyWarnings(effectiveTemperatureF, windMph) {
    const effective = finite(effectiveTemperatureF);
    const wind = finite(windMph);
    const warnings = [];
    if (effective !== null && effective >= 105) warnings.push('Extreme heat. Increase hydration and monitor exertion.');
    else if (effective !== null && effective >= 95) warnings.push('High heat may increase fatigue and dehydration.');
    if (effective !== null && effective < 20) warnings.push('Dress appropriately to reduce heat loss.');
    else if (effective !== null && effective < 40) warnings.push('Cold exposure may increase energy expenditure.');
    if (wind !== null && wind >= 20) warnings.push('Strong wind may increase perceived effort.');
    return warnings;
  }

  function environmentalSnapshot(input = {}) {
    const isOutdoor = input.environment === 'outdoor';
    const temperature = finite(input.temperature_f);
    const humidity = finite(input.humidity_percent);
    const wind = finite(input.wind_mph);
    if (!isOutdoor || temperature === null) {
      return {
        heat_index_f: null,
        wind_chill_f: null,
        effective_temperature_f: null,
        calorie_adjustment_percent: 0,
        environmental_load: null,
        safety_warnings: []
      };
    }
    const heatIndex = calculateHeatIndex(temperature, humidity);
    const windChill = calculateWindChill(temperature, wind);
    const effective = effectiveTemperature(temperature, heatIndex, windChill);
    return {
      heat_index_f: heatIndex,
      wind_chill_f: windChill,
      effective_temperature_f: effective,
      calorie_adjustment_percent: calorieAdjustmentPercent(effective),
      environmental_load: environmentalLoad(effective, humidity, wind),
      safety_warnings: safetyWarnings(effective, wind)
    };
  }

  function applyEnvironmentalAdjustment(baseCalories, input = {}) {
    const base = Math.max(0, finite(baseCalories) || 0);
    const snapshot = environmentalSnapshot(input);
    const finalCalories = base * (1 + snapshot.calorie_adjustment_percent / 100);
    return { ...snapshot, base_calories: base, final_calories: finalCalories };
  }

  return {
    CALORIE_ADJUSTMENT_BANDS,
    calculateHeatIndex,
    calculateWindChill,
    effectiveTemperature,
    calorieAdjustmentPercent,
    environmentalLoad,
    safetyWarnings,
    environmentalSnapshot,
    applyEnvironmentalAdjustment
  };
});
