const environmental = require('./shared/environmental');

function validateWeatherRequest(request = {}) {
  const date = String(request.date || '');
  const time = String(request.time || '');
  const location = String(request.location || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('A valid workout date is required.');
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('A valid workout time is required.');
  if (!location) throw new Error('Enter a workout location before retrieving weather.');
  return { date, time, location };
}

async function fetchJson(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Weather provider returned ${response.status}.`);
  return response.json();
}

async function geocode(location, fetchImpl = fetch) {
  const params = new URLSearchParams({ name: location, count: '1', language: 'en', format: 'json' });
  const payload = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?${params}`, fetchImpl);
  const result = payload.results?.[0];
  if (!result) throw new Error('Workout location could not be found.');
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone || 'auto',
    label: [result.name, result.admin1, result.country].filter(Boolean).join(', ')
  };
}

function hourlyUrl(host, place, date) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    start_date: date,
    end_date: date,
    hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: place.timezone
  });
  return `${host}?${params}`;
}

function closestHourIndex(times = [], date, time) {
  const target = new Date(`${date}T${time}:00`).getTime();
  let bestIndex = -1;
  let bestDistance = Infinity;
  times.forEach((value, index) => {
    const distance = Math.abs(new Date(value).getTime() - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

async function weatherForWorkout(request, fetchImpl = fetch) {
  const { date, time, location } = validateWeatherRequest(request);
  const place = await geocode(location, fetchImpl);
  const today = new Date().toISOString().slice(0, 10);
  const preferredHost = date < today
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast';
  const fallbackHost = preferredHost.includes('archive')
    ? 'https://api.open-meteo.com/v1/forecast'
    : 'https://archive-api.open-meteo.com/v1/archive';
  let payload;
  let providerMode;
  try {
    payload = await fetchJson(hourlyUrl(preferredHost, place, date), fetchImpl);
    providerMode = preferredHost.includes('archive') ? 'historical' : 'forecast';
  } catch {
    payload = await fetchJson(hourlyUrl(fallbackHost, place, date), fetchImpl);
    providerMode = fallbackHost.includes('archive') ? 'historical' : 'forecast';
  }
  const index = closestHourIndex(payload.hourly?.time, date, time);
  const temperature = payload.hourly?.temperature_2m?.[index];
  const humidity = payload.hourly?.relative_humidity_2m?.[index];
  const wind = payload.hourly?.wind_speed_10m?.[index];
  if (![temperature, humidity, wind].every(Number.isFinite)) {
    throw new Error('Weather is not available for that workout date and time.');
  }
  const snapshot = environmental.environmentalSnapshot({
    environment: 'outdoor',
    temperature_f: temperature,
    humidity_percent: humidity,
    wind_mph: wind
  });
  return {
    location: place.label,
    temperature_f: temperature,
    humidity_percent: humidity,
    wind_mph: wind,
    ...snapshot,
    weather_source: `Open-Meteo (${providerMode})`,
    weather_is_automatic: 1,
    weather_retrieved_at: new Date().toISOString()
  };
}

module.exports = {
  validateWeatherRequest,
  closestHourIndex,
  weatherForWorkout
};
