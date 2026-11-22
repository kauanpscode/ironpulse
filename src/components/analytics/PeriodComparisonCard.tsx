import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme';
import type { PeriodComparisonReport, ReportPeriod } from '../../types';
import { formatTonnage, hapticLight } from '../../utils';
import { Badge, Card } from '../common';

interface PeriodComparisonCardProps {
  report: PeriodComparisonReport;
  period: ReportPeriod;
  onChangePeriod: (period: ReportPeriod) => void;
}

export function PeriodComparisonCard({
  report,
  period,
  onChangePeriod,
}: PeriodComparisonCardProps): React.JSX.Element {
  const deltaTone =
    report.tonnageDeltaPct === null
      ? 'neutral'
      : report.tonnageDeltaPct >= 0
      ? 'success'
      : 'danger';

  const deltaLabel =
    report.tonnageDeltaPct === null
      ? 'Sem base anterior'
      : `${report.tonnageDeltaPct >= 0 ? '+' : ''}${report.tonnageDeltaPct}% vs. anterior`;

  return (
    <Card>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Relatório Comparativo</Text>
          <Text style={styles.subtitle}>{report.periodLabel}</Text>
        </View>
        <View style={styles.toggle}>
          {(['weekly', 'monthly'] as const).map((p) => {
            const active = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => {
                  void hapticLight();
                  onChangePeriod(p);
                }}
                style={[styles.toggleBtn, active && styles.toggleBtnActive]}
              >
                <Text
                  style={[styles.toggleText, active && styles.toggleTextActive]}
                >
                  {p === 'weekly' ? '7D' : '30D'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.tonnageBox}>
        <View>
          <Text style={styles.tonnageLabel}>Tonelagem Total</Text>
          <Text style={styles.tonnageValue}>
            {formatTonnage(report.currentTonnage)}
          </Text>
          <Text style={styles.tonnagePrev}>
            Período anterior: {formatTonnage(report.previousTonnage)}
          </Text>
        </View>
        <Badge label={deltaLabel} tone={deltaTone} />
      </View>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiTile}>
          <Ionicons name="barbell-outline" size={16} color={colors.primary} />
          <Text style={styles.kpiVal}>{report.currentWorkouts}</Text>
          <Text style={styles.kpiLbl}>
            Treinos (ant. {report.previousWorkouts})
          </Text>
        </View>
        <View style={styles.kpiTile}>
          <Ionicons name="layers-outline" size={16} color={colors.secondary} />
          <Text style={styles.kpiVal}>{report.currentValidSets}</Text>
          <Text style={styles.kpiLbl}>
            Séries (ant. {report.previousValidSets})
          </Text>
        </View>
        <View style={styles.kpiTile}>
          <Ionicons name="heart-outline" size={16} color={colors.info} />
          <Text style={styles.kpiVal}>{report.currentCardioMinutes}m</Text>
          <Text style={styles.kpiLbl}>
            Cardio (ant. {report.previousCardioMinutes}m)
          </Text>
        </View>
      </View>

      <View style={styles.rankColumns}>
        <View style={styles.rankCol}>
          <Text style={styles.rankHeader}>MAIS TREINADOS</Text>
          {report.mostTrainedMuscles.map((m) => (
            <View key={m.muscleGroup} style={styles.rankRow}>
              <Text style={styles.rankName} numberOfLines={1}>
                {m.muscleGroup}
              </Text>
              <Text style={styles.rankSetsTop}>{m.validSets}s</Text>
            </View>
          ))}
        </View>

        <View style={styles.rankDivider} />

        <View style={styles.rankCol}>
          <Text style={styles.rankHeader}>MENOS TREINADOS</Text>
          {report.leastTrainedMuscles.map((m) => (
            <View key={m.muscleGroup} style={styles.rankRow}>
              <Text style={styles.rankName} numberOfLines={1}>
                {m.muscleGroup}
              </Text>
              <Text style={styles.rankSetsLow}>{m.validSets}s</Text>
            </View>
          ))}
        </View>
      </View>
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
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.xs,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.textInverse,
  },
  tonnageBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tonnageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tonnageValue: {
    ...typography.metricLarge,
    marginTop: 2,
  },
  tonnagePrev: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 3,
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  kpiLbl: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  rankColumns: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rankCol: {
    flex: 1,
    gap: 6,
  },
  rankDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  rankHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  rankSetsTop: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
  },
  rankSetsLow: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.warning,
    fontVariant: ['tabular-nums'],
  },
});
