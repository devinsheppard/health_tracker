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
