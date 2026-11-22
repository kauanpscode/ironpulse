import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Badge,
  Card,
  ConsistencyHeatmap,
  EmptyState,
  FadeInView,
  NextWorkoutCard,
  PulseDot,
  SectionHeader,
  WeeklyMuscleVolumeCard,
} from '../components';
import { useActiveWorkout, useAppContext, useAuth } from '../context';
import { analyticsRepository, workoutRepository } from '../repositories';
import { colors, radii, spacing, typography } from '../theme';
import type {
  HeatmapDay,
  NextWorkoutRecommendation,
  RootStackParamList,
  StreakSummary,
  WeeklyMuscleVolume,
  WorkoutSession,
} from '../types';
import {
  formatDurationClock,
  formatDurationMinutesLabel,
  formatShortDate,
  formatTonnage,
} from '../utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EMPTY_STREAK: StreakSummary = {
  currentStreak: 0,
  bestStreak: 0,
  totalWorkouts30d: 0,
  totalWorkoutsAllTime: 0,
  activeDaysThisWeek: 0,
};

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const { dataVersion } = useAppContext();
  const { user } = useAuth();
  const { activeWorkout, elapsedSeconds, startFromRoutineDay, startEmptyWorkout } =
    useActiveWorkout();

  const firstName = user?.name.trim().split(/\s+/)[0] ?? 'Atleta';
  const initials = (user?.name ?? 'IP')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [streak, setStreak] = useState<StreakSummary>(EMPTY_STREAK);
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyMuscleVolume[]>([]);
  const [nextWorkout, setNextWorkout] = useState<NextWorkoutRecommendation | null>(null);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);

  const loadDashboard = useCallback(async () => {
    const [hm, st, vol, next, recent] = await Promise.all([
      analyticsRepository.getHeatmapData(12),
      analyticsRepository.getStreakSummary(),
      analyticsRepository.getWeeklyMuscleVolume(),
      analyticsRepository.getNextWorkoutRecommendation(),
      workoutRepository.listRecentCompleted(5),
    ]);
    setHeatmap(hm);
    setStreak(st);
    setWeeklyVolume(vol);
    setNextWorkout(next);
    setRecentSessions(recent);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, dataVersion]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const handleStartRoutineDay = async (routineDayId: string): Promise<void> => {
    await startFromRoutineDay(routineDayId);
    navigation.navigate('ActiveWorkout', { routineDayId });
  };

  const handleStartEmpty = async (): Promise<void> => {
    await startEmptyWorkout('Treino Livre');
    navigation.navigate('ActiveWorkout', {});
  };

  const handleResume = (): void => {
    navigation.navigate('ActiveWorkout', {
      sessionId: activeWorkout?.session.id,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const weeklyValidSets = weeklyVolume.reduce((acc, v) => acc + v.validSets, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadDashboard();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <FadeInView delay={0}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.brand}>IRONPULSE • {user?.goal.toUpperCase() ?? 'HIPERTROFIA'}</Text>
              <Text style={styles.heroTitle} numberOfLines={1}>
                Olá, {firstName}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => navigation.navigate('ReportsExport')}
                style={styles.headerBtn}
              >
                <Ionicons name="document-text-outline" size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Account')}
                style={styles.avatarBtn}
              >
                <Text style={styles.avatarBtnText}>{initials}</Text>
              </Pressable>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={40}>
          <View style={styles.quickSummaryRow}>
            <View style={styles.quickStatCard}>
              <Ionicons name="flame" size={16} color={colors.primary} />
              <Text style={styles.quickStatValue}>{streak.currentStreak}</Text>
              <Text style={styles.quickStatLabel}>Sequência</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="calendar-outline" size={16} color={colors.secondary} />
              <Text style={styles.quickStatValue}>{streak.activeDaysThisWeek}</Text>
              <Text style={styles.quickStatLabel}>Semana</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="layers-outline" size={16} color={colors.info} />
              <Text style={styles.quickStatValue}>{weeklyValidSets}</Text>
              <Text style={styles.quickStatLabel}>Séries (7d)</Text>
            </View>
          </View>
        </FadeInView>

        {activeWorkout ? (
          <FadeInView delay={70}>
            <Pressable onPress={handleResume} style={styles.activeBanner}>
              <PulseDot color={colors.secondary} size={9} />
              <View style={styles.activeBannerText}>
                <Text style={styles.activeBannerTitle}>
                  Treino ativo: {activeWorkout.session.title}
                </Text>
                <Text style={styles.activeBannerSub}>
                  Em andamento • {formatDurationClock(elapsedSeconds)} • Toque para voltar
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
            </Pressable>
          </FadeInView>
        ) : null}

        <FadeInView delay={90}>
          <NextWorkoutCard
            recommendation={nextWorkout}
            hasActiveWorkout={activeWorkout !== null}
            onStartWorkout={(dayId) => void handleStartRoutineDay(dayId)}
            onResumeWorkout={handleResume}
            onStartEmpty={() => void handleStartEmpty()}
          />
        </FadeInView>

        <FadeInView delay={150}>
          <ConsistencyHeatmap days={heatmap} streak={streak} />
        </FadeInView>

        <FadeInView delay={210}>
          <WeeklyMuscleVolumeCard volumes={weeklyVolume} />
        </FadeInView>

        <FadeInView delay={260} style={styles.sectionBlock}>
          <SectionHeader
            title="Treinos Recentes"
            subtitle="Últimas sessões concluídas"
            actionLabel="Relatórios"
            onAction={() => navigation.navigate('ReportsExport')}
          />

          {recentSessions.length === 0 ? (
            <Card>
              <EmptyState
                icon="barbell-outline"
                title="Nenhum treino concluído"
                description="Inicie sua primeira sessão para destravar métricas de volume, PRs e sobrecarga progressiva."
                actionLabel="Iniciar Treino Livre"
                onAction={() => void handleStartEmpty()}
              />
            </Card>
          ) : (
            <View style={styles.recentList}>
              {recentSessions.map((session) => (
                <Card key={session.id} style={styles.recentCard}>
                  <View style={styles.recentTop}>
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {session.title}
                    </Text>
                    <Badge label={formatShortDate(session.startedAt)} tone="neutral" />
                  </View>
                  <View style={styles.recentMetrics}>
                    <View style={styles.recentMetricItem}>
                      <Ionicons name="barbell" size={14} color={colors.primary} />
                      <Text style={styles.recentMetricText}>
                        {formatTonnage(session.totalTonnage)}
                      </Text>
                    </View>
                    <View style={styles.recentMetricItem}>
                      <Ionicons name="layers-outline" size={14} color={colors.secondary} />
                      <Text style={styles.recentMetricText}>
                        {session.totalValidSets} séries
                      </Text>
                    </View>
                    <View style={styles.recentMetricItem}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.recentMetricText}>
                        {formatDurationMinutesLabel(session.durationSeconds)}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </FadeInView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brand: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.primary,
  },
  heroTitle: {
    ...typography.hero,
    fontSize: 25,
    marginTop: 2,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
  },
  quickSummaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 3,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryMuted,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  activeBannerText: {
    flex: 1,
  },
  activeBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activeBannerSub: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  sectionBlock: {
    marginTop: spacing.xs,
  },
  recentList: {
    gap: spacing.sm,
  },
  recentCard: {
    padding: spacing.md,
  },
  recentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  recentTitle: {
    ...typography.bodyBold,
    flex: 1,
  },
  recentMetrics: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  recentMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recentMetricText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
