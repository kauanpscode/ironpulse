import type { AppDatabase } from './types';
import { ensureDemoUserExists } from './migrations';
import { DEMO_USER_ID } from './sessionState';
import type {
  CardioIntensity,
  CardioModality,
  EquipmentType,
  MuscleGroup,
  SetType,
  SplitType,
  WeightMode,
} from '../types';
import {
  computeEffectiveWeight,
  computeEpley1RM,
  computeSetVolume,
  daysAgoDate,
  estimateRirFromRpe,
  generateId,
  isWorkingSet,
  nowIso,
  toDateKey,
} from '../utils';

interface SeedExerciseDef {
  key: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType;
  defaultWeightMode: WeightMode;
  notes: string;
}

export const PREPOPULATED_EXERCISES: readonly SeedExerciseDef[] = [
  // PEITO
  {
    key: 'incline_db_press',
    name: 'Supino Inclinado com Halteres',
    muscleGroup: 'Peito',
    secondaryMuscles: ['Ombros', 'Tríceps'],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: 'Banco a 30°. Controle excêntrico de 2-3 segundos.',
  },
  {
    key: 'pec_deck',
    name: 'Crucifixo na Máquina (Peck Deck)',
    muscleGroup: 'Peito',
    secondaryMuscles: ['Ombros'],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Alongamento máximo sem perder tensão nos ombros.',
  },
  {
    key: 'bench_barbell',
    name: 'Supino Reto com Barra',
    muscleGroup: 'Peito',
    secondaryMuscles: ['Tríceps', 'Ombros'],
    equipment: 'Barra',
    defaultWeightMode: 'total',
    notes: 'Escápulas retraídas, barra tocando a linha média do peitoral.',
  },
  {
    key: 'cable_crossover',
    name: 'Crossover na Polia Alta',
    muscleGroup: 'Peito',
    secondaryMuscles: ['Ombros'],
    equipment: 'Polia',
    defaultWeightMode: 'per_side',
    notes: 'Pausa de 1s no pico de contração.',
  },
  {
    key: 'dips_chest',
    name: 'Paralelas (Foco Peitoral)',
    muscleGroup: 'Peito',
    secondaryMuscles: ['Tríceps', 'Ombros'],
    equipment: 'Peso Corporal',
    defaultWeightMode: 'total',
    notes: 'Tronco levemente inclinado à frente.',
  },

  // COSTAS
  {
    key: 'lat_pulldown',
    name: 'Puxada Alta (Pegada Aberta ou Neutra)',
    muscleGroup: 'Costas',
    secondaryMuscles: ['Bíceps'],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Deprimir escápulas antes de flexionar os cotovelos.',
  },
  {
    key: 'articulated_or_barbell_row',
    name: 'Remada Articulada ou Curvada (Pegada Aberta)',
    muscleGroup: 'Costas',
    secondaryMuscles: ['Bíceps', 'Ombros'],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Foco em parte superior das costas e retração escapular.',
  },
  {
    key: 'seated_cable_row',
    name: 'Remada Baixa na Polia (Triângulo)',
    muscleGroup: 'Costas',
    secondaryMuscles: ['Bíceps'],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Pegada neutra no triângulo, segurar 1s no final da puxada.',
  },
  {
    key: 'barbell_row',
    name: 'Remada Curvada com Barra',
    muscleGroup: 'Costas',
    secondaryMuscles: ['Bíceps'],
    equipment: 'Barra',
    defaultWeightMode: 'total',
    notes: 'Tronco estável a ~45°, puxar em direção ao umbigo.',
  },
  {
    key: 'db_one_arm_row',
    name: 'Remada Unilateral com Halter',
    muscleGroup: 'Costas',
    secondaryMuscles: ['Bíceps'],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: 'Puxar cotovelo em direção ao quadril.',
  },
  {
    key: 'pull_up',
    name: 'Barra Fixa Pronada',
    muscleGroup: 'Costas',
    secondaryMuscles: ['Bíceps'],
    equipment: 'Peso Corporal',
    defaultWeightMode: 'total',
    notes: 'Amplitude completa até queixo acima da barra.',
  },

  // QUADRÍCEPS
  {
    key: 'hack_squat',
    name: 'Agachamento no Hack',
    muscleGroup: 'Quadríceps',
    secondaryMuscles: ['Posteriores'],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Descida profunda controlada, joelhos acompanhando a linha dos pés.',
  },
  {
    key: 'leg_press_45',
    name: 'Leg Press 45°',
    muscleGroup: 'Quadríceps',
    secondaryMuscles: ['Posteriores'],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Pés na metade inferior da plataforma sem tirar lombar do encosto.',
  },
  {
    key: 'leg_extension',
    name: 'Cadeira Extensora',
    muscleGroup: 'Quadríceps',
    secondaryMuscles: [],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Segurar 1s no topo com contração máxima.',
  },
  {
    key: 'bulgarian_split_squat',
    name: 'Búlgaro ou Afundo com Halteres',
    muscleGroup: 'Quadríceps',
    secondaryMuscles: ['Posteriores'],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: '10 reps cada lado. Peso registrado por halter (calculado ×2 automaticamente).',
  },
  {
    key: 'back_squat',
    name: 'Agachamento Livre com Barra',
    muscleGroup: 'Quadríceps',
    secondaryMuscles: ['Posteriores'],
    equipment: 'Barra',
    defaultWeightMode: 'total',
    notes: 'Bracing abdominal firme, descer abaixo da paralela.',
  },

  // POSTERIORES & GLÚTEOS
  {
    key: 'hip_thrust',
    name: 'Elevação Pélvica (Barra ou Máquina)',
    muscleGroup: 'Posteriores',
    secondaryMuscles: ['Quadríceps'],
    equipment: 'Barra',
    defaultWeightMode: 'total',
    notes: 'Pausa de 1s no pico de extensão com retroversão pélvica.',
  },
  {
    key: 'stiff_barbell',
    name: 'Stiff com Barra',
    muscleGroup: 'Posteriores',
    secondaryMuscles: ['Costas'],
    equipment: 'Barra',
    defaultWeightMode: 'total',
    notes: 'Quadril para trás, barra rente às pernas, coluna neutra.',
  },
  {
    key: 'lying_leg_curl',
    name: 'Mesa Flexora',
    muscleGroup: 'Posteriores',
    secondaryMuscles: ['Panturrilhas'],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Manter quadril pressionado no banco durante toda a série.',
  },
  {
    key: 'seated_leg_curl',
    name: 'Cadeira Flexora',
    muscleGroup: 'Posteriores',
    secondaryMuscles: [],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Excelente hipertrofia em alongamento; descer devagar.',
  },
  {
    key: 'hip_abduction',
    name: 'Cadeira Abdutora',
    muscleGroup: 'Posteriores',
    secondaryMuscles: [],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Foco em glúteo médio e máximo; controle na volta.',
  },
  {
    key: 'rdl_db',
    name: 'Levantamento Terra Romeno com Halteres',
    muscleGroup: 'Posteriores',
    secondaryMuscles: ['Costas'],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: 'Manter leve flexão de joelhos e foco no alongamento.',
  },

  // OMBROS
  {
    key: 'db_shoulder_press',
    name: 'Desenvolvimento com Halteres',
    muscleGroup: 'Ombros',
    secondaryMuscles: ['Tríceps'],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: 'Cotovelos levemente à frente do plano escapular.',
  },
  {
    key: 'lateral_raise_db',
    name: 'Elevação Lateral com Halteres',
    muscleGroup: 'Ombros',
    secondaryMuscles: [],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: 'Elevar até a linha dos ombros sem balanço excessivo.',
  },
  {
    key: 'reverse_fly_or_face_pull',
    name: 'Crucifixo Inverso (Máquina/Polia) ou Face Pull',
    muscleGroup: 'Ombros',
    secondaryMuscles: ['Costas'],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Foco em deltoide posterior e rotação externa controlada.',
  },
  {
    key: 'lateral_raise_cable',
    name: 'Elevação Lateral na Polia',
    muscleGroup: 'Ombros',
    secondaryMuscles: [],
    equipment: 'Polia',
    defaultWeightMode: 'per_side',
    notes: 'Tensão constante desde o início da amplitude.',
  },

  // BÍCEPS
  {
    key: 'db_bicep_curl',
    name: 'Rosca Direta com Halteres',
    muscleGroup: 'Bíceps',
    secondaryMuscles: [],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: 'Cotovelos fixos ao lado do tronco, supinação completa no topo.',
  },
  {
    key: 'hammer_or_incline_curl',
    name: 'Rosca Martelo ou Inclinada com Halteres',
    muscleGroup: 'Bíceps',
    secondaryMuscles: [],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: 'Alternar ou escolher entre pegada neutra (martelo) ou banco a 45°.',
  },
  {
    key: 'barbell_curl',
    name: 'Rosca Direta com Barra',
    muscleGroup: 'Bíceps',
    secondaryMuscles: [],
    equipment: 'Barra',
    defaultWeightMode: 'total',
    notes: 'Cotovelos fixos ao lado do tronco, sem roubar com lombar.',
  },
  {
    key: 'cable_curl',
    name: 'Rosca na Polia Baixa',
    muscleGroup: 'Bíceps',
    secondaryMuscles: [],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Excelente opção para drop-sets.',
  },

  // TRÍCEPS
  {
    key: 'triceps_overhead_cable',
    name: 'Tríceps Francês na Polia (acima da cabeça)',
    muscleGroup: 'Tríceps',
    secondaryMuscles: [],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Ênfase na cabeça longa sob alongamento máximo.',
  },
  {
    key: 'triceps_rope',
    name: 'Tríceps Corda na Polia',
    muscleGroup: 'Tríceps',
    secondaryMuscles: [],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Abrir a corda no final da extensão mantendo cotovelos fixos.',
  },
  {
    key: 'skullcrusher_barbell',
    name: 'Tríceps Testa com Barra W',
    muscleGroup: 'Tríceps',
    secondaryMuscles: [],
    equipment: 'Barra',
    defaultWeightMode: 'total',
    notes: 'Descer atrás da linha da testa para manter tensão contínua.',
  },

  // PANTURRILHAS
  {
    key: 'hack_calf_raise',
    name: 'Panturrilha no Hack',
    muscleGroup: 'Panturrilhas',
    secondaryMuscles: [],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Pausa de 2s no alongamento inferior para eliminar efeito elástico.',
  },
  {
    key: 'seated_calf_machine',
    name: 'Panturrilha Sentado na Máquina',
    muscleGroup: 'Panturrilhas',
    secondaryMuscles: [],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Foco em sóleo com cadência lenta.',
  },

  // ABDÔMEN
  {
    key: 'plank_abdominal',
    name: 'Prancha Abdominal',
    muscleGroup: 'Abdômen',
    secondaryMuscles: [],
    equipment: 'Peso Corporal',
    defaultWeightMode: 'total',
    notes: 'Isometria: registrar o tempo (45–60 seg) no campo de reps.',
  },
  {
    key: 'cable_or_infra_abs',
    name: 'Abdominal na Polia ou Infra',
    muscleGroup: 'Abdômen',
    secondaryMuscles: [],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Flexionar a coluna torácica (polia) ou elevar a pelve (infra).',
  },
] as const;

