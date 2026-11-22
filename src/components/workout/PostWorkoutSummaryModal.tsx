import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme';
import type { PostWorkoutSummary } from '../../types';
import {
  computePercentDelta,
  formatDurationMinutesLabel,
  formatTonnage,
} from '../../utils';
import { Badge, Button, ModalSheet } from '../common';

interface PostWorkoutSummaryModalProps {
  summary: PostWorkoutSummary | null;
  onClose: () => void;
}

export function PostWorkoutSummaryModal({
  summary,
  onClose,
}: PostWorkoutSummaryModalProps): React.JSX.Element {
  const trophyScale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!summary) return;
    trophyScale.setValue(0.4);
    Animated.spring(trophyScale, {
      toValue: 1,
      speed: 12,
      bounciness: 14,
      useNativeDriver: true,
    }).start();
  }, [summary, trophyScale]);

  if (!summary) {
    return <View />;
  }

  const deltaPct =
    summary.previousSessionTonnage !== null
      ? computePercentDelta(summary.totalTonnage, summary.previousSessionTonnage)
      : null;

  return (
    <ModalSheet
      visible={summary !== null}
      title="Treino Concluído!"
      subtitle={summary.title}
      onClose={onClose}
    >
      <View style={styles.heroBanner}>
        <Animated.View
          style={[styles.trophyCircle, { transform: [{ scale: trophyScale }] }]}
        >
          <Ionicons name="trophy" size={32} color={colors.secondary} />
        </Animated.View>
        <Text style={styles.heroTonnage}>{formatTonnage(summary.totalTonnage)}</Text>
        <Text style={styles.heroLabel}>Tonelagem Total Movimentada</Text>
        {deltaPct !== null ? (
          <Badge
            label={`${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs. sessão anterior`}
            tone={deltaPct >= 0 ? 'success' : 'warning'}
            style={styles.deltaBadge}
          />
        ) : null}
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricTile}>
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <Text style={styles.metricValue}>
            {formatDurationMinutesLabel(summary.durationSeconds)}
          </Text>
          <Text style={styles.metricLabel}>Duração</Text>
        </View>
        <View style={styles.metricTile}>
          <Ionicons name="layers-outline" size={18} color={colors.secondary} />
          <Text style={styles.metricValue}>{summary.totalValidSets}</Text>
          <Text style={styles.metricLabel}>Séries Válidas</Text>
        </View>
        <View style={styles.metricTile}>
          <Ionicons name="flame-outline" size={18} color={colors.warning} />
          <Text style={styles.metricValue}>
            {summary.avgRpe !== null ? summary.avgRpe : '—'}
          </Text>
          <Text style={styles.metricLabel}>RPE Médio</Text>
        </View>
      </View>

      {summary.musclesTrained.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GRUPOS TRABALHADOS</Text>
          <View style={styles.muscleRow}>
            {summary.musclesTrained.map((mg) => (
              <Badge key={mg} label={mg} tone="primary" />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          RECORDES BATIDOS ({summary.records.length})
        </Text>
        {summary.records.length === 0 ? (
          <View style={styles.noPrBox}>
            <Text style={styles.noPrText}>
              Sessão consistente registrada! Continue progredindo carga ou repetições no próximo treino.
            </Text>
          </View>
        ) : (
          <View style={styles.prList}>
            {summary.records.map((rec, idx) => (
              <View key={`${rec.exerciseId}-${rec.type}-${idx}`} style={styles.prCard}>
                <View style={styles.prLeft}>
                  <Badge label={rec.label} tone="success" />
                  <Text style={styles.prExName}>{rec.exerciseName}</Text>
                </View>
                <View style={styles.prRight}>
                  <Text style={styles.prValue}>
                    {rec.value} {rec.unit}
                  </Text>
                  {rec.previousBest !== null ? (
                    <Text style={styles.prPrev}>
                      Antes: {rec.previousBest} {rec.unit}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <Button
        title="Voltar ao Painel"
        size="lg"
        fullWidth
        onPress={onClose}
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  heroBanner: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(132, 204, 22, 0.35)',
    marginBottom: spacing.lg,
  },
  trophyCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTonnage: {
    ...typography.hero,
    fontSize: 32,
    color: colors.secondary,
  },
  heroLabel: {
    ...typography.caption,
    marginTop: 4,
  },
  deltaBadge: {
    marginTop: spacing.sm,
    alignSelf: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricTile: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  muscleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  noPrBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  noPrText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  prList: {
    gap: spacing.sm,
  },
  prCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(132, 204, 22, 0.3)',
  },
  prLeft: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.sm,
  },
  prExName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  prRight: {
    alignItems: 'flex-end',
  },
  prValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
  },
  prPrev: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
