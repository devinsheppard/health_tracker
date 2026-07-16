(function initCatalog(root, factory) {
  const catalog = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = catalog;
  }

  root.HealthCatalog = catalog;
})(typeof globalThis !== 'undefined' ? globalThis : this, function catalogFactory() {
  const pages = [
    ['dashboard', 'Dashboard'],
    ['glucose', 'Glucose'],
    ['bloodPressure', 'Blood Pressure'],
    ['food', 'Food & Macros'],
    ['workouts', 'Workouts'],
    ['activity', 'Activity & Burn'],
    ['weight', 'Weight'],
    ['sleep', 'Sleep'],
    ['meds', 'Medications'],
    ['labs', 'Labs'],
    ['settings', 'Settings']
  ];

  const dietProfiles = {
    keto: 'Keto: target under 30g net carbs, roughly 70% fat and 25% protein.',
    carnivore: 'Carnivore: zero-carb, animal-product-focused intake.',
    'keto-carnivore hybrid': 'Keto-carnivore hybrid: under 20g net carbs with animal-forward meals.',
    'low carb': 'Low carb: keep net carbs under 100g and prioritize protein.',
    paleo: 'Paleo: whole foods without grains, legumes, or dairy.',
    Mediterranean: 'Mediterranean: olive oil, fish, vegetables, and moderate whole grains.',
    'standard American': 'Standard/balanced: around 50% carbs, 25% protein, and 25% fat.',
    'IIFYM/flexible dieting': 'IIFYM: hit daily macro targets flexibly.',
    'intermittent fasting': 'Intermittent fasting: track the eating window while applying the base macro pattern.'
  };

  const activities = {
    'Slow walking': 2.5,
    'Moderate walking': 3.5,
    'Brisk walking': 4.3,
    'Push mowing self-propelled': 5.5,
    'Push mowing manual effort': 6.5,
    'General yard work': 4,
    Gardening: 3.5,
    Shoveling: 6,
    'Biking easy': 4,
    'Biking moderate': 6,
    Swimming: 6,
    Elliptical: 5,
    Housework: 3,
    Cooking: 2,
    Shopping: 2.3,
    'Climbing stairs': 4,
    Standing: 1.5,
    'Custom MET': 0
  };

  const exerciseGroups = {
    Chest: [['Bench press', 'bilateral'], ['Incline bench press', 'bilateral'], ['Decline bench press', 'bilateral'], ['Chest fly', 'bilateral'], ['Push-ups', 'bodyweight'], ['Cable chest fly', 'bilateral'], ['Dumbbell pullover', 'bilateral']],
    Back: [['Rows', 'bilateral'], ['Lat pulldown', 'bilateral'], ['Pull-ups/chin-ups', 'bodyweight'], ['Seated cable row', 'bilateral'], ['Single-arm dumbbell row', 'single'], ['Face pulls', 'bilateral'], ['Deadlift', 'bilateral'], ['Romanian deadlift', 'bilateral']],
    Shoulders: [['Lateral raises', 'single'], ['Front raises', 'single'], ['Overhead press', 'bilateral'], ['Arnold press', 'bilateral'], ['Rear delt fly', 'single'], ['Cable lateral raise', 'single'], ['Upright row', 'bilateral']],
    Biceps: [['Curls pronated', 'single'], ['Curls supinated', 'single'], ['Hammer curls', 'single'], ['Barbell curls', 'bilateral'], ['Concentration curls', 'single'], ['Cable curls', 'single'], ['Preacher curls', 'single']],
    Triceps: [['Tricep cable pushdowns', 'bilateral'], ['Overhead tricep extension', 'bilateral'], ['Skull crushers', 'bilateral'], ['Tricep dips', 'bodyweight'], ['Close-grip bench press', 'bilateral'], ['Kickbacks', 'single']],
    Legs: [['Bodyweight squats', 'bodyweight'], ['Goblet squats', 'bilateral'], ['Leg press', 'bilateral'], ['Lunges', 'single'], ['Step-ups', 'single'], ['Calf raises', 'bilateral'], ['Leg curls', 'bilateral'], ['Leg extensions', 'bilateral'], ['Glute bridges', 'bilateral'], ['Hip thrusts', 'bilateral']],
    Core: [['Planks', 'timed'], ['Crunches', 'bodyweight'], ['Bicycle crunches', 'bodyweight'], ['Leg raises', 'bodyweight'], ['Russian twists', 'bilateral'], ['Dead bug', 'bodyweight']]
  };

  return { pages, dietProfiles, activities, exerciseGroups };
});