interface RoutineDayBlueprint {
  key: string;
  name: string;
  focusMuscles: MuscleGroup[];
  estimatedMinutes: number;
  exercises: Array<{
    exerciseKey: string;
    targetSets: number;
    repMin: number;
    repMax: number;
    restSeconds: number;
    notes?: string;
  }>;
}

interface RoutineBlueprint {
  key: string;
  name: string;
  splitType: SplitType;
  description: string;
  isActive: boolean;
  days: RoutineDayBlueprint[];
}

export const ROUTINE_BLUEPRINTS: readonly RoutineBlueprint[] = [
  {
    key: 'lower_push_lower_pull_4x',
    name: 'Inferior / Push / Pull — 4x',
    splitType: 'Upper/Lower',
    description:
      'Divisão padrão de 4 dias: Inferior 1 (Quadríceps e Glúteos), Push (Empurrar), Inferior 2 (Posteriores e Glúteos) e Pull (Puxar).',
    isActive: true,
    days: [
      {
        key: 'inferior_1',
        name: 'Inferior 1 (Quadríceps e Glúteos)',
        focusMuscles: ['Quadríceps', 'Posteriores', 'Panturrilhas', 'Abdômen'],
        estimatedMinutes: 60,
        exercises: [
          { exerciseKey: 'hack_squat', targetSets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
          { exerciseKey: 'leg_press_45', targetSets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
          { exerciseKey: 'leg_extension', targetSets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
          {
            exerciseKey: 'lying_leg_curl',
            targetSets: 3,
            repMin: 10,
            repMax: 12,
            restSeconds: 75,
            notes: 'Descanso sugerido: 60–90 seg',
          },
          {
            exerciseKey: 'hack_calf_raise',
            targetSets: 3,
            repMin: 12,
            repMax: 15,
            restSeconds: 60,
            notes: 'Descanso sugerido: 45–60 seg',
          },
          {
            exerciseKey: 'plank_abdominal',
            targetSets: 3,
            repMin: 45,
            repMax: 60,
            restSeconds: 45,
            notes: 'Tempo isométrico em segundos (45–60 seg)',
          },
        ],
      },
      {
        key: 'push',
        name: 'Push — Empurrar (Peito, Ombros e Tríceps)',
        focusMuscles: ['Peito', 'Ombros', 'Tríceps'],
        estimatedMinutes: 60,
        exercises: [
          { exerciseKey: 'incline_db_press', targetSets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
          { exerciseKey: 'pec_deck', targetSets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
          { exerciseKey: 'db_shoulder_press', targetSets: 3, repMin: 8, repMax: 10, restSeconds: 90 },
          { exerciseKey: 'lateral_raise_db', targetSets: 4, repMin: 12, repMax: 15, restSeconds: 60 },
          { exerciseKey: 'triceps_overhead_cable', targetSets: 3, repMin: 10, repMax: 12, restSeconds: 60 },
          { exerciseKey: 'triceps_rope', targetSets: 2, repMin: 10, repMax: 12, restSeconds: 60 },
        ],
      },
      {
        key: 'inferior_2',
        name: 'Inferior 2 (Posteriores e Glúteos)',
        focusMuscles: ['Posteriores', 'Quadríceps', 'Abdômen'],
        estimatedMinutes: 60,
        exercises: [
          { exerciseKey: 'hip_thrust', targetSets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
          { exerciseKey: 'stiff_barbell', targetSets: 3, repMin: 8, repMax: 10, restSeconds: 90 },
          {
            exerciseKey: 'bulgarian_split_squat',
            targetSets: 3,
            repMin: 10,
            repMax: 10,
            restSeconds: 90,
            notes: '10 reps cada lado',
          },
          { exerciseKey: 'seated_leg_curl', targetSets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
          {
            exerciseKey: 'hip_abduction',
            targetSets: 3,
            repMin: 12,
            repMax: 15,
            restSeconds: 60,
            notes: 'Descanso sugerido: 45–60 seg',
          },
          { exerciseKey: 'cable_or_infra_abs', targetSets: 3, repMin: 12, repMax: 15, restSeconds: 45 },
        ],
      },
      {
        key: 'pull',
        name: 'Pull — Puxar (Costas, Deltoide Posterior e Bíceps)',
        focusMuscles: ['Costas', 'Ombros', 'Bíceps'],
        estimatedMinutes: 60,
        exercises: [
          { exerciseKey: 'lat_pulldown', targetSets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
          { exerciseKey: 'articulated_or_barbell_row', targetSets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
          { exerciseKey: 'seated_cable_row', targetSets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
          { exerciseKey: 'reverse_fly_or_face_pull', targetSets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
          { exerciseKey: 'db_bicep_curl', targetSets: 3, repMin: 10, repMax: 12, restSeconds: 60 },
          { exerciseKey: 'hammer_or_incline_curl', targetSets: 3, repMin: 10, repMax: 12, restSeconds: 60 },
        ],
      },
    ],
  },
];

interface SeedSetSpec {
  type: SetType;
  weight: number;
  reps: number;
  rpe: number;
}

/**
 * Generates realistic 4-week set progressions for the default 4-day routine:
 * - incline_db_press: hits ceiling (3x10 at 28kg/lado) in Week 4 -> Progression Signal!
 * - db_bicep_curl: intentional 4-week plateau (14kg/lado x 11,10,10) -> Plateau Alert!
 * - hack_squat, hip_thrust, stiff_barbell, lat_pulldown: steady progressive overload.
 */
function buildWeeklySets(exerciseKey: string, weekIdx: number): SeedSetSpec[] {
  switch (exerciseKey) {
    // INFERIOR 1
    case 'hack_squat': {
      const weights = [90, 95, 100, 105];
      const w = weights[weekIdx] ?? 100;
      return [
        { type: 'W', weight: 50, reps: 10, rpe: 5 },
        { type: 'N', weight: w, reps: 9, rpe: 8 },
        { type: 'N', weight: w, reps: 9, rpe: 8.5 },
        { type: 'N', weight: w, reps: 8 + (weekIdx === 3 ? 1 : 0), rpe: 9 },
      ];
    }

    case 'leg_press_45': {
      const w = 180 + weekIdx * 10;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8 },
        { type: 'N', weight: w, reps: 11, rpe: 8.5 },
        { type: 'N', weight: w, reps: 10, rpe: 9 },
      ];
    }

    case 'leg_extension': {
      const w = 55 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 14, rpe: 8.5 },
        { type: 'N', weight: w, reps: 13, rpe: 9 },
        { type: 'F', weight: w, reps: 12, rpe: 9.5 },
      ];
    }

    case 'lying_leg_curl': {
      const w = 42.5 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8 },
        { type: 'N', weight: w, reps: 11, rpe: 8.5 },
        { type: 'N', weight: w, reps: 10, rpe: 9 },
      ];
    }

    case 'hack_calf_raise': {
      const w = 70 + weekIdx * 5;
      return [
        { type: 'N', weight: w, reps: 15, rpe: 8 },
        { type: 'N', weight: w, reps: 14, rpe: 8.5 },
        { type: 'N', weight: w, reps: 13, rpe: 9 },
      ];
    }

    case 'plank_abdominal': {
      const secs = 45 + weekIdx * 5;
      return [
        { type: 'N', weight: 0, reps: Math.min(60, secs), rpe: 7.5 },
        { type: 'N', weight: 0, reps: Math.min(60, secs), rpe: 8 },
        { type: 'N', weight: 0, reps: Math.min(60, secs - 5), rpe: 8.5 },
      ];
    }

    // PUSH
    case 'incline_db_press': {
      const weights = [24, 26, 28, 28];
      const repsByWeek: readonly [number, number, number][] = [
        [8, 8, 8],
        [9, 8, 8],
        [9, 9, 8],
        [10, 10, 10], // Hits ceiling of 8-10 on all 3 working sets -> Progression Signal!
      ];
      const w = weights[weekIdx] ?? 28;
      const r = repsByWeek[weekIdx] ?? [10, 10, 10];
      return [
        { type: 'W', weight: 14, reps: 10, rpe: 5 },
        { type: 'N', weight: w, reps: r[0], rpe: 8 },
        { type: 'N', weight: w, reps: r[1], rpe: 8.5 },
        { type: 'N', weight: w, reps: r[2], rpe: 9 },
      ];
    }

    case 'pec_deck': {
      const w = 50 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8 },
        { type: 'N', weight: w, reps: 11, rpe: 8.5 },
        { type: 'F', weight: w, reps: 10, rpe: 9.5 },
      ];
    }

    case 'db_shoulder_press': {
      const weights = [18, 18, 20, 20];
      const reps = [9, 10, 8, 9];
      const w = weights[weekIdx] ?? 20;
      const r = reps[weekIdx] ?? 9;
      return [
        { type: 'N', weight: w, reps: r, rpe: 8 },
        { type: 'N', weight: w, reps: r, rpe: 8.5 },
        { type: 'N', weight: w, reps: Math.max(8, r - 1), rpe: 9 },
      ];
    }

    case 'lateral_raise_db': {
      const weights = [10, 10, 12, 12];
      const reps = [14, 15, 13, 14];
      const w = weights[weekIdx] ?? 12;
      const r = reps[weekIdx] ?? 14;
      return [
        { type: 'N', weight: w, reps: r, rpe: 8 },
        { type: 'N', weight: w, reps: r, rpe: 8.5 },
        { type: 'N', weight: w, reps: r - 1, rpe: 9 },
        { type: 'D', weight: Math.max(8, w - 2), reps: 14, rpe: 9.5 },
      ];
    }

    case 'triceps_overhead_cable': {
      const w = 22.5 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8 },
        { type: 'N', weight: w, reps: 11, rpe: 8.5 },
        { type: 'N', weight: w, reps: 10, rpe: 9 },
      ];
    }

    case 'triceps_rope': {
      const w = 25 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8.5 },
        { type: 'D', weight: Math.max(15, w - 5), reps: 11, rpe: 9.5 },
      ];
    }

    // INFERIOR 2
    case 'hip_thrust': {
      const w = 100 + weekIdx * 10;
      return [
        { type: 'W', weight: 60, reps: 10, rpe: 5 },
        { type: 'N', weight: w, reps: 10, rpe: 8 },
        { type: 'N', weight: w, reps: 9, rpe: 8.5 },
        { type: 'N', weight: w, reps: 9, rpe: 9 },
      ];
    }

    case 'stiff_barbell': {
      const w = 75 + weekIdx * 5;
      return [
        { type: 'W', weight: 40, reps: 10, rpe: 5 },
        { type: 'N', weight: w, reps: 10, rpe: 8 },
        { type: 'N', weight: w, reps: 9, rpe: 8.5 },
        { type: 'N', weight: w, reps: 8, rpe: 9 },
      ];
    }

    case 'bulgarian_split_squat': {
      const weights = [14, 16, 16, 18];
      const w = weights[weekIdx] ?? 16;
      return [
        { type: 'N', weight: w, reps: 10, rpe: 8 },
        { type: 'N', weight: w, reps: 10, rpe: 8.5 },
        { type: 'N', weight: w, reps: 9, rpe: 9 },
      ];
    }

    case 'seated_leg_curl': {
      const w = 47.5 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 14, rpe: 8 },
        { type: 'N', weight: w, reps: 13, rpe: 8.5 },
        { type: 'N', weight: w, reps: 12, rpe: 9 },
      ];
    }

    case 'hip_abduction': {
      const w = 55 + weekIdx * 5;
      return [
        { type: 'N', weight: w, reps: 15, rpe: 8 },
        { type: 'N', weight: w, reps: 14, rpe: 8.5 },
        { type: 'N', weight: w, reps: 13, rpe: 9 },
      ];
    }

    case 'cable_or_infra_abs': {
      const w = 32.5 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 15, rpe: 8 },
        { type: 'N', weight: w, reps: 14, rpe: 8.5 },
        { type: 'N', weight: w, reps: 13, rpe: 9 },
      ];
    }

    // PULL
    case 'lat_pulldown': {
      const w = 55 + weekIdx * 2.5;
      return [
        { type: 'W', weight: 35, reps: 10, rpe: 5 },
        { type: 'N', weight: w, reps: 10, rpe: 8 },
        { type: 'N', weight: w, reps: 9, rpe: 8.5 },
        { type: 'N', weight: w, reps: 9, rpe: 9 },
      ];
    }

    case 'articulated_or_barbell_row': {
      const w = 60 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 10, rpe: 8 },
        { type: 'N', weight: w, reps: 9, rpe: 8.5 },
        { type: 'N', weight: w, reps: 8, rpe: 9 },
      ];
    }

    case 'seated_cable_row': {
      const w = 52.5 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8 },
        { type: 'N', weight: w, reps: 11, rpe: 8.5 },
        { type: 'N', weight: w, reps: 10, rpe: 9 },
      ];
    }

    case 'reverse_fly_or_face_pull': {
      const w = 22.5 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 15, rpe: 8 },
        { type: 'N', weight: w, reps: 14, rpe: 8.5 },
        { type: 'N', weight: w, reps: 13, rpe: 9 },
      ];
    }

    case 'db_bicep_curl': {
      // Intentional 4-week PLATEAU: exact same 14kg/lado x (11, 10, 10) every week!
      return [
        { type: 'N', weight: 14, reps: 11, rpe: 8.5 },
        { type: 'N', weight: 14, reps: 10, rpe: 9 },
        { type: 'F', weight: 14, reps: 10, rpe: 9.5 },
      ];
    }

    case 'hammer_or_incline_curl': {
      const weights = [12, 12, 14, 14];
      const w = weights[weekIdx] ?? 14;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8 },
        { type: 'N', weight: w, reps: 11, rpe: 8.5 },
        { type: 'N', weight: w, reps: 10, rpe: 9 },
      ];
    }

    default:
      return [
        { type: 'N', weight: 30, reps: 10, rpe: 8 },
        { type: 'N', weight: 30, reps: 10, rpe: 8.5 },
        { type: 'N', weight: 30, reps: 9, rpe: 9 },
      ];
  }
}

