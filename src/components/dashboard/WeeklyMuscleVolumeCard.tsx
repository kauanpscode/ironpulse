import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import type { WeeklyMuscleVolume } from '../../types';
import { AnimatedProgressBar, Badge, Card } from '../common';

interface WeeklyMuscleVolumeCardProps {
  volumes: WeeklyMuscleVolume[];
}

export function WeeklyMuscleVolumeCard({
  volumes,
}: WeeklyMuscleVolumeCardProps): React.JSX.Element {
  const totalSets = volumes.reduce((acc, item) => acc + item.validSets, 0);
  const optimalCount = volumes.filter((v) => v.status === 'optimal').length;

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Volume Semanal por Músculo</Text>
          <Text style={styles.subtitle}>
            Séries válidas (7 dias) • Faixa ideal: 10–20 séries
          </Text>
        </View>
        <Badge
          label={`${totalSets} séries`}
          tone={optimalCount >= 4 ? 'success' : 'primary'}
        />
      </View>

      <View style={styles.list}>
        {volumes.map((item) => {
          const maxScale = 24;
          const fillPct = Math.min(100, (item.validSets / maxScale) * 100);
          const minMarkerPct = (item.targetMin / maxScale) * 100;
          const maxMarkerPct = (item.targetMax / maxScale) * 100;

          const barColor =
            item.status === 'optimal'
              ? colors.secondary
              : item.status === 'high'
              ? colors.danger
              : item.validSets > 0
              ? colors.primary
              : colors.border;

          const statusLabel =
            item.status === 'optimal'
              ? 'Ideal'
              : item.status === 'high'
              ? 'Alto'
              : 'Baixo';

          return (
            <View key={item.muscleGroup} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.muscleName}>{item.muscleGroup}</Text>
                <View style={styles.rowMetrics}>
                  <Text style={[styles.setsValue, { color: barColor }]}>
                    {item.validSets}
                  </Text>
                  <Text style={styles.setsUnit}> séries • {statusLabel}</Text>
                </View>
              </View>

              <AnimatedProgressBar
                progress={fillPct / 100}
                color={barColor}
                height={9}
                idealStartPct={minMarkerPct}
                idealWidthPct={maxMarkerPct - minMarkerPct}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.footerLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>{'< 10 Abaixo'}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
          <Text style={styles.legendText}>10–20 Ideal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          <Text style={styles.legendText}>{'> 20 Alto'}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    ...typography.subtitle,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowMetrics: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  setsValue: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  setsUnit: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  footerLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
