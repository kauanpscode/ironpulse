import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  classifyVolumeZone,
  computeEffectiveWeight,
  computeEpley1RM,
  computePercentDelta,
  computeSetVolume,
  detectPlateau,
  detectProgressionSignal,
  estimateRirFromRpe,
  isWorkingSet,
} from '../src/utils/calculations.ts';
import { computeStreaks, formatDurationClock } from '../src/utils/dates.ts';
import { CURRENT_SCHEMA_VERSION, SCHEMA_STATEMENTS } from '../src/database/schema.ts';
import { EQUIPMENT_TYPES, MUSCLE_GROUPS } from '../src/types/domain.ts';
import type { ExerciseSessionStats } from '../src/types/analytics.ts';
import {
  generateSalt,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  sha256Hex,
  verifyPassword,
} from '../src/utils/crypto.ts';

function runTests(): void {
  // 1. Unilateral vs Total effective weight & volume
  assert.equal(computeEffectiveWeight(80, 'total'), 80);
  assert.equal(computeEffectiveWeight(16, 'per_side'), 32);
  assert.equal(computeSetVolume(16, 'per_side', 10), 320);
  assert.equal(computeSetVolume(80, 'total', 10), 800);

  // 2. Epley 1RM formula: w * (1 + r/30)
  assert.equal(computeEpley1RM(100, 1), 100);
  assert.equal(computeEpley1RM(100, 10), 133.33);
  assert.equal(computeEpley1RM(80, 8), 101.33);

  // 3. Working sets & volume zones (10-20 ideal)
  assert.equal(isWorkingSet('W'), false);
  assert.equal(isWorkingSet('N'), true);
  assert.equal(isWorkingSet('D'), true);
  assert.equal(isWorkingSet('F'), true);
  assert.equal(classifyVolumeZone(8), 'under');
  assert.equal(classifyVolumeZone(10), 'optimal');
  assert.equal(classifyVolumeZone(16), 'optimal');
  assert.equal(classifyVolumeZone(22), 'high');

  // 4. Plateau detection (3+ stagnant sessions)
  const stagnantSessions: ExerciseSessionStats[] = [0, 1, 2, 3].map((i) => ({
    sessionId: `s-${i}`,
    sessionTitle: 'Upper A',
    performedAt: new Date(Date.now() - (4 - i) * 7 * 86400000).toISOString(),
    maxEffectiveWeight: 30,
    maxRawWeight: 30,
    weightMode: 'total',
    bestEstimated1rm: 40,
    totalVolume: 840,
    validSetsCount: 3,
    totalReps: 28,
    avgRpe: 9,
    topSetSummary: '30kg × 10',
    repMin: 8,
    repMax: 10,
    workingSetReps: [10, 9, 9],
  }));
  const plateau = detectPlateau(stagnantSessions);
  assert.equal(plateau.isPlateau, true);
  assert.equal(plateau.stagnantSessions, 4);

  // 5. Progression signal (hits ceiling >= repMax on all working sets)
  const readySessions: ExerciseSessionStats[] = [
    {
      sessionId: 'p-1',
      sessionTitle: 'Upper A',
      performedAt: new Date().toISOString(),
      maxEffectiveWeight: 80,
      maxRawWeight: 80,
      weightMode: 'total',
      bestEstimated1rm: 106.67,
      totalVolume: 2400,
      validSetsCount: 3,
      totalReps: 30,
      avgRpe: 8.5,
      topSetSummary: '80kg × 10',
      repMin: 8,
      repMax: 10,
      workingSetReps: [10, 10, 10],
    },
  ];
  const prog = detectProgressionSignal(readySessions);
  assert.equal(prog.isReadyToProgress, true);
  assert.equal(prog.suggestedNextWeight, 82.5);

  // 6. RPE -> RIR & Percent delta & clock formatting
  assert.equal(estimateRirFromRpe(8.5), 2);
  assert.equal(estimateRirFromRpe(10), 0);
  assert.equal(computePercentDelta(12000, 10000), 20);
  assert.equal(formatDurationClock(95), '01:35');
  assert.equal(formatDurationClock(3665), '01:01:05');

  // 7. Streak calculation
  const today = new Date();
  const fmt = (daysAgo: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const streak = computeStreaks([fmt(6), fmt(4), fmt(2), fmt(1)]);
  assert.equal(streak.currentStreak, 4);
  assert.equal(streak.bestStreak, 4);

  // 8. SQLite schema completeness (v3 with single default routine)
  assert.equal(CURRENT_SCHEMA_VERSION, 3);
  assert.ok(SCHEMA_STATEMENTS.length >= 20);

  // 9. Auth crypto: standard SHA-256 test vector + salted password hash/verify + email checks
  assert.equal(
    sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
  const salt = generateSalt();
  const hash = hashPassword('minhaSenha123', salt);
  assert.equal(verifyPassword('minhaSenha123', salt, hash), true);
  assert.equal(verifyPassword('senhaErrada', salt, hash), false);
  assert.equal(isValidEmail('  Joao@IronPulse.app  '), true);
  assert.equal(normalizeEmail('  Joao@IronPulse.app  '), 'joao@ironpulse.app');
  assert.equal(isValidEmail('email-invalido'), false);

  // 10. Verify seed covers all 9 muscle groups, 5 equipment types, and the exact single default routine
  const seedSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/database/seed.ts'),
    'utf8'
  );
  for (const mg of MUSCLE_GROUPS) {
    assert.ok(seedSource.includes(`muscleGroup: '${mg}'`), `Missing muscle group: ${mg}`);
  }
  for (const eq of EQUIPMENT_TYPES) {
    assert.ok(seedSource.includes(`equipment: '${eq}'`), `Missing equipment: ${eq}`);
  }
  for (const requiredDay of [
    'Inferior 1 (Quadríceps e Glúteos)',
    'Push — Empurrar (Peito, Ombros e Tríceps)',
    'Inferior 2 (Posteriores e Glúteos)',
    'Pull — Puxar (Costas, Deltoide Posterior e Bíceps)',
  ]) {
    assert.ok(seedSource.includes(requiredDay), `Missing default routine day: ${requiredDay}`);
  }

  console.log('ALL_LOGIC_TESTS_PASSED', {
    schemaStatements: SCHEMA_STATEMENTS.length,
    musclesCovered: MUSCLE_GROUPS.length,
    equipmentCovered: EQUIPMENT_TYPES.length,
  });
}

runTests();
