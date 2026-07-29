function seedCurrentReleaseData(db) {
  db.saveSettings({
    name: 'Upgrade Test User',
    date_of_birth: '1980-01-02',
    sex: 'male',
    height_ft: 5,
    height_in: 10,
    current_weight: 205,
    body_fat: 24,
    lean_body_mass: 155.8,
    goals: 'weight loss',
    diet_type: 'low carb',
    medical_conditions: 'Stored condition',
    protein_target: 165,
    a1c_goal: 5.7,
    theme: 'dark',
    ui_scale: 'large',
    eating_window: '10:00-18:00'
  });
  db.addRow('weight_log', { date: '2026-07-20', weight: 205, body_fat: 24, lean_body_mass: 155.8, notes: 'baseline' });
  db.addRow('glucose_readings', { date: '2026-07-21', time: '07:30', context: 'fasting morning', value: 104, notes: 'saved glucose' });
  db.addRow('blood_pressure_readings', { date: '2026-07-21', time: '07:35', systolic: 121, diastolic: 79, heart_rate: 68, position: 'seated', notes: 'saved bp' });
  db.addRow('food_log', { date: '2026-07-21', meal_type: 'breakfast', description: 'eggs', net_carbs: 2, protein: 28, fat: 22, calories: 330 });
  const session = db.addRow('workout_sessions', { date: '2026-07-21', pre_glucose: 108, post_glucose: 96, duration: 35, effort: 'moderate', notes: 'saved workout' });
  db.addRow('workout_exercises', { session_id: session.id, muscle_group: 'Chest', exercise: 'Bench press', sets: 3, reps: 8, weight: 135, seconds: null, mode: 'bilateral', pounds: 3240 });
  db.addRow('workout_templates', { name: 'Saved push day', duration: 35, effort: 'moderate', notes: 'template note', exercises: JSON.stringify([{ muscle_group: 'Chest', exercise: 'Bench press', sets: 3, reps: 8, weight: 135, mode: 'bilateral' }]) });
  db.addRow('activities', { date: '2026-07-21', name: 'General yard work', met: 4, duration: 30, calories: 220, notes: 'saved activity', kind: 'activity' });
  db.addRow('step_log', { date: '2026-07-21', steps: 7250, notes: 'saved steps' });
  db.addRow('sleep_log', { date: '2026-07-21', hours: 7.25, quality: 'good', morning_glucose: 104, notes: 'saved sleep' });
  db.addRow('medications', { name: 'Example medication', dose: '10 mg', frequency: 'daily', timing: 'morning', purpose_notes: 'saved medication' });
  db.addRow('lab_results', { date: '2026-07-19', test_name: 'Hemoglobin A1c', test_category: 'Diabetes & Glucose', value: 5.6, unit: '%', reference_range: '4.0-5.6', notes: 'saved lab', catalog_source: 'built-in', catalog_id: 'hemoglobin-a1c' });
  db.addRow('lab_test_catalog_custom', { display_name: 'Custom Marker', abbreviation: 'CM', aliases: 'custom', category: 'Other', default_unit: 'units', reference_range: '1-10', notes: 'saved custom lab' });
}

module.exports = { seedCurrentReleaseData };
