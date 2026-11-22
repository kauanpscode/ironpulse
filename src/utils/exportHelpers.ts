import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { BackupPayload, CsvWorkoutRow } from '../types';

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeWorkoutRowsToCsv(rows: CsvWorkoutRow[]): string {
  const headers = [
    'Data',
    'Treino',
    'Exercicio',
    'GrupoMuscular',
    'Equipamento',
    'Serie',
    'TipoSerie',
    'CargaKg',
    'ModoCarga',
    'CargaEfetivaKg',
    'Reps',
    'RPE',
    'RIR',
    '1RMEstimadoKg',
    'VolumeKg',
  ];

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      [
        escapeCsvCell(row.date),
        escapeCsvCell(row.sessionTitle),
        escapeCsvCell(row.exerciseName),
        escapeCsvCell(row.muscleGroup),
        escapeCsvCell(row.equipment),
        escapeCsvCell(row.setOrder),
        escapeCsvCell(row.setType),
        escapeCsvCell(row.weightKg),
        escapeCsvCell(row.weightMode),
        escapeCsvCell(row.effectiveWeightKg),
        escapeCsvCell(row.reps),
        escapeCsvCell(row.rpe),
        escapeCsvCell(row.rir),
        escapeCsvCell(row.estimated1rmKg),
        escapeCsvCell(row.volumeKg),
      ].join(',')
    );
  }
  return lines.join('\n');
}

export function validateBackupPayload(raw: unknown): BackupPayload | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (obj.app !== 'IronPulse' || typeof obj.schemaVersion !== 'number') {
    return null;
  }
  if (typeof obj.data !== 'object' || obj.data === null) {
    return null;
  }
  const data = obj.data as Record<string, unknown>;
  const requiredArrays = [
    'exercises',
    'routines',
    'routineDays',
    'routineExercises',
    'workoutSessions',
    'workoutSessionExercises',
    'workoutSets',
    'bodyMeasurements',
    'cardioSessions',
  ];
  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) {
      return null;
    }
  }
  return raw as BackupPayload;
}

export interface ExportResult {
  fileUri: string | null;
  shared: boolean;
  message: string;
}

interface WebDomAnchor {
  href: string;
  download: string;
  click(): void;
}

interface WebDownloadGlobals {
  Blob?: new (parts: string[], options?: { type?: string }) => unknown;
  URL?: {
    createObjectURL(blob: unknown): string;
    revokeObjectURL(url: string): void;
  };
  document?: {
    createElement(tag: string): WebDomAnchor;
    body?: {
      appendChild(node: unknown): void;
      removeChild(node: unknown): void;
    };
  };
}

export async function saveAndShareFile(
  filename: string,
  content: string,
  mimeType: string
): Promise<ExportResult> {
  if (Platform.OS === 'web') {
    const scope = globalThis as unknown as WebDownloadGlobals;
    if (scope.Blob && scope.URL && scope.document?.body) {
      const blob = new scope.Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = scope.URL.createObjectURL(blob);
      const anchor = scope.document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      scope.document.body.appendChild(anchor);
      anchor.click();
      scope.document.body.removeChild(anchor);
      scope.URL.revokeObjectURL(url);
      return {
        fileUri: null,
        shared: true,
        message: `Download de ${filename} iniciado no navegador.`,
      };
    }
    return {
      fileUri: null,
      shared: false,
      message: `Conteúdo ${filename} gerado (${content.length} caracteres).`,
    };
  }

  const targetFile = new File(Paths.document, filename);
  targetFile.create({ overwrite: true });
  await targetFile.write(content);
  const fileUri = targetFile.uri;

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: `Exportar ${filename}`,
    });
    return {
      fileUri,
      shared: true,
      message: `Arquivo ${filename} exportado com sucesso.`,
    };
  }

  return {
    fileUri,
    shared: false,
    message: `Arquivo salvo em: ${fileUri}`,
  };
}
