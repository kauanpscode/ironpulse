import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  PeriodComparisonCard,
  SectionHeader,
} from '../components';
import { useAppContext } from '../context';
import {
  analyticsRepository,
  type TrackedExerciseListItem,
} from '../repositories';
import { colors, radii, spacing, typography } from '../theme';
import {
  MUSCLE_GROUPS,
  type MuscleGroup,
  type PeriodComparisonReport,
  type ReportPeriod,
  type RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function AnalyticsScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const { dataVersion } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [report, setReport] = useState<PeriodComparisonReport | null>(null);
  const [tracked, setTracked] = useState<TrackedExerciseListItem[]>([]);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'Todos'>('Todos');

  const loadData = useCallback(async () => {
    const [rep, list] = await Promise.all([
      analyticsRepository.getPeriodComparisonReport(period),
      analyticsRepository.listTrackedExercisesWithAlerts(),
    ]);
    setReport(rep);
    setTracked(list);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    void loadData();
  }, [loadData, dataVersion]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const plateauItems = tracked.filter((t) => t.isPlateau);
  const progressItems = tracked.filter((t) => t.isReadyToProgress);

  const filtered = tracked.filter((item) => {
    if (muscleFilter !== 'Todos' && item.muscleGroup !== muscleFilter) return false;
    if (
      search.trim().length > 0 &&
      !item.exerciseName.toLowerCase().includes(search.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Evolução & Dados</Text>
            <Text style={styles.subtitle}>
              Sobrecarga progressiva, 1RM Epley e detecção de platô
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('ReportsExport')}
            style={styles.exportBtn}
          >
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={styles.exportText}>Exportar</Text>
          </Pressable>
        </View>

        {/* Intelligent Alerts Banner */}
        {plateauItems.length > 0 || progressItems.length > 0 ? (
          <View style={styles.alertsStack}>
            {progressItems.map((item) => (
              <Pressable
                key={`prog-${item.exerciseId}`}
                onPress={() =>
                  navigation.navigate('ExerciseDetail', {
                    exerciseId: item.exerciseId,
                  })
                }
                style={styles.progressAlert}
              >
                <View style={styles.alertIconGreen}>
                  <Ionicons name="trending-up" size={18} color={colors.secondary} />
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertTitleGreen}>
                    Sinal de Progressão • {item.exerciseName}
                  </Text>
                  <Text style={styles.alertSub}>
                    Teto da faixa atingido em todas as séries válidas. Toque para ver sugestão de carga.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
              </Pressable>
            ))}

            {plateauItems.map((item) => (
              <Pressable
                key={`plat-${item.exerciseId}`}
                onPress={() =>
                  navigation.navigate('ExerciseDetail', {
                    exerciseId: item.exerciseId,
                  })
                }
                style={styles.plateauAlert}
              >
                <View style={styles.alertIconRed}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertTitleRed}>
                    Platô Detectado • {item.exerciseName}
                  </Text>
                  <Text style={styles.alertSub}>
                    Carga e repetições estagnadas por 3+ sessões seguidas. Toque para analisar.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.danger} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {report ? (
          <PeriodComparisonCard
            report={report}
            period={period}
            onChangePeriod={setPeriod}
          />
        ) : null}

        <View>
          <SectionHeader
            title="Evolução por Exercício"
            subtitle="Toque para abrir gráficos de 1RM, carga e volume"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Filtrar exercício rastreado..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
          >
            <Chip
              label="Todos"
              selected={muscleFilter === 'Todos'}
              onPress={() => setMuscleFilter('Todos')}
            />
            {MUSCLE_GROUPS.map((mg) => (
              <Chip
                key={mg}
                label={mg}
                selected={muscleFilter === mg}
                onPress={() => setMuscleFilter(mg)}
              />
            ))}
          </ScrollView>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon="stats-chart-outline"
                title="Sem exercícios para exibir"
                description="Conclua treinos ou ajuste os filtros para acompanhar sua curva de progressão."
              />
            </Card>
          ) : (
            <View style={styles.exList}>
              {filtered.map((ex) => (
                <Pressable
                  key={ex.exerciseId}
                  onPress={() =>
                    navigation.navigate('ExerciseDetail', {
                      exerciseId: ex.exerciseId,
                    })
                  }
                >
                  <Card style={styles.exCard}>
                    <View style={styles.exTop}>
                      <View style={styles.exTitleWrap}>
                        <Text style={styles.exName}>{ex.exerciseName}</Text>
                        <Text style={styles.exSub}>
                          {ex.muscleGroup} • {ex.equipment} • {ex.sessionCount} sessões
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textMuted}
                      />
                    </View>

                    <View style={styles.exBottom}>
                      <View style={styles.exStat}>
                        <Text style={styles.exStatLabel}>1RM Est.</Text>
                        <Text style={styles.exStatVal}>{ex.best1rm} kg</Text>
                      </View>
                      <View style={styles.exStat}>
                        <Text style={styles.exStatLabel}>Carga Máx.</Text>
                        <Text style={styles.exStatVal}>{ex.bestWeight} kg</Text>
                      </View>
                      <View style={styles.exBadges}>
                        {ex.isReadyToProgress ? (
                          <Badge label="Subir Carga" tone="success" />
                        ) : null}
                        {ex.isPlateau ? (
                          <Badge label="Platô" tone="danger" />
                        ) : null}
                      </View>
                    </View>
                  </Card>
                </Pressable>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    fontSize: 24,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
  },
  exportText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  alertsStack: {
    gap: spacing.sm,
  },
  progressAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(132, 204, 22, 0.45)',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  plateauAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  alertIconGreen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(132, 204, 22, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconRed: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBody: {
    flex: 1,
  },
  alertTitleGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.secondary,
  },
  alertTitleRed: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.danger,
  },
  alertSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    color: colors.textPrimary,
    fontSize: 14,
  },
  chipsScroll: {
    marginVertical: spacing.md,
  },
  exList: {
    gap: spacing.sm,
  },
  exCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  exTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exTitleWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  exName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  exBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.lg,
  },
  exStat: {
    gap: 2,
  },
  exStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  exStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  exBadges: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: 6,
  },
});
