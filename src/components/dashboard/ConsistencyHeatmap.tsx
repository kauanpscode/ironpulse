import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme';
import type { HeatmapDay, StreakSummary } from '../../types';
import { formatShortDate, formatTonnage, hapticLight } from '../../utils';
import { Card } from '../common';

interface ConsistencyHeatmapProps {
  days: HeatmapDay[];
  streak: StreakSummary;
}

const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: colors.heatmap0,
  1: colors.heatmap1,
  2: colors.heatmap2,
  3: colors.heatmap3,
  4: colors.heatmap4,
};

export function ConsistencyHeatmap({
  days,
  streak,
}: ConsistencyHeatmapProps): React.JSX.Element {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  const columns = useMemo(() => {
    const cols: HeatmapDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      cols.push(days.slice(i, i + 7));
    }
    return cols;
  }, [days]);

  return (
    <Card>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Consistência (12 semanas)</Text>
          <Text style={styles.subtitle}>
            {streak.totalWorkouts30d} treinos nos últimos 30 dias
          </Text>
        </View>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={18} color={colors.primary} />
          <View style={styles.streakTextWrap}>
            <Text style={styles.streakNum}>{streak.currentStreak}</Text>
            <Text style={styles.streakLabel}>sequência</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsStrip}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{streak.activeDaysThisWeek}</Text>
          <Text style={styles.statLabel}>Nesta semana</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{streak.bestStreak}</Text>
          <Text style={styles.statLabel}>Recorde seq.</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{streak.totalWorkoutsAllTime}</Text>
          <Text style={styles.statLabel}>Total treinos</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gridScroll}
      >
        {columns.map((week, colIdx) => (
          <View key={`wk-${colIdx}`} style={styles.column}>
            {week.map((cell) => {
              const isSelected = selectedDay?.date === cell.date;
              return (
                <Pressable
                  key={cell.date}
                  onPress={() => {
                    void hapticLight();
                    setSelectedDay(isSelected ? null : cell);
                  }}
                  style={[
                    styles.cell,
                    { backgroundColor: LEVEL_COLORS[cell.intensityLevel] },
                    isSelected && styles.cellSelected,
                  ]}
                >
                  {cell.cardioCount > 0 ? <View style={styles.cardioDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {selectedDay ? (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipDate}>{formatShortDate(selectedDay.date)}</Text>
          <Text style={styles.tooltipDetail}>
            {selectedDay.workoutCount > 0
              ? `${selectedDay.workoutCount} treino • ${formatTonnage(selectedDay.totalTonnage)}`
              : 'Sem musculação'}
            {selectedDay.cardioCount > 0 ? ` • ${selectedDay.cardioCount} cardio` : ''}
          </Text>
        </View>
      ) : (
        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>Menos</Text>
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <View
              key={lvl}
              style={[styles.legendCell, { backgroundColor: LEVEL_COLORS[lvl] }]}
            />
          ))}
          <Text style={styles.legendLabel}>Mais</Text>
          <View style={styles.legendCardioWrap}>
            <View style={styles.cardioDotLegend} />
            <Text style={styles.legendLabel}>Cardio</Text>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.subtitle,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  streakTextWrap: {
    marginLeft: spacing.xs,
    alignItems: 'flex-start',
  },
  streakNum: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 18,
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  gridScroll: {
    paddingVertical: spacing.xs,
    gap: 5,
  },
  column: {
    gap: 5,
  },
  cell: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 2,
  },
  cellSelected: {
    borderWidth: 1.5,
    borderColor: colors.textPrimary,
  },
  cardioDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.cardioDot,
  },
  tooltip: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tooltipDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  tooltipDetail: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 5,
  },
  legendCell: {
    width: 11,
    height: 11,
    borderRadius: 2.5,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  legendCardioWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 5,
  },
  cardioDotLegend: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.cardioDot,
  },
});
