const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'app.js'), 'utf8');

test('workout and activity forms expose indoor/outdoor weather controls', () => {
  const forms = appJs.slice(appJs.indexOf('function workoutSessionForm'), appJs.indexOf('function stepForm'));

  assert.match(forms, /Environment.*\['indoor', 'outdoor'\]/s);
  assert.match(forms, /Temperature \(°F\)/);
  assert.match(forms, /Humidity \(%\)/);
  assert.match(forms, /Wind speed \(mph\)/);
  assert.match(forms, /Environmental Load/);
  assert.match(forms, /Calorie Adjustment/);
  assert.match(forms, /Final calories/);
});

test('saved calories use the normal estimate as the base before one environmental adjustment', () => {
  const workoutSave = appJs.slice(appJs.indexOf('function bindWorkoutSessionForm'), appJs.indexOf('function bindWorkoutTemplateActions'));
  const activitySave = appJs.slice(appJs.indexOf('function bindActivityForm'), appJs.indexOf('function bindStepForm'));

  assert.match(workoutSave, /const baseCalories = sessionId[\s\S]*Object\.assign\(body, environmentalRecord\(body, baseCalories\)\)/);
  assert.match(workoutSave, /calories: body\.final_calories/);
  assert.match(activitySave, /const baseCalories = n\(body\.calories\) \|\| metCalories/);
  assert.match(activitySave, /body\.calories = body\.final_calories/);
});

test('weather context edits mark retrieved conditions as manual before saving', () => {
  const binding = appJs.slice(appJs.indexOf('function bindWeatherFields'), appJs.indexOf('function updateWeatherPreview'));

  assert.match(binding, /\['date', 'workout_time', 'location', 'temperature_f', 'humidity_percent', 'wind_mph'\]/);
  assert.match(binding, /weather_is_automatic\.value = '0'/);
  assert.match(binding, /weather_source\.value = 'Manual'/);
});

test('activity save errors are visible and outdoor weather fields are required', () => {
  const activityForm = appJs.slice(appJs.indexOf('function activityForm'), appJs.indexOf('function stepForm'));
  const activityBinding = appJs.slice(appJs.indexOf('function bindActivityForm'), appJs.indexOf('function bindStepForm'));
  const weatherBinding = appJs.slice(appJs.indexOf('function bindWeatherFields'), appJs.indexOf('function updateWeatherPreview'));

  assert.match(activityForm, /data-activity-error/);
  assert.match(activityForm, /type="submit"/);
  assert.match(activityBinding, /activityValidationError\(body\)/);
  assert.match(activityBinding, /form\.querySelector\('\[data-activity-error\]'\)/);
  assert.match(weatherBinding, /form\.elements\[field\]\.required = isOutdoor/);
});

test('weather retrieval validates inputs and reports provider failures beside the button', () => {
  const weatherForm = appJs.slice(appJs.indexOf('function weatherSection'), appJs.indexOf('function weatherMetric'));
  const weatherBinding = appJs.slice(appJs.indexOf('function bindWeatherFields'), appJs.indexOf('function updateWeatherPreview'));

  assert.match(weatherForm, /data-weather-error/);
  assert.match(weatherForm, /aria-live="polite"/);
  assert.match(weatherBinding, /Enter a city, postal code, or location before retrieving weather/);
  assert.match(weatherBinding, /fetchButton\.disabled = true/);
  assert.match(weatherBinding, /showWeatherError\(message\)/);
  assert.match(weatherBinding, /finally/);
});

test('weather IPC errors are reduced to useful messages', () => {
  const formatter = appJs.slice(appJs.indexOf('function weatherErrorMessage'), appJs.indexOf('function updateWeatherPreview'));

  assert.match(formatter, /Error invoking remote method/);
  assert.match(formatter, /Check your internet connection/);
});
