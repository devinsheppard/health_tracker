const assert = require('node:assert/strict');
const test = require('node:test');

const weather = require('../src/weather');

test('selects the hourly weather nearest the workout time', () => {
  assert.equal(weather.closestHourIndex(
    ['2020-01-01T08:00', '2020-01-01T09:00', '2020-01-01T10:00'],
    '2020-01-01',
    '09:20'
  ), 1);
});

test('retrieves and derives a permanent automatic weather snapshot', async () => {
  const fetchMock = async (url) => {
    if (String(url).includes('geocoding-api')) {
      return {
        ok: true,
        json: async () => ({
          results: [{ latitude: 41.88, longitude: -87.63, timezone: 'America/Chicago', name: 'Chicago', admin1: 'Illinois', country: 'United States' }]
        })
      };
    }
    return {
      ok: true,
      json: async () => ({
        hourly: {
          time: ['2020-07-01T14:00', '2020-07-01T15:00'],
          temperature_2m: [95, 96],
          relative_humidity_2m: [60, 61],
          wind_speed_10m: [10, 11]
        }
      })
    };
  };

  const result = await weather.weatherForWorkout({
    date: '2020-07-01',
    time: '14:10',
    location: 'Chicago'
  }, fetchMock);

  assert.equal(result.location, 'Chicago, Illinois, United States');
  assert.equal(result.temperature_f, 95);
  assert.equal(result.weather_source, 'Open-Meteo (historical)');
  assert.equal(result.weather_is_automatic, 1);
  assert.equal(result.heat_index_f > 95, true);
  assert.equal(result.calorie_adjustment_percent >= 4, true);
});