export async function ensurePrepopulatedExercises(
  db: AppDatabase
): Promise<Map<string, { id: string; mode: WeightMode }>> {
  const createdTs = nowIso();
  const map = new Map<string, { id: string; mode: WeightMode }>();

  for (const ex of PREPOPULATED_EXERCISES) {
    const existingEx = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM exercises WHERE name = ? AND user_id IS NULL AND deleted_at IS NULL`,
      [ex.name]
    );
    if (existingEx) {
      map.set(ex.key, { id: existingEx.id, mode: ex.defaultWeightMode });
      continue;
    }

    const id = generateId();
    await db.runAsync(
      `INSERT INTO exercises (
        id, user_id, name, muscle_group, secondary_muscles, equipment,
        default_weight_mode, is_custom, notes, sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, 0, ?, 'synced', ?, ?, NULL)`,
      [
        id,
        ex.name,
        ex.muscleGroup,
        JSON.stringify(ex.secondaryMuscles),
        ex.equipment,
        ex.defaultWeightMode,
        ex.notes,
        createdTs,
        createdTs,
      ]
    );
    map.set(ex.key, { id, mode: ex.defaultWeightMode });
  }

  return map;
}

export async function createStarterRoutinesForUser(
  db: AppDatabase,
  userId: string
): Promise<void> {
  const createdTs = nowIso();
  const exerciseByKey = await ensurePrepopulatedExercises(db);

  await db.withTransactionAsync(async () => {
    for (const routine of ROUTINE_BLUEPRINTS) {
      const routineId = generateId();
      await db.runAsync(
        `INSERT INTO routines (
          id, user_id, name, split_type, description, is_active, sync_status, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`,
        [
          routineId,
          userId,
          routine.name,
          routine.splitType,
          routine.description,
          routine.isActive ? 1 : 0,
          createdTs,
          createdTs,
        ]
      );

      for (let dIdx = 0; dIdx < routine.days.length; dIdx += 1) {
        const day = routine.days[dIdx];
        if (!day) continue;
        const dayId = generateId();

        await db.runAsync(
          `INSERT INTO routine_days (
            id, routine_id, name, day_order, focus_muscles, estimated_minutes,
            sync_status, created_at, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`,
          [
            dayId,
            routineId,
            day.name,
            dIdx,
            JSON.stringify(day.focusMuscles),
            day.estimatedMinutes,
            createdTs,
            createdTs,
          ]
        );

        for (let eIdx = 0; eIdx < day.exercises.length; eIdx += 1) {
          const rx = day.exercises[eIdx];
          if (!rx) continue;
          const mapped = exerciseByKey.get(rx.exerciseKey);
          if (!mapped) continue;

          await db.runAsync(
            `INSERT INTO routine_exercises (
              id, routine_day_id, exercise_id, order_index, target_sets,
              rep_min, rep_max, rest_seconds, weight_mode, notes,
              sync_status, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`,
            [
              generateId(),
              dayId,
              mapped.id,
              eIdx,
              rx.targetSets,
              rx.repMin,
              rx.repMax,
              rx.restSeconds,
              mapped.mode,
              rx.notes ?? '',
              createdTs,
              createdTs,
            ]
          );
        }
      }
    }
  });
}

export async function seedDatabaseIfNeeded(db: AppDatabase): Promise<boolean> {
  await ensureDemoUserExists(db);
  const existing = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM schema_meta WHERE key = 'seeded_at'`
  );
  if (existing?.value) {
    return false;
  }

  await runRealisticSeed(db, DEMO_USER_ID);
  return true;
}

export async function runRealisticSeed(
  db: AppDatabase,
  targetUserId: string = DEMO_USER_ID
): Promise<void> {
  await ensureDemoUserExists(db);
  const createdTs = nowIso();
  const exerciseMap = await ensurePrepopulatedExercises(db);

  await db.withTransactionAsync(async () => {
    // 1. Insert ONLY the default routine (Inferior 1 / Push / Inferior 2 / Pull)
    const routineIdByKey = new Map<string, string>();
    const routineDayIdByKey = new Map<string, string>();
    const routineExerciseIdByPair = new Map<string, string>();

    for (const routine of ROUTINE_BLUEPRINTS) {
      const routineId = generateId();
      routineIdByKey.set(routine.key, routineId);
      await db.runAsync(
        `INSERT INTO routines (
          id, user_id, name, split_type, description, is_active, sync_status, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL)`,
        [
          routineId,
          targetUserId,
          routine.name,
          routine.splitType,
          routine.description,
          routine.isActive ? 1 : 0,
          createdTs,
          createdTs,
        ]
      );

      for (let dIdx = 0; dIdx < routine.days.length; dIdx += 1) {
        const day = routine.days[dIdx];
        if (!day) continue;
        const dayId = generateId();
        routineDayIdByKey.set(day.key, dayId);

        await db.runAsync(
          `INSERT INTO routine_days (
            id, routine_id, name, day_order, focus_muscles, estimated_minutes,
            sync_status, created_at, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL)`,
          [
            dayId,
            routineId,
            day.name,
            dIdx,
            JSON.stringify(day.focusMuscles),
            day.estimatedMinutes,
            createdTs,
            createdTs,
          ]
        );

        for (let eIdx = 0; eIdx < day.exercises.length; eIdx += 1) {
          const rx = day.exercises[eIdx];
          if (!rx) continue;
          const mapped = exerciseMap.get(rx.exerciseKey);
          if (!mapped) continue;

          const rxId = generateId();
          routineExerciseIdByPair.set(`${day.key}:${rx.exerciseKey}`, rxId);

          await db.runAsync(
            `INSERT INTO routine_exercises (
              id, routine_day_id, exercise_id, order_index, target_sets,
              rep_min, rep_max, rest_seconds, weight_mode, notes,
              sync_status, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL)`,
            [
              rxId,
              dayId,
              mapped.id,
              eIdx,
              rx.targetSets,
              rx.repMin,
              rx.repMax,
              rx.restSeconds,
              mapped.mode,
              rx.notes ?? '',
              createdTs,
              createdTs,
            ]
          );
        }
      }
    }

    // 2. Insert 4 Weeks of Realistic Workout History (16 sessions)
    const defaultRoutine = ROUTINE_BLUEPRINTS[0];
    const activeRoutineId = defaultRoutine
      ? routineIdByKey.get(defaultRoutine.key) ?? null
      : null;

    const bestWeightMap = new Map<string, number>();
    const best1rmMap = new Map<string, number>();
    const bestVolumeMap = new Map<string, number>();

    const weeklyScheduleDaysAgo: readonly [number, number, number, number][] = [
      [27, 25, 23, 22], // Week 1
      [20, 18, 16, 15], // Week 2
      [13, 11, 9, 8],   // Week 3
      [6, 4, 2, 1],     // Week 4 (last was Pull yesterday -> Next Workout = Inferior 1!)
    ];

    if (defaultRoutine) {
      for (let weekIdx = 0; weekIdx < weeklyScheduleDaysAgo.length; weekIdx += 1) {
        const weekDays = weeklyScheduleDaysAgo[weekIdx];
        if (!weekDays) continue;

        for (let dayIdx = 0; dayIdx < defaultRoutine.days.length; dayIdx += 1) {
          const dayBlueprint = defaultRoutine.days[dayIdx];
          const daysAgo = weekDays[dayIdx];
          if (!dayBlueprint || daysAgo === undefined) continue;

          const dayId = routineDayIdByKey.get(dayBlueprint.key) ?? null;
          const startDate = daysAgoDate(daysAgo, 18, 15);
          const durationSec = (54 + ((weekIdx * 3 + dayIdx * 4) % 14)) * 60;
          const finishDate = new Date(startDate.getTime() + durationSec * 1000);
          const startIso = startDate.toISOString();
          const finishIso = finishDate.toISOString();
          const sessionId = generateId();

          let sessionTonnage = 0;
          let sessionValidSets = 0;

          await db.runAsync(
            `INSERT INTO workout_sessions (
              id, user_id, routine_id, routine_day_id, title, started_at, finished_at,
              duration_seconds, total_tonnage, total_valid_sets, notes, status,
              sync_status, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'completed', 'synced', ?, ?, NULL)`,
            [
              sessionId,
              targetUserId,
              activeRoutineId,
              dayId,
              dayBlueprint.name,
              startIso,
              finishIso,
              durationSec,
              weekIdx === 3 && dayIdx === 1
                ? 'Supino inclinado sólido — pronto para subir carga!'
                : '',
              startIso,
              finishIso,
            ]
          );

          for (let exOrder = 0; exOrder < dayBlueprint.exercises.length; exOrder += 1) {
            const rx = dayBlueprint.exercises[exOrder];
            if (!rx) continue;
            const mapped = exerciseMap.get(rx.exerciseKey);
            if (!mapped) continue;

            const exerciseId = mapped.id;
            const weightMode = mapped.mode;
            const sessionExerciseId = generateId();
            const routineExerciseId =
              routineExerciseIdByPair.get(`${dayBlueprint.key}:${rx.exerciseKey}`) ?? null;

            await db.runAsync(
              `INSERT INTO workout_session_exercises (
                id, session_id, exercise_id, original_exercise_id, routine_exercise_id,
                order_index, target_sets, rep_min, rep_max, rest_seconds, notes,
                sync_status, created_at, updated_at
              ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
              [
                sessionExerciseId,
                sessionId,
                exerciseId,
                routineExerciseId,
                exOrder,
                rx.targetSets,
                rx.repMin,
                rx.repMax,
                rx.restSeconds,
                rx.notes ?? '',
                startIso,
                finishIso,
              ]
            );

            const sets = buildWeeklySets(rx.exerciseKey, weekIdx);
            for (let sIdx = 0; sIdx < sets.length; sIdx += 1) {
              const setSpec = sets[sIdx];
              if (!setSpec) continue;

              const effectiveWeight = computeEffectiveWeight(setSpec.weight, weightMode);
              const volume = computeSetVolume(setSpec.weight, weightMode, setSpec.reps);
              const est1rm = computeEpley1RM(effectiveWeight, setSpec.reps);
              const rir = estimateRirFromRpe(setSpec.rpe);

              let isPrWeight = 0;
              let isPr1rm = 0;
              let isPrVolume = 0;

              if (isWorkingSet(setSpec.type)) {
                sessionTonnage += volume;
                sessionValidSets += 1;

                const prevW = bestWeightMap.get(exerciseId) ?? 0;
                const prev1rm = best1rmMap.get(exerciseId) ?? 0;
                const prevVol = bestVolumeMap.get(exerciseId) ?? 0;

                if (weekIdx > 0 && effectiveWeight > prevW) {
                  isPrWeight = 1;
                }
                if (weekIdx > 0 && est1rm > prev1rm + 0.1) {
                  isPr1rm = 1;
                }
                if (weekIdx > 0 && volume > prevVol) {
                  isPrVolume = 1;
                }

                if (effectiveWeight > prevW) bestWeightMap.set(exerciseId, effectiveWeight);
                if (est1rm > prev1rm) best1rmMap.set(exerciseId, est1rm);
                if (volume > prevVol) bestVolumeMap.set(exerciseId, volume);
              }

              const completedAt = new Date(
                startDate.getTime() + (exOrder * 8 + sIdx * 2 + 2) * 60 * 1000
              ).toISOString();

              await db.runAsync(
                `INSERT INTO workout_sets (
                  id, session_id, session_exercise_id, exercise_id, set_order, set_type,
                  weight, weight_mode, effective_weight, reps, rpe, rir, completed, completed_at,
                  estimated_1rm, volume, is_pr_weight, is_pr_1rm, is_pr_volume, is_pr_reps,
                  sync_status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 0, 'synced', ?, ?)`,
                [
                  generateId(),
                  sessionId,
                  sessionExerciseId,
                  exerciseId,
                  sIdx + 1,
                  setSpec.type,
                  setSpec.weight,
                  weightMode,
                  effectiveWeight,
                  setSpec.reps,
                  setSpec.rpe,
                  rir,
                  completedAt,
                  est1rm,
                  volume,
                  isPrWeight,
                  isPr1rm,
                  isPrVolume,
                  completedAt,
                  completedAt,
                ]
              );
            }
          }

          await db.runAsync(
            `UPDATE workout_sessions SET total_tonnage = ?, total_valid_sets = ? WHERE id = ?`,
            [Math.round(sessionTonnage * 100) / 100, sessionValidSets, sessionId]
          );
        }
      }
    }

    // 3. Insert 5 Weekly Body Measurements
    const bodyEntries = [
      { daysAgo: 28, weight: 78.4, bf: 15.2, arm: 37.2, chest: 102.0, waist: 83.0, thigh: 58.5, notes: 'Início do mesociclo de hipertrofia' },
      { daysAgo: 21, weight: 78.7, bf: 15.0, arm: 37.4, chest: 102.4, waist: 82.8, thigh: 58.8, notes: 'Boa recuperação e sono regular' },
      { daysAgo: 14, weight: 79.0, bf: 14.8, arm: 37.6, chest: 102.8, waist: 82.5, thigh: 59.0, notes: 'Aumento leve de carboidratos pré-treino' },
      { daysAgo: 7, weight: 79.3, bf: 14.6, arm: 37.8, chest: 103.1, waist: 82.3, thigh: 59.3, notes: 'Cargas subindo com consistência' },
      { daysAgo: 1, weight: 79.6, bf: 14.5, arm: 38.0, chest: 103.4, waist: 82.1, thigh: 59.6, notes: 'Ganho limpo, cintura reduzindo' },
    ];

    for (const entry of bodyEntries) {
      const dateObj = daysAgoDate(entry.daysAgo, 7, 30);
      const iso = dateObj.toISOString();
      await db.runAsync(
        `INSERT INTO body_measurements (
          id, user_id, measured_at, weight_kg, body_fat_pct, arm_cm, chest_cm, waist_cm, thigh_cm,
          notes, sync_status, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL)`,
        [
          generateId(),
          targetUserId,
          toDateKey(dateObj),
          entry.weight,
          entry.bf,
          entry.arm,
          entry.chest,
          entry.waist,
          entry.thigh,
          entry.notes,
          iso,
          iso,
        ]
      );
    }

    // 4. Insert 8 Cardio Sessions integrated with the 4-week calendar
    const cardioEntries: Array<{
      daysAgo: number;
      modality: CardioModality;
      duration: number;
      distance: number | null;
      intensity: CardioIntensity;
      calories: number;
      notes: string;
    }> = [
      { daysAgo: 26, modality: 'Caminhada Inclinada', duration: 30, distance: 2.8, intensity: 'Leve', calories: 230, notes: 'Inclinação 10%, velocidade 5.5 km/h' },
      { daysAgo: 24, modality: 'Bike', duration: 25, distance: 10.5, intensity: 'Moderada', calories: 260, notes: 'Zona 2 constante' },
      { daysAgo: 19, modality: 'Corrida', duration: 28, distance: 4.5, intensity: 'Moderada', calories: 330, notes: 'Ritmo confortável ao ar livre' },
      { daysAgo: 17, modality: 'Escada', duration: 20, distance: null, intensity: 'Alta', calories: 270, notes: 'Simulador de escada pós-Push' },
      { daysAgo: 12, modality: 'Caminhada Inclinada', duration: 35, distance: 3.2, intensity: 'Leve', calories: 275, notes: 'Recuperação ativa' },
      { daysAgo: 10, modality: 'HIIT', duration: 18, distance: null, intensity: 'Alta', calories: 250, notes: '10 tiros de 30s na bike' },
      { daysAgo: 5, modality: 'Bike', duration: 30, distance: 12.8, intensity: 'Moderada', calories: 310, notes: 'Cardio Zona 2 estável' },
      { daysAgo: 3, modality: 'Caminhada Inclinada', duration: 30, distance: 2.9, intensity: 'Leve', calories: 240, notes: 'Inclinação 12%, pós-Inferior' },
    ];

    for (const c of cardioEntries) {
      const iso = daysAgoDate(c.daysAgo, 19, 30).toISOString();
      await db.runAsync(
        `INSERT INTO cardio_sessions (
          id, user_id, performed_at, modality, duration_minutes, distance_km, intensity,
          calories_est, notes, sync_status, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL)`,
        [
          generateId(),
          targetUserId,
          iso,
          c.modality,
          c.duration,
          c.distance,
          c.intensity,
          c.calories,
          c.notes,
          iso,
          iso,
        ]
      );
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('seeded_at', ?)`,
      [createdTs]
    );
    await db.runAsync(
      `INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('default_routine_v3', ?)`,
      [createdTs]
    );
  });
}
