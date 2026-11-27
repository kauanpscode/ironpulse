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
    key: 'incline_articulated_press',
    name: 'Supino Inclinado Articulado',
    muscleGroup: 'Peito',
    secondaryMuscles: ['Ombros', 'Tríceps'],
    equipment: 'Máquina',
    defaultWeightMode: 'per_side',
    notes: 'Peso por lado. 1 série leve de aquecimento (8 reps) antes das séries válidas.',
  },
  {
    key: 'flat_db_press',
    name: 'Supino Reto com Halteres',
    muscleGroup: 'Peito',
    secondaryMuscles: ['Tríceps', 'Ombros'],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: 'Amplitude completa mantendo escápulas retraídas.',
  },
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
    notes: 'Alongamento máximo sem perder tensão nos ombros. 1s de contração no fechamento.',
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
    name: 'Puxada Frente (Aberta ou Neutra)',
    muscleGroup: 'Costas',
    secondaryMuscles: ['Bíceps'],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Deprimir escápulas antes de flexionar os cotovelos.',
  },
  {
    key: 'articulated_row',
    name: 'Remada Articulada Apoiada',
    muscleGroup: 'Costas',
    secondaryMuscles: ['Bíceps', 'Ombros'],
    equipment: 'Máquina',
    defaultWeightMode: 'per_side',
    notes: 'Peito apoiado poupa a lombar para o Stiff de sexta. Retração escapular completa.',
  },
  {
    key: 'barbell_row',
    name: 'Remada Curvada Pronada',
    muscleGroup: 'Costas',
    secondaryMuscles: ['Bíceps', 'Ombros'],
    equipment: 'Barra',
    defaultWeightMode: 'total',
    notes: 'Tronco estável a ~45°, puxar em direção ao umbigo.',
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
    key: 'db_one_arm_row',
    name: 'Remada Unilateral Serrote',
    muscleGroup: 'Costas',
    secondaryMuscles: ['Bíceps'],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: 'Puxar o cotovelo em arco em direção ao quadril.',
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

  // QUADRÍCEPS & ADUTORES
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
    notes: 'Reclinar o encosto (~40°) para maior estímulo do reto femoral. Segurar 1s no topo.',
  },
  {
    key: 'db_lunge',
    name: 'Afundo com Halteres',
    muscleGroup: 'Quadríceps',
    secondaryMuscles: ['Posteriores'],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: '8–10 reps cada lado. Tronco mais ereto para priorizar quadríceps.',
  },
  {
    key: 'hip_adduction',
    name: 'Cadeira Adutora',
    muscleGroup: 'Quadríceps',
    secondaryMuscles: ['Posteriores'],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Foco em adutores longo, curto e grácil; controlar a fase excêntrica.',
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
    key: 'stiff_barbell',
    name: 'Stiff com Barra',
    muscleGroup: 'Posteriores',
    secondaryMuscles: ['Costas'],
    equipment: 'Barra',
    defaultWeightMode: 'total',
    notes: 'Quadril para trás, barra rente às pernas, coluna neutra.',
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
    key: 'lying_leg_curl',
    name: 'Mesa Flexora',
    muscleGroup: 'Posteriores',
    secondaryMuscles: ['Panturrilhas'],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Manter quadril pressionado no banco durante toda a série.',
  },
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
    notes: 'Cotovelos levemente à frente do plano escapular (~30°).',
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
    key: 'face_pull_cable',
    name: 'Face Pull na Polia',
    muscleGroup: 'Ombros',
    secondaryMuscles: ['Costas'],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Puxar na linha do rosto finalizando com rotação externa para ativar manguito e deltoide posterior.',
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
    key: 'scott_barbell_curl',
    name: 'Rosca Scott (Barra W)',
    muscleGroup: 'Bíceps',
    secondaryMuscles: [],
    equipment: 'Barra',
    defaultWeightMode: 'total',
    notes: 'Descida controlada (2–3s) sem impulso no fundo do movimento.',
  },
  {
    key: 'hammer_cable_curl',
    name: 'Rosca Martelo na Polia (Corda)',
    muscleGroup: 'Bíceps',
    secondaryMuscles: [],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Pegada neutra na corda com tensão constante; foco em braquial e braquiorradial (antebraço).',
  },
  {
    key: 'incline_db_curl',
    name: 'Rosca Inclinada com Halteres',
    muscleGroup: 'Bíceps',
    secondaryMuscles: [],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: 'Banco a ~45° para enfatizar a cabeça longa do bíceps em posição alongada.',
  },
  {
    key: 'hammer_db_curl',
    name: 'Rosca Martelo com Halteres',
    muscleGroup: 'Bíceps',
    secondaryMuscles: [],
    equipment: 'Halter',
    defaultWeightMode: 'per_side',
    notes: 'Pegada neutra com foco em braquial e braquiorradial (antebraço).',
  },
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
    key: 'barbell_curl',
    name: 'Rosca Direta com Barra',
    muscleGroup: 'Bíceps',
    secondaryMuscles: [],
    equipment: 'Barra',
    defaultWeightMode: 'total',
    notes: 'Cotovelos fixos ao lado do tronco, sem roubar com lombar.',
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
    key: 'triceps_skullcrusher_cable',
    name: 'Tríceps Testa no Cross',
    muscleGroup: 'Tríceps',
    secondaryMuscles: [],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Cotovelos estáveis; tensão constante na extensão.',
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
    notes: 'Pausa de 1–2s no alongamento inferior para eliminar efeito elástico.',
  },
  {
    key: 'standing_or_leg_calf_raise',
    name: 'Panturrilha em Pé ou no Leg',
    muscleGroup: 'Panturrilhas',
    secondaryMuscles: [],
    equipment: 'Máquina',
    defaultWeightMode: 'total',
    notes: 'Joelho estendido, enfatizando pausa de 1–2s no alongamento máximo.',
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
    key: 'cable_crunch',
    name: 'Abdominal na Polia (Crunch)',
    muscleGroup: 'Abdômen',
    secondaryMuscles: [],
    equipment: 'Polia',
    defaultWeightMode: 'total',
    notes: 'Flexionar a coluna torácica com carga progressiva (sem puxar com o quadril).',
  },
  {
    key: 'leg_raise_or_side_plank',
    name: 'Elevação de Pernas (Infra) ou Prancha Lateral',
    muscleGroup: 'Abdômen',
    secondaryMuscles: [],
    equipment: 'Peso Corporal',
    defaultWeightMode: 'total',
    notes: 'Elevar a pelve sem balançar a lombar (12–15 reps) ou segurar 45s na prancha lateral.',
  },
  {
    key: 'plank_frontal_lateral',
    name: 'Prancha Frontal + Prancha Lateral',
    muscleGroup: 'Abdômen',
    secondaryMuscles: [],
    equipment: 'Peso Corporal',
    defaultWeightMode: 'total',
    notes: 'Isometria: 2 séries frontal + 2 séries lateral. Registrar segundos no campo de reps.',
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
    key: 'upper_lower_powerbuilding_4x',
    name: 'Upper / Lower 2x — Powerbuilding',
    splitType: 'Upper/Lower',
    description:
      'Divisão 4x (Seg: Upper A | Ter: Lower A | Qua: OFF | Qui: Upper B | Sex: Lower B) com pares alternados nos superiores para manter descanso real >2 min sem ficar parado. Mesociclos de 6 a 8 semanas com dupla progressão.',
    isActive: true,
    days: [
      {
        key: 'upper_a',
        name: 'Upper A (Força Empurrar/Puxar + Braços)',
        focusMuscles: ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps'],
        estimatedMinutes: 50,
        exercises: [
          {
            exerciseKey: 'incline_articulated_press',
            targetSets: 3,
            repMin: 6,
            repMax: 8,
            restSeconds: 60,
            notes: 'Par 1A (alternar com Puxada). 1 série leve de 8 reps antes.',
          },
          {
            exerciseKey: 'lat_pulldown',
            targetSets: 3,
            repMin: 6,
            repMax: 8,
            restSeconds: 60,
            notes: 'Par 1B (alternar com Supino Inclinado).',
          },
          {
            exerciseKey: 'flat_db_press',
            targetSets: 3,
            repMin: 8,
            repMax: 10,
            restSeconds: 60,
            notes: 'Par 2A (alternar com Remada Curvada).',
          },
          {
            exerciseKey: 'barbell_row',
            targetSets: 3,
            repMin: 6,
            repMax: 8,
            restSeconds: 60,
            notes: 'Par 2B (alternar com Supino Reto).',
          },
          {
            exerciseKey: 'lateral_raise_db',
            targetSets: 3,
            repMin: 12,
            repMax: 15,
            restSeconds: 60,
          },
          {
            exerciseKey: 'triceps_overhead_cable',
            targetSets: 3,
            repMin: 10,
            repMax: 12,
            restSeconds: 60,
            notes: 'Par 4A (alternar com Rosca Scott).',
          },
          {
            exerciseKey: 'scott_barbell_curl',
            targetSets: 3,
            repMin: 8,
            repMax: 10,
            restSeconds: 60,
            notes: 'Par 4B (alternar com Tríceps Francês).',
          },
        ],
      },
      {
        key: 'lower_a',
        name: 'Lower A (Foco Quadríceps)',
        focusMuscles: ['Quadríceps', 'Posteriores', 'Panturrilhas', 'Abdômen'],
        estimatedMinutes: 50,
        exercises: [
          {
            exerciseKey: 'hack_squat',
            targetSets: 4,
            repMin: 6,
            repMax: 8,
            restSeconds: 120,
            notes: '1 série leve de 8 reps antes. Descanso de 2 min para subir carga.',
          },
          {
            exerciseKey: 'leg_press_45',
            targetSets: 3,
            repMin: 8,
            repMax: 10,
            restSeconds: 90,
          },
          {
            exerciseKey: 'seated_leg_curl',
            targetSets: 3,
            repMin: 10,
            repMax: 12,
            restSeconds: 75,
            notes: 'Descanso sugerido: 60–90 seg.',
          },
          {
            exerciseKey: 'leg_extension',
            targetSets: 3,
            repMin: 10,
            repMax: 12,
            restSeconds: 60,
            notes: 'Reclinar o encosto (~40°) para maior estímulo do reto femoral.',
          },
          {
            exerciseKey: 'hack_calf_raise',
            targetSets: 4,
            repMin: 10,
            repMax: 15,
            restSeconds: 60,
            notes: 'Pausa de 1s no alongamento embaixo.',
          },
          {
            exerciseKey: 'cable_crunch',
            targetSets: 3,
            repMin: 10,
            repMax: 15,
            restSeconds: 60,
          },
        ],
      },
      {
        key: 'upper_b',
        name: 'Upper B (Costas, Ombros & Hipertrofia)',
        focusMuscles: ['Costas', 'Peito', 'Ombros', 'Bíceps', 'Tríceps'],
        estimatedMinutes: 50,
        exercises: [
          {
            exerciseKey: 'articulated_row',
            targetSets: 3,
            repMin: 6,
            repMax: 8,
            restSeconds: 60,
            notes: 'Par 1A (alternar com Desenvolvimento). 1 série leve de 8 reps antes.',
          },
          {
            exerciseKey: 'db_shoulder_press',
            targetSets: 3,
            repMin: 6,
            repMax: 8,
            restSeconds: 60,
            notes: 'Par 1B (alternar com Remada Articulada).',
          },
          {
            exerciseKey: 'pec_deck',
            targetSets: 3,
            repMin: 10,
            repMax: 12,
            restSeconds: 60,
            notes: 'Par 2A (alternar com Serrote).',
          },
          {
            exerciseKey: 'db_one_arm_row',
            targetSets: 3,
            repMin: 8,
            repMax: 10,
            restSeconds: 60,
            notes: 'Par 2B (alternar com Peck Deck).',
          },
          {
            exerciseKey: 'face_pull_cable',
            targetSets: 3,
            repMin: 12,
            repMax: 15,
            restSeconds: 60,
            notes: 'Par 3A (alternar com Elevação Lateral). Finalizar com rotação externa.',
          },
          {
            exerciseKey: 'lateral_raise_db',
            targetSets: 3,
            repMin: 12,
            repMax: 15,
            restSeconds: 60,
            notes: 'Par 3B (alternar com Face Pull).',
          },
          {
            exerciseKey: 'triceps_skullcrusher_cable',
            targetSets: 3,
            repMin: 10,
            repMax: 12,
            restSeconds: 60,
            notes: 'Par 4A (alternar com Rosca Martelo na Polia).',
          },
          {
            exerciseKey: 'hammer_cable_curl',
            targetSets: 3,
            repMin: 10,
            repMax: 12,
            restSeconds: 60,
            notes: 'Par 4B (alternar com Tríceps Testa no Cross).',
          },
        ],
      },
      {
        key: 'lower_b',
        name: 'Lower B (Foco Posteriores)',
        focusMuscles: ['Posteriores', 'Quadríceps', 'Panturrilhas', 'Abdômen'],
        estimatedMinutes: 50,
        exercises: [
          {
            exerciseKey: 'stiff_barbell',
            targetSets: 4,
            repMin: 6,
            repMax: 8,
            restSeconds: 120,
            notes: '1 série leve de 8 reps antes. Descanso de 2 min para subir carga.',
          },
          {
            exerciseKey: 'db_lunge',
            targetSets: 3,
            repMin: 8,
            repMax: 10,
            restSeconds: 90,
            notes: '8–10 reps cada lado (foco em quadríceps).',
          },
          {
            exerciseKey: 'lying_leg_curl',
            targetSets: 3,
            repMin: 10,
            repMax: 12,
            restSeconds: 75,
            notes: 'Descanso sugerido: 60–90 seg.',
          },
          {
            exerciseKey: 'hip_adduction',
            targetSets: 3,
            repMin: 10,
            repMax: 12,
            restSeconds: 60,
          },
          {
            exerciseKey: 'standing_or_leg_calf_raise',
            targetSets: 3,
            repMin: 10,
            repMax: 15,
            restSeconds: 60,
            notes: 'Joelho estendido; pausa no alongamento.',
          },
          {
            exerciseKey: 'leg_raise_or_side_plank',
            targetSets: 3,
            repMin: 12,
            repMax: 15,
            restSeconds: 60,
            notes: '12–15 reps (Infra) ou 45s na Prancha Lateral.',
          },
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
 * Generates realistic 4-week set progressions for the Upper/Lower 2x routine:
 * - incline_articulated_press: hits ceiling (3x8 at 17.5kg/lado) in Week 4 -> Progression Signal!
 * - scott_barbell_curl: intentional 4-week plateau (20kg x 9,8,8) -> Plateau Alert!
 * - hack_squat, stiff_barbell, lat_pulldown, barbell_row: steady progressive overload.
 */
function buildWeeklySets(exerciseKey: string, weekIdx: number): SeedSetSpec[] {
  switch (exerciseKey) {
    // UPPER A
    case 'incline_articulated_press': {
      const weights = [15, 15, 17.5, 17.5];
      const repsByWeek: readonly [number, number, number][] = [
        [7, 6, 6],
        [8, 8, 8],
        [7, 6, 6],
        [8, 8, 8], // Hits ceiling of 6-8 on all 3 working sets -> Progression Signal!
      ];
      const w = weights[weekIdx] ?? 17.5;
      const r = repsByWeek[weekIdx] ?? [8, 8, 8];
      return [
        { type: 'W', weight: 10, reps: 8, rpe: 5 },
        { type: 'N', weight: w, reps: r[0], rpe: 8 },
        { type: 'N', weight: w, reps: r[1], rpe: 8.5 },
        { type: 'N', weight: w, reps: r[2], rpe: 9 },
      ];
    }

    case 'lat_pulldown': {
      const w = 50 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 8, rpe: 8 },
        { type: 'N', weight: w, reps: 7, rpe: 8.5 },
        { type: 'N', weight: w, reps: 7, rpe: 9 },
      ];
    }

    case 'flat_db_press': {
      const weights = [16, 16, 18, 18];
      const reps = [9, 10, 8, 9];
      const w = weights[weekIdx] ?? 18;
      const r = reps[weekIdx] ?? 9;
      return [
        { type: 'N', weight: w, reps: r, rpe: 8 },
        { type: 'N', weight: w, reps: r, rpe: 8.5 },
        { type: 'N', weight: w, reps: Math.max(8, r - 1), rpe: 9 },
      ];
    }

    case 'barbell_row': {
      const w = 45 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 8, rpe: 8 },
        { type: 'N', weight: w, reps: 7, rpe: 8.5 },
        { type: 'N', weight: w, reps: 7, rpe: 9 },
      ];
    }

    case 'lateral_raise_db': {
      const weights = [8, 8, 10, 10];
      const reps = [14, 15, 12, 13];
      const w = weights[weekIdx] ?? 10;
      const r = reps[weekIdx] ?? 13;
      return [
        { type: 'N', weight: w, reps: r, rpe: 8.5 },
        { type: 'N', weight: w, reps: r, rpe: 9 },
        { type: 'F', weight: w, reps: Math.max(12, r - 1), rpe: 9.5 },
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

    case 'scott_barbell_curl': {
      // Intentional 4-week PLATEAU: exact same 20kg x (9, 8, 8) every week!
      return [
        { type: 'N', weight: 20, reps: 9, rpe: 8.5 },
        { type: 'N', weight: 20, reps: 8, rpe: 9 },
        { type: 'F', weight: 20, reps: 8, rpe: 9.5 },
      ];
    }

    // LOWER A
    case 'hack_squat': {
      const weights = [70, 75, 80, 85];
      const w = weights[weekIdx] ?? 80;
      return [
        { type: 'W', weight: 40, reps: 8, rpe: 5 },
        { type: 'N', weight: w, reps: 8, rpe: 8 },
        { type: 'N', weight: w, reps: 7, rpe: 8.5 },
        { type: 'N', weight: w, reps: 7, rpe: 8.5 },
        { type: 'N', weight: w, reps: 6 + (weekIdx === 3 ? 1 : 0), rpe: 9 },
      ];
    }

    case 'leg_press_45': {
      const w = 140 + weekIdx * 10;
      return [
        { type: 'N', weight: w, reps: 10, rpe: 8 },
        { type: 'N', weight: w, reps: 9, rpe: 8.5 },
        { type: 'N', weight: w, reps: 8, rpe: 9 },
      ];
    }

    case 'seated_leg_curl': {
      const w = 45 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8 },
        { type: 'N', weight: w, reps: 11, rpe: 8.5 },
        { type: 'N', weight: w, reps: 10, rpe: 9 },
      ];
    }

    case 'leg_extension': {
      const w = 50 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8.5 },
        { type: 'N', weight: w, reps: 11, rpe: 9 },
        { type: 'F', weight: w, reps: 10, rpe: 9.5 },
      ];
    }

    case 'hack_calf_raise': {
      const w = 65 + weekIdx * 5;
      return [
        { type: 'N', weight: w, reps: 14, rpe: 8 },
        { type: 'N', weight: w, reps: 13, rpe: 8.5 },
        { type: 'N', weight: w, reps: 12, rpe: 9 },
        { type: 'N', weight: w, reps: 12, rpe: 9 },
      ];
    }

    case 'cable_crunch': {
      const w = 30 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 15, rpe: 8 },
        { type: 'N', weight: w, reps: 14, rpe: 8.5 },
        { type: 'N', weight: w, reps: 13, rpe: 9 },
      ];
    }

    // UPPER B
    case 'articulated_row': {
      const w = 22.5 + weekIdx * 2.5;
      return [
        { type: 'W', weight: 12.5, reps: 8, rpe: 5 },
        { type: 'N', weight: w, reps: 8, rpe: 8 },
        { type: 'N', weight: w, reps: 7, rpe: 8.5 },
        { type: 'N', weight: w, reps: 7, rpe: 9 },
      ];
    }

    case 'db_shoulder_press': {
      const weights = [14, 14, 16, 16];
      const reps = [7, 8, 6, 7];
      const w = weights[weekIdx] ?? 16;
      const r = reps[weekIdx] ?? 7;
      return [
        { type: 'N', weight: w, reps: r, rpe: 8 },
        { type: 'N', weight: w, reps: r, rpe: 8.5 },
        { type: 'N', weight: w, reps: Math.max(6, r - 1), rpe: 9 },
      ];
    }

    case 'pec_deck': {
      const w = 45 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8 },
        { type: 'N', weight: w, reps: 11, rpe: 8.5 },
        { type: 'F', weight: w, reps: 10, rpe: 9.5 },
      ];
    }

    case 'db_one_arm_row': {
      const weights = [18, 18, 20, 20];
      const w = weights[weekIdx] ?? 20;
      return [
        { type: 'N', weight: w, reps: 10, rpe: 8 },
        { type: 'N', weight: w, reps: 9, rpe: 8.5 },
        { type: 'N', weight: w, reps: 8, rpe: 9 },
      ];
    }

    case 'face_pull_cable': {
      const w = 20 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 15, rpe: 8 },
        { type: 'N', weight: w, reps: 14, rpe: 8.5 },
        { type: 'N', weight: w, reps: 13, rpe: 9 },
      ];
    }

    case 'triceps_skullcrusher_cable': {
      const w = 25 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8.5 },
        { type: 'N', weight: w, reps: 11, rpe: 9 },
        { type: 'F', weight: w, reps: 10, rpe: 9.5 },
      ];
    }

    case 'hammer_cable_curl': {
      const w = 22.5 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8 },
        { type: 'N', weight: w, reps: 11, rpe: 8.5 },
        { type: 'N', weight: w, reps: 10, rpe: 9 },
      ];
    }

    // LOWER B
    case 'stiff_barbell': {
      const w = 60 + weekIdx * 5;
      return [
        { type: 'W', weight: 30, reps: 8, rpe: 5 },
        { type: 'N', weight: w, reps: 8, rpe: 8 },
        { type: 'N', weight: w, reps: 7, rpe: 8.5 },
        { type: 'N', weight: w, reps: 7, rpe: 8.5 },
        { type: 'N', weight: w, reps: 6, rpe: 9 },
      ];
    }

    case 'db_lunge': {
      const weights = [12, 12, 14, 14];
      const w = weights[weekIdx] ?? 14;
      return [
        { type: 'N', weight: w, reps: 10, rpe: 8 },
        { type: 'N', weight: w, reps: 9, rpe: 8.5 },
        { type: 'N', weight: w, reps: 8, rpe: 9 },
      ];
    }

    case 'lying_leg_curl': {
      const w = 40 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8 },
        { type: 'N', weight: w, reps: 11, rpe: 8.5 },
        { type: 'N', weight: w, reps: 10, rpe: 9 },
      ];
    }

    case 'hip_adduction': {
      const w = 40 + weekIdx * 2.5;
      return [
        { type: 'N', weight: w, reps: 12, rpe: 8 },
        { type: 'N', weight: w, reps: 11, rpe: 8.5 },
        { type: 'N', weight: w, reps: 10, rpe: 9 },
      ];
    }

    case 'standing_or_leg_calf_raise': {
      const w = 60 + weekIdx * 5;
      return [
        { type: 'N', weight: w, reps: 14, rpe: 8 },
        { type: 'N', weight: w, reps: 13, rpe: 8.5 },
        { type: 'N', weight: w, reps: 12, rpe: 9 },
      ];
    }

    case 'leg_raise_or_side_plank': {
      const reps = 12 + weekIdx;
      return [
        { type: 'N', weight: 0, reps: Math.min(15, reps), rpe: 8 },
        { type: 'N', weight: 0, reps: Math.min(15, reps), rpe: 8.5 },
        { type: 'N', weight: 0, reps: Math.min(15, reps - 1), rpe: 9 },
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
    // 1. Insert ONLY the default routine (Upper A / Lower A / Upper B / Lower B)
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
      [6, 4, 2, 1],     // Week 4 (last was Lower B yesterday -> Next Workout = Upper A!)
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
          const durationSec = (46 + ((weekIdx * 3 + dayIdx * 4) % 10)) * 60;
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
              weekIdx === 3 && dayIdx === 0
                ? 'Supino inclinado articulado bateu 3x8 — pronto para subir carga!'
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
                startDate.getTime() + (exOrder * 7 + sIdx * 2 + 2) * 60 * 1000
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
      { daysAgo: 28, weight: 69.2, bf: 14.5, arm: 34.5, chest: 96.0, waist: 78.5, thigh: 54.0, notes: 'Início do bloco Upper/Lower Powerbuilding' },
      { daysAgo: 21, weight: 69.5, bf: 14.5, arm: 34.7, chest: 96.4, waist: 78.5, thigh: 54.2, notes: 'Adaptação aos pares alternados' },
      { daysAgo: 14, weight: 69.8, bf: 14.4, arm: 34.9, chest: 96.8, waist: 78.6, thigh: 54.5, notes: 'Cargas subindo no Hack e Stiff' },
      { daysAgo: 7, weight: 70.1, bf: 14.4, arm: 35.1, chest: 97.1, waist: 78.6, thigh: 54.8, notes: 'Boa recuperação entre sessões' },
      { daysAgo: 1, weight: 70.4, bf: 14.3, arm: 35.3, chest: 97.5, waist: 78.7, thigh: 55.0, notes: 'Ganho limpo e progressão constante' },
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
      { daysAgo: 26, modality: 'Caminhada Inclinada', duration: 25, distance: 2.3, intensity: 'Leve', calories: 195, notes: 'Inclinação 10%, pós-Upper' },
      { daysAgo: 24, modality: 'Bike', duration: 20, distance: 8.5, intensity: 'Moderada', calories: 210, notes: 'Zona 2 constante' },
      { daysAgo: 19, modality: 'Corrida', duration: 25, distance: 4.0, intensity: 'Moderada', calories: 290, notes: 'Ritmo confortável' },
      { daysAgo: 17, modality: 'Escada', duration: 15, distance: null, intensity: 'Alta', calories: 210, notes: 'Simulador pós-Upper' },
      { daysAgo: 12, modality: 'Caminhada Inclinada', duration: 30, distance: 2.8, intensity: 'Leve', calories: 230, notes: 'Recuperação ativa no dia OFF' },
      { daysAgo: 10, modality: 'HIIT', duration: 15, distance: null, intensity: 'Alta', calories: 220, notes: '8 tiros de 30s na bike' },
      { daysAgo: 5, modality: 'Bike', duration: 25, distance: 10.2, intensity: 'Moderada', calories: 260, notes: 'Cardio Zona 2 estável' },
      { daysAgo: 3, modality: 'Caminhada Inclinada', duration: 25, distance: 2.4, intensity: 'Leve', calories: 200, notes: 'Inclinação 12%' },
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
      `INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('default_routine_v5', ?)`,
      [createdTs]
    );
  });
}