(function initCalculations(root, factory) {
  const plankCatalog = typeof require === 'function' ? require('./planks') : root.HealthPlankCatalog;
  const calculations = factory(plankCatalog);
  if (typeof module === 'object' && module.exports) module.exports = calculations;
  root.HealthCalculations = calculations;
})(typeof globalThis !== 'undefined' ? globalThis : this, function calculationsFactory(plankCatalog = {}) {
  function n(value) {
    return Number(value) || 0;
  }

  function lbToKg(lb) {
    return n(lb) * 0.45359237;
  }

  function leanBodyMass(weight, bodyFat) {
    return n(weight) && n(bodyFat) ? n(weight) * (1 - n(bodyFat) / 100) : 0;
  }

  function katchMcardleBmr(leanMassPounds) {
    const leanKg = lbToKg(leanMassPounds);
    return leanKg ? 370 + 21.6 * leanKg : 0;
  }

  function foodTotals(rows) {
    return (rows || []).reduce((sum, row) => ({
      net_carbs: sum.net_carbs + n(row.net_carbs),
      protein: sum.protein + n(row.protein),
      fat: sum.fat + n(row.fat),
      calories: sum.calories + n(row.calories)
    }), { net_carbs: 0, protein: 0, fat: 0, calories: 0 });
  }

  function glucoseSummary(rows) {
    const readings = rows || [];
    const values = readings.map((r) => n(r.value)).filter(Boolean);
    const fasting = readings.filter((r) => r.context === 'fasting morning').map((r) => n(r.value)).filter(Boolean);
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return {
      count: values.length,
      avg,
      a1c: values.length ? (avg + 46.7) / 28.7 : 0,
      fastingCount: fasting.length,
      fastingAvg: fasting.length ? fasting.reduce((a, b) => a + b, 0) / fasting.length : 0,
      highest: values.length ? Math.max(...values) : 0,
      lowest: values.length ? Math.min(...values) : 0
    };
  }

  function glucoseClass(context, value) {
    const v = n(value);
    if ((context === 'fasting morning' && v < 70) || (context === 'post-workout' && v < 65)) return 'reading-low';
    if (context === '1hr post-meal') return v > 200 ? 'reading-red' : v >= 160 ? 'reading-amber' : 'reading-green';
    if (context === '2hr post-meal') return v > 180 ? 'reading-red' : v >= 140 ? 'reading-amber' : 'reading-green';
    if (context === 'bedtime') return v > 150 ? 'reading-red' : v >= 120 ? 'reading-amber' : 'reading-green';
    if (context === 'post-workout') return v > 160 ? 'reading-red' : v >= 130 ? 'reading-amber' : 'reading-green';
    return v > 150 ? 'reading-red' : v >= 130 ? 'reading-amber' : 'reading-green';
  }

  function a1cFlag(value) {
    if (!value) return { tone: '', label: 'No estimate' };
    if (value > 6.5) return { tone: 'bad', label: 'Above diabetes threshold' };
    if (value >= 5.7) return { tone: 'warn', label: 'Prediabetes range' };
    return { tone: 'good', label: 'Below 5.7%' };
  }

  function metCalories(met, minutes, weightPounds) {
    return n(met) * lbToKg(weightPounds) * (n(minutes) / 60);
  }

  function stepCalories(steps, weightPounds, heightFt = 0, heightIn = 0) {
    const heightTotalInches = n(heightFt) * 12 + n(heightIn);
    const strideFeet = heightTotalInches ? heightTotalInches * 0.413 / 12 : 2.5;
    const miles = n(steps) * strideFeet / 5280;
    return miles * n(weightPounds) * 0.53;
  }

  function isWalkingActivity(name) {
    return /\bwalk(?:ing)?\b/i.test(String(name || ''));
  }

  function activityBurnTotals(activityRows = [], options = {}) {
    const stepBurn = stepCalories(options.steps, options.weightPounds, options.heightFt, options.heightIn);
    const hasStepCalories = n(options.steps) > 0 && n(stepBurn) > 0;
    const totals = (activityRows || []).reduce((sum, row) => {
      if (row?.kind === 'workout') return sum;
      if (hasStepCalories && isWalkingActivity(row?.name)) return sum;
      return {
        calories: sum.calories + n(row?.calories),
        minutes: sum.minutes + n(row?.duration)
      };
    }, { calories: stepBurn, minutes: 0 });
    return {
      activityBurn: totals.calories,
      activityMinutes: totals.minutes,
      stepBurn
    };
  }

  function workoutMet(effort) {
    return { light: 3.5, moderate: 5, vigorous: 6 }[effort] || 5;
  }

  function estimatedExerciseMinutes(exercises) {
    const setMinutes = (exercises || []).reduce((sum, exercise) => {
      if (exercise.mode === 'timed') return sum + n(exercise.seconds) / 60;
      return sum + n(exercise.sets) * 1.5;
    }, 0);
    return Math.max(0, setMinutes);
  }

  function workoutCalorieEstimate(session, exercises = [], weightPounds = 0, bmrCalories = 0) {
    const plankRows = (exercises || []).filter((exercise) => plankCatalog.isPlankExercise?.(exercise.exercise));
    const nonPlankRows = (exercises || []).filter((exercise) => !plankCatalog.isPlankExercise?.(exercise.exercise));
    const plankMinutes = plankRows.reduce((sum, exercise) => sum + plankActiveSeconds(exercise) / 60, 0);
    const sessionDuration = n(session?.duration);
    const nonPlankDuration = sessionDuration
      ? Math.max(0, sessionDuration - plankMinutes)
      : estimatedExerciseMinutes(nonPlankRows);
    const duration = plankRows.length ? plankMinutes + nonPlankDuration : sessionDuration || estimatedExerciseMinutes(exercises);
    const hours = duration / 60;
    const pounds = exercises.reduce((sum, exercise) => sum + n(exercise.pounds), 0);
    const nonPlankHours = plankRows.length ? nonPlankDuration / 60 : hours;
    const weightCalories = workoutMet(session?.effort) * lbToKg(weightPounds) * nonPlankHours;
    const bmrDuringWorkout = n(bmrCalories) * (nonPlankDuration / 1440);
    const loadFactor = 1 + Math.min(0.25, nonPlankRows.reduce((sum, exercise) => sum + n(exercise.pounds), 0) / Math.max(1, n(weightPounds)) / 1000);
    const plankCalories = plankRows.reduce((sum, exercise) => sum + plankCaloriesForExercise(exercise, weightPounds, session?.effort), 0);
    return {
      calories: (weightCalories + bmrDuringWorkout) * loadFactor + plankCalories,
      duration,
      pounds
    };
  }

  function plankActiveSeconds(row) {
    const definition = plankCatalog.plankDefinition?.(row?.exercise);
    if (!definition) return 0;
    if (n(row?.seconds) > 0) return Math.min(7200, n(row.seconds) * Math.max(1, n(row.sets) || 1));
    if (definition.type === 'dynamic' && n(row?.reps) > 0) {
      return Math.min(7200, n(row.reps) * Math.max(1, n(row.sets) || 1) * n(definition.cadenceSecondsPerRep || 1.5));
    }
    return 0;
  }

  function plankWeightMultiplier(row, bodyWeightPounds) {
    const definition = plankCatalog.plankDefinition?.(row?.exercise);
    if (!definition?.supportsWeight || n(row?.weight) <= 0 || n(bodyWeightPounds) <= 0) return 1;
    const ratio = Math.min(0.5, n(row.weight) / n(bodyWeightPounds));
    return 1 + Math.min(0.15, ratio * 0.3);
  }

  function effortMultiplier(effort) {
    return { light: 0.9, moderate: 1, vigorous: 1.12 }[effort] || 1;
  }

  function plankCaloriesForExercise(row, bodyWeightPounds = 0, effort = 'moderate') {
    const definition = plankCatalog.plankDefinition?.(row?.exercise);
    if (!definition) return 0;
    const activeMinutes = plankActiveSeconds(row) / 60;
    if (!activeMinutes || n(bodyWeightPounds) <= 0) return 0;
    return n(definition.met) * 3.5 * lbToKg(bodyWeightPounds) / 200 * activeMinutes * plankWeightMultiplier(row, bodyWeightPounds) * effortMultiplier(effort);
  }

  function exercisePounds(row, bodyWeightPounds = 0) {
    if (row?.mode === 'timed') return 0;
    if (row?.mode === 'bodyweight') return n(row.sets) * n(row.reps) * n(bodyWeightPounds);
    return n(row?.sets) * n(row?.reps) * n(row?.weight) * (row?.mode === 'single' ? 2 : 1);
  }

  function lifetimePounds(exercises = [], sessions = [], todayKey = '') {
    const total = exercises.reduce((sum, row) => sum + n(row.pounds), 0);
    const now = todayKey ? new Date(`${todayKey}T00:00:00`) : new Date();
    now.setDate(now.getDate() - now.getDay());
    const weekIso = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');
    const monthIso = (todayKey || '').slice(0, 7);
    return {
      total,
      sessions: sessions.length,
      week: sessions.filter((s) => s.date >= weekIso).length,
      month: sessions.filter((s) => s.date?.startsWith(monthIso)).length
    };
  }

  return {
    n,
    lbToKg,
    leanBodyMass,
    katchMcardleBmr,
    foodTotals,
    glucoseSummary,
    glucoseClass,
    a1cFlag,
    metCalories,
    stepCalories,
    isWalkingActivity,
    activityBurnTotals,
    workoutMet,
    estimatedExerciseMinutes,
    workoutCalorieEstimate,
    plankActiveSeconds,
    plankCaloriesForExercise,
    plankWeightMultiplier,
    exercisePounds,
    lifetimePounds
  };
});
