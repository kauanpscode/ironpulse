import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme';
import type { ActiveSessionExercise, SetType, WeightMode } from '../../types';
import { isWorkingSet } from '../../utils';
import { Badge, Card } from '../common';
import { SetRowItem } from './SetRowItem';

interface ExerciseSessionCardProps {
  item: ActiveSessionExercise;
  effortMode: 'RPE' | 'RIR';
  onUpdateSet: (
    setId: string,
    patch: {
      setType?: SetType;
      weight?: number;
      weightMode?: WeightMode;
      reps?: number;
      rpe?: number | null;
      completed?: boolean;
    },
    triggerRestSeconds?: number,
    exerciseName?: string
  ) => void;
  onAddSet: (setType?: SetType) => void;
  onDeleteSet: (setId: string) => void;
  onToggleExerciseWeightMode: (nextMode: WeightMode) => void;
  onSubstitute: () => void;
  onRemoveExercise: () => void;
}

export function ExerciseSessionCard({
  item,
  effortMode,
  onUpdateSet,
  onAddSet,
  onDeleteSet,
  onToggleExerciseWeightMode,
  onSubstitute,
  onRemoveExercise,
}: ExerciseSessionCardProps): React.JSX.Element {
  const currentWeightMode: WeightMode =
    item.sets[0]?.weightMode ?? item.exercise.defaultWeightMode;
  const completedCount = item.sets.filter((s) => s.completed && isWorkingSet(s.setType)).length;
  const exerciseVolume = item.sets
    .filter((s) => s.completed && isWorkingSet(s.setType))
    .reduce((sum, s) => sum + s.volume, 0);

  const workingGhosts = item.ghostSets.filter((g) => g.setType !== 'W');

  return (
    <Card style={styles.card}>
      <View style={styles.headerTop}>
        <View style={styles.titleCol}>
          <Text style={styles.title}>{item.exercise.name}</Text>
          <Text style={styles.subtitle}>
            {item.exercise.muscleGroup} • {item.exercise.equipment} • Meta:{' '}
            {item.targetSets}×{item.repMin}–{item.repMax} ({item.restSeconds}s)
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={onSubstitute}
            style={styles.iconAction}
            hitSlop={6}
          >
            <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={onRemoveExercise}
            style={styles.iconAction}
            hitSlop={6}
          >
            <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {item.originalExerciseName ? (
        <View style={styles.subBanner}>
          <Ionicons name="swap-horizontal" size={13} color={colors.info} />
          <Text style={styles.subBannerText}>
            Substituindo nesta sessão: {item.originalExerciseName} (ficha preservada)
          </Text>
        </View>
      ) : null}

      <View style={styles.toolbar}>
        <Pressable
          onPress={() =>
            onToggleExerciseWeightMode(
              currentWeightMode === 'total' ? 'per_side' : 'total'
            )
          }
          style={[
            styles.modePill,
            currentWeightMode === 'per_side' && styles.modePillActive,
          ]}
        >
          <Ionicons
            name="barbell-outline"
            size={13}
            color={currentWeightMode === 'per_side' ? colors.info : colors.textSecondary}
          />
          <Text
            style={[
              styles.modePillText,
              currentWeightMode === 'per_side' && styles.modePillTextActive,
            ]}
          >
            {currentWeightMode === 'per_side'
              ? 'Unilateral / Por Lado (×2)'
              : 'Carga Total'}
          </Text>
        </Pressable>

        <View style={styles.liveStats}>
          <Badge
            label={`${completedCount}/${item.targetSets} válidas`}
            tone={completedCount >= item.targetSets ? 'success' : 'neutral'}
          />
          {exerciseVolume > 0 ? (
            <Text style={styles.volText}>{Math.round(exerciseVolume)} kg</Text>
          ) : null}
        </View>
      </View>

      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

      <View style={styles.setsList}>
        {item.sets.map((s, idx) => {
          const ghost =
            s.setType === 'W'
              ? item.ghostSets.find((g) => g.setType === 'W') ?? null
              : workingGhosts[
                  item.sets
                    .slice(0, idx)
                    .filter((prev) => prev.setType !== 'W').length
                ] ??
                workingGhosts[workingGhosts.length - 1] ??
                null;

          return (
            <SetRowItem
              key={s.id}
              setItem={s}
              ghost={ghost}
              effortMode={effortMode}
              onUpdate={(patch) =>
                onUpdateSet(
                  s.id,
                  patch,
                  patch.completed === true ? item.restSeconds : undefined,
                  item.exercise.name
                )
              }
              onDelete={() => onDeleteSet(s.id)}
            />
          );
        })}
      </View>

      <View style={styles.footerRow}>
        <Pressable onPress={() => onAddSet('N')} style={styles.addBtn}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={styles.addBtnText}>Adicionar Série</Text>
        </Pressable>
        <Pressable onPress={() => onAddSet('W')} style={styles.addWarmupBtn}>
          <Text style={styles.addWarmupText}>+ Aquec. (W)</Text>
        </Pressable>
        <Pressable onPress={() => onAddSet('D')} style={styles.addDropBtn}>
          <Text style={styles.addDropText}>+ Drop (D)</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.infoMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  subBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.info,
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modePillActive: {
    backgroundColor: colors.infoMuted,
    borderColor: 'rgba(56, 189, 248, 0.45)',
  },
  modePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modePillTextActive: {
    color: colors.info,
  },
  liveStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  volText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  notes: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  setsList: {
    gap: spacing.sm,
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  addBtn: {
    flex: 1,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  addWarmupBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.infoMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addWarmupText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.info,
  },
  addDropBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.purpleMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDropText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.purple,
  },
});
