import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Badge,
  Card,
  EmptyState,
  ExerciseChartCard,
  SectionHeader,
} from '../components';
import { analyticsRepository } from '../repositories';
import { colors, radii, spacing, typography } from '../theme';
import type {
  ExerciseAnalyticsSummary,
  ExerciseChartMetric,
  RootStackParamList,
} from '../types';
import { formatShortDate, formatTonnage } from '../utils';

type Route = RouteProp<RootStackParamList, 'ExerciseDetail'>;

export function ExerciseDetailScreen(): React.JSX.Element {
  const route = useRoute<Route>();
  const { exerciseId } = route.params;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ExerciseAnalyticsSummary | null>(null);
  const [metric, setMetric] = useState<ExerciseChartMetric>('estimated1rm');

  useEffect(() => {
    void (async () => {
      const data = await analyticsRepository.getExerciseAnalytics(exerciseId);
      setSummary(data);
      setLoading(false);
    })();
  }, [exerciseId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!summary) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <EmptyState
          icon="barbell-outline"
          title="Exercício não encontrado"
          description="Não foi possível carregar o histórico deste exercício."
        />
      </SafeAreaView>
    );
  }

  const sessionsDesc = [...summary.sessions].reverse();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroHeader}>
          <Badge label={summary.muscleGroup} tone="primary" />
          <Text style={styles.title}>{summary.exerciseName}</Text>
        </View>

        {/* PR Hero Cards */}
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Melhor 1RM</Text>
            <Text style={[styles.kpiValue, { color: colors.primary }]}>
              {summary.best1rmAllTime} kg
            </Text>
            <Text style={styles.kpiHint}>Fórmula Epley</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Carga Máx.</Text>
            <Text style={[styles.kpiValue, { color: colors.secondary }]}>
              {summary.bestWeightAllTime} kg
            </Text>
            <Text style={styles.kpiHint}>Carga efetiva</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Vol. Recorde</Text>
            <Text style={[styles.kpiValue, { color: colors.info }]}>
              {formatTonnage(summary.bestVolumeSessionAllTime)}
            </Text>
            <Text style={styles.kpiHint}>Em 1 sessão</Text>
          </Card>
        </View>

        {/* Progression Signal Banner */}
        {summary.progression.isReadyToProgress ? (
          <Card
            accentBorder={colors.secondary}
            style={styles.progressionBanner}
          >
            <View style={styles.alertRow}>
              <Ionicons name="trending-up" size={22} color={colors.secondary} />
              <Text style={styles.progressionTitle}>Sinal de Progressão Ativo</Text>
            </View>
            <Text style={styles.alertDesc}>{summary.progression.message}</Text>
          </Card>
        ) : null}

        {/* Plateau Detection Banner */}
        {summary.plateau.isPlateau ? (
          <Card accentBorder={colors.danger} style={styles.plateauBanner}>
            <View style={styles.alertRow}>
              <Ionicons name="warning" size={22} color={colors.danger} />
              <Text style={styles.plateauTitle}>
                Platô Detectado ({summary.plateau.stagnantSessions} sessões)
              </Text>
            </View>
            <Text style={styles.alertDesc}>{summary.plateau.message}</Text>
          </Card>
        ) : null}

        <ExerciseChartCard
          sessions={summary.sessions}
          metric={metric}
          onChangeMetric={setMetric}
        />

        <View>
          <SectionHeader
            title="Histórico por Sessão"
            subtitle="Somente séries válidas concluídas"
          />

          {sessionsDesc.length === 0 ? (
            <Card>
              <EmptyState
                icon="calendar-outline"
                title="Sem registros ainda"
                description="Complete ao menos uma série deste exercício durante um treino para ver o histórico detalhado."
              />
            </Card>
          ) : (
            <View style={styles.historyList}>
              {sessionsDesc.map((s) => (
                <Card key={s.sessionId} style={styles.sessionCard}>
                  <View style={styles.sessionTop}>
                    <View>
                      <Text style={styles.sessionDate}>
                        {formatShortDate(s.performedAt)}
                      </Text>
                      <Text style={styles.sessionTitle}>{s.sessionTitle}</Text>
                    </View>
                    <Badge label={s.topSetSummary} tone="primary" />
                  </View>

                  <View style={styles.sessionGrid}>
                    <View style={styles.sessionStat}>
                      <Text style={styles.sessionStatLbl}>1RM Est.</Text>
                      <Text style={styles.sessionStatVal}>
                        {s.bestEstimated1rm} kg
                      </Text>
                    </View>
                    <View style={styles.sessionStat}>
                      <Text style={styles.sessionStatLbl}>Volume</Text>
                      <Text style={styles.sessionStatVal}>
                        {formatTonnage(s.totalVolume)}
                      </Text>
                    </View>
                    <View style={styles.sessionStat}>
                      <Text style={styles.sessionStatLbl}>Reps/Série</Text>
                      <Text style={styles.sessionStatVal}>
                        {s.workingSetReps.join(', ')}
                      </Text>
                    </View>
                    <View style={styles.sessionStat}>
                      <Text style={styles.sessionStatLbl}>RPE</Text>
                      <Text style={styles.sessionStatVal}>
                        {s.avgRpe !== null ? s.avgRpe : '—'}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  heroHeader: {
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 22,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  kpiHint: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressionBanner: {
    backgroundColor: colors.secondaryMuted,
  },
  plateauBanner: {
    backgroundColor: colors.dangerMuted,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  progressionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.secondary,
  },
  plateauTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.danger,
  },
  alertDesc: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  historyList: {
    gap: spacing.sm,
  },
  sessionCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sessionDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  sessionGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  sessionStat: {
    flex: 1,
    alignItems: 'center',
  },
  sessionStatLbl: {
    fontSize: 10,
    color: colors.textMuted,
  },
  sessionStatVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
