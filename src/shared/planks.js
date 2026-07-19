(function initPlankCatalog(root, factory) {
  const plankCatalog = factory();
  if (typeof module === 'object' && module.exports) module.exports = plankCatalog;
  root.HealthPlankCatalog = plankCatalog;
})(typeof globalThis !== 'undefined' ? globalThis : this, function plankCatalogFactory() {
  const plankDefinitions = [
    { id: 'plank-forearm', name: 'Forearm Plank', type: 'static', met: 3.3, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'standard', aliases: ['Standard Plank'] },
    { id: 'plank-high', name: 'High Plank', type: 'static', met: 3.4, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'standard', aliases: ['Straight-Arm Plank'] },
    { id: 'plank-knee-forearm', name: 'Knee Forearm Plank', type: 'static', met: 2.6, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'modified', aliases: ['Modified Forearm Plank'] },
    { id: 'plank-knee-high', name: 'Knee High Plank', type: 'static', met: 2.7, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'modified', aliases: ['Modified High Plank'] },
    { id: 'plank-side', name: 'Side Plank', type: 'static', met: 3.8, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: true, difficulty: 'standard', aliases: [] },
    { id: 'plank-knee-side', name: 'Knee Side Plank', type: 'static', met: 3.0, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: true, difficulty: 'modified', aliases: ['Modified Side Plank'] },
    { id: 'plank-reverse', name: 'Reverse Plank', type: 'static', met: 3.8, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'standard', aliases: [] },
    { id: 'plank-reverse-tabletop', name: 'Reverse Tabletop Plank', type: 'static', met: 3.2, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'modified', aliases: ['Tabletop Plank'] },
    { id: 'plank-shoulder-taps', name: 'Plank Shoulder Taps', type: 'dynamic', met: 4.6, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'moderate', cadenceSecondsPerRep: 1.5, aliases: [] },
    { id: 'plank-hip-dips', name: 'Plank Hip Dips', type: 'dynamic', met: 4.5, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'moderate', cadenceSecondsPerRep: 1.6, aliases: [] },
    { id: 'plank-jacks', name: 'Plank Jacks', type: 'dynamic', met: 6.5, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'vigorous', cadenceSecondsPerRep: 1.0, aliases: [] },
    { id: 'plank-walk-ups', name: 'Plank Walk-Ups', type: 'dynamic', met: 5.0, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'moderate', cadenceSecondsPerRep: 2.0, aliases: ['Plank Up-Downs', 'Up-Down Plank'] },
    { id: 'plank-knee-to-elbow', name: 'Plank Knee-to-Elbow', type: 'dynamic', met: 5.2, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'moderate', cadenceSecondsPerRep: 1.4, aliases: [] },
    { id: 'plank-knee-to-opposite-elbow', name: 'Plank Knee-to-Opposite-Elbow', type: 'dynamic', met: 5.4, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'moderate', cadenceSecondsPerRep: 1.4, aliases: ['Cross-Body Mountain Climber'] },
    { id: 'plank-mountain-climbers', name: 'Plank Mountain Climbers', type: 'dynamic', met: 7.0, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'vigorous', cadenceSecondsPerRep: 0.8, aliases: ['Mountain Climbers'] },
    { id: 'plank-toe-taps', name: 'Plank Toe Taps', type: 'dynamic', met: 4.7, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'moderate', cadenceSecondsPerRep: 1.3, aliases: [] },
    { id: 'plank-arm-raises', name: 'Plank Arm Raises', type: 'dynamic', met: 4.5, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'moderate', cadenceSecondsPerRep: 1.8, aliases: [] },
    { id: 'plank-leg-raises', name: 'Plank Leg Raises', type: 'dynamic', met: 4.7, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'moderate', cadenceSecondsPerRep: 1.8, aliases: [] },
    { id: 'plank-bird-dog', name: 'Bird-Dog Plank', type: 'dynamic', met: 4.6, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'moderate', cadenceSecondsPerRep: 2.0, aliases: [] },
    { id: 'plank-walking', name: 'Walking Plank', type: 'dynamic', met: 5.3, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'moderate', cadenceSecondsPerRep: 2.2, aliases: [] },
    { id: 'plank-body-saw', name: 'Body Saw Plank', type: 'dynamic', met: 4.8, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'advanced', cadenceSecondsPerRep: 2.0, aliases: [] },
    { id: 'plank-long-lever', name: 'Long-Lever Plank', type: 'static', met: 4.5, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'advanced', aliases: [] },
    { id: 'plank-rkc', name: 'RKC Plank', type: 'static', met: 4.6, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'advanced', aliases: ['Hardstyle Plank'] },
    { id: 'plank-copenhagen', name: 'Copenhagen Plank', type: 'static', met: 4.8, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: true, difficulty: 'advanced', aliases: [] },
    { id: 'plank-star-side', name: 'Star Side Plank', type: 'static', met: 4.8, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: true, difficulty: 'advanced', aliases: [] },
    { id: 'plank-side-hip-lifts', name: 'Side Plank Hip Lifts', type: 'dynamic', met: 4.8, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: true, difficulty: 'moderate', cadenceSecondsPerRep: 1.8, aliases: [] },
    { id: 'plank-side-rotation', name: 'Side Plank Rotation', type: 'dynamic', met: 4.9, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: true, difficulty: 'moderate', cadenceSecondsPerRep: 2.0, aliases: [] },
    { id: 'plank-side-thread-needle', name: 'Side Plank Thread-the-Needle', type: 'dynamic', met: 5.0, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: true, difficulty: 'moderate', cadenceSecondsPerRep: 2.1, aliases: ['Thread-the-Needle Plank'] },
    { id: 'plank-with-row', name: 'Plank with Row', type: 'dynamic', met: 5.2, supportsDuration: true, supportsReps: true, supportsWeight: true, unilateral: false, difficulty: 'moderate', cadenceSecondsPerRep: 2.2, aliases: [] },
    { id: 'plank-renegade-row', name: 'Renegade Row Plank', type: 'dynamic', met: 5.6, supportsDuration: true, supportsReps: true, supportsWeight: true, unilateral: false, difficulty: 'vigorous', cadenceSecondsPerRep: 2.2, aliases: ['Renegade Row'] },
    { id: 'plank-weighted-forearm', name: 'Weighted Forearm Plank', type: 'static', met: 3.8, supportsDuration: true, supportsReps: false, supportsWeight: true, unilateral: false, difficulty: 'weighted', aliases: [] },
    { id: 'plank-weighted-high', name: 'Weighted High Plank', type: 'static', met: 3.9, supportsDuration: true, supportsReps: false, supportsWeight: true, unilateral: false, difficulty: 'weighted', aliases: [] },
    { id: 'plank-stability-ball-forearm', name: 'Stability-Ball Forearm Plank', type: 'static', met: 4.1, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'unstable', aliases: [] },
    { id: 'plank-stability-ball-high', name: 'Stability-Ball High Plank', type: 'static', met: 4.2, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'unstable', aliases: [] },
    { id: 'plank-stir-pot', name: 'Stability-Ball Stir-the-Pot', type: 'dynamic', met: 5.5, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'advanced', cadenceSecondsPerRep: 2.0, aliases: ['Stir-the-Pot'] },
    { id: 'plank-suspension-trainer', name: 'Suspension-Trainer Plank', type: 'static', met: 4.3, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'unstable', aliases: ['TRX Plank'] },
    { id: 'plank-suspension-body-saw', name: 'Suspension-Trainer Body Saw', type: 'dynamic', met: 5.7, supportsDuration: true, supportsReps: true, supportsWeight: false, unilateral: false, difficulty: 'advanced', cadenceSecondsPerRep: 2.0, aliases: ['TRX Body Saw'] },
    { id: 'plank-extended', name: 'Extended Plank', type: 'static', met: 4.2, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: false, difficulty: 'advanced', aliases: [] },
    { id: 'plank-single-arm', name: 'Single-Arm Plank', type: 'static', met: 4.4, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: true, difficulty: 'advanced', aliases: [] },
    { id: 'plank-single-leg', name: 'Single-Leg Plank', type: 'static', met: 4.2, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: true, difficulty: 'advanced', aliases: [] },
    { id: 'plank-single-arm-single-leg', name: 'Single-Arm Single-Leg Plank', type: 'static', met: 4.8, supportsDuration: true, supportsReps: false, supportsWeight: false, unilateral: true, difficulty: 'advanced', aliases: [] }
  ].map((definition) => ({
    muscleGroups: ['Core', 'Abdominals', 'Obliques', 'Transverse abdominis', 'Spinal stabilizers'],
    ...definition
  }));

  const byName = new Map();
  for (const definition of plankDefinitions) {
    byName.set(normalize(definition.name), definition);
    for (const alias of definition.aliases || []) byName.set(normalize(alias), definition);
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function plankDefinition(name) {
    return byName.get(normalize(name)) || null;
  }

  function isPlankExercise(name) {
    return Boolean(plankDefinition(name));
  }

  return { plankDefinitions, plankDefinition, isPlankExercise };
});
