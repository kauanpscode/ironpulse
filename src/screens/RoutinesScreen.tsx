import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, EmptyState } from '../components';
import { useActiveWorkout, useAppContext } from '../context';
import { routineRepository } from '../repositories';
import { colors, radii, spacing, typography } from '../theme';
import type { RootStackParamList, RoutineWithDays } from '../types';
import { hapticMedium } from '../utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function RoutinesScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const { dataVersion, bumpDataVersion } = useAppContext();
  const { startFromRoutineDay, startEmptyWorkout } = useActiveWorkout();

  const [routines, setRoutines] = useState<RoutineWithDays[]>([]);
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);

  const loadRoutines = useCallback(async () => {
    const list = await routineRepository.listWithDays();
    setRoutines(list);
    setExpandedRoutineId(
      (prev) => prev ?? list.find((r) => r.isActive)?.id ?? list[0]?.id ?? null
    );
  }, []);

  useEffect(() => {
    void loadRoutines();
  }, [loadRoutines, dataVersion]);

  useFocusEffect(
    useCallback(() => {
      void loadRoutines();
    }, [loadRoutines])
  );

  const handleSetActive = async (routineId: string): Promise<void> => {
    void hapticMedium();
    await routineRepository.setActiveRoutine(routineId);
    bumpDataVersion();
    await loadRoutines();
  };

  const handleDelete = (routine: RoutineWithDays): void => {
    Alert.alert(
      'Excluir ficha',
      `Deseja remover "${routine.name}"? O histórico de treinos já realizados será mantido.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await routineRepository.deleteRoutine(routine.id);
              bumpDataVersion();
              await loadRoutines();
            })();
          },
        },
      ]
    );
  };

  const handleStartDay = async (routineDayId: string): Promise<void> => {
    await startFromRoutineDay(routineDayId);
    navigation.navigate('ActiveWorkout', { routineDayId });
  };

  const handleStartFree = async (): Promise<void> => {
    await startEmptyWorkout('Treino Livre');
    navigation.navigate('ActiveWorkout', {});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Fichas & Rotinas</Text>
            <Text style={styles.subtitle}>
              Gerencie suas divisões de treino e biblioteca
            </Text>
          </View>
          <Button
            title="Nova Ficha"
            size="sm"
            onPress={() => navigation.navigate('RoutineEditor', {})}
            icon={<Ionicons name="add" size={16} color={colors.textInverse} />}
          />
        </View>

        <View style={styles.quickActionsRow}>
          <Pressable
            style={styles.quickTile}
            onPress={() => navigation.navigate('ExerciseLibrary', {})}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="library-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.quickText}>
              <Text style={styles.quickTitle}>Biblioteca</Text>
              <Text style={styles.quickSub}>Exercícios & custom</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={styles.quickTile}
            onPress={() => void handleStartFree()}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.secondaryMuted }]}>
              <Ionicons name="flash-outline" size={20} color={colors.secondary} />
            </View>
            <View style={styles.quickText}>
              <Text style={styles.quickTitle}>Treino Livre</Text>
              <Text style={styles.quickSub}>Sem ficha fixa</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {routines.length === 0 ? (
          <Card>
            <EmptyState
              icon="clipboard-outline"
              title="Nenhuma ficha cadastrada"
              description="Monte sua divisão (Upper/Lower, PPL, ABC ou Full Body) com metas de séries, repetições e descanso."
              actionLabel="Criar Primeira Ficha"
              onAction={() => navigation.navigate('RoutineEditor', {})}
            />
          </Card>
        ) : (
          routines.map((routine) => {
            const expanded = expandedRoutineId === routine.id;
            return (
              <Card
                key={routine.id}
                accentBorder={routine.isActive ? 'rgba(249, 115, 22, 0.5)' : undefined}
              >
                <Pressable
                  onPress={() =>
                    setExpandedRoutineId(expanded ? null : routine.id)
                  }
                >
                  <View style={styles.routineHeader}>
                    <View style={styles.routineBadges}>
                      <Badge label={routine.splitType} tone="info" />
                      {routine.isActive ? (
                        <Badge label="ATIVA" tone="success" />
                      ) : null}
                    </View>
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </View>

                  <Text style={styles.routineName}>{routine.name}</Text>
                  {routine.description ? (
                    <Text style={styles.routineDesc}>{routine.description}</Text>
                  ) : null}
                  <Text style={styles.routineMeta}>
                    {routine.days.length} dias de treino •{' '}
                    {routine.days.reduce((s, d) => s + d.exercises.length, 0)} exercícios
                  </Text>
                </Pressable>

                <View style={styles.routineActions}>
                  {!routine.isActive ? (
                    <Button
                      title="Ativar"
                      size="sm"
                      variant="secondary"
                      onPress={() => void handleSetActive(routine.id)}
                    />
                  ) : null}
                  <Button
                    title="Editar"
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      navigation.navigate('RoutineEditor', { routineId: routine.id })
                    }
                    icon={<Ionicons name="create-outline" size={15} color={colors.textPrimary} />}
                  />
                  <Button
                    title="Excluir"
                    size="sm"
                    variant="outline"
                    onPress={() => handleDelete(routine)}
                  />
                </View>

                {expanded ? (
                  <View style={styles.daysList}>
                    {routine.days.map((day) => (
                      <View key={day.id} style={styles.dayCard}>
                        <View style={styles.dayHeader}>
                          <View style={styles.dayInfo}>
                            <Text style={styles.dayName}>{day.name}</Text>
                            <Text style={styles.dayMeta}>
                              {day.exercises.length} exercícios • ~{day.estimatedMinutes} min
                            </Text>
                          </View>
                          <Button
                            title="Iniciar"
                            size="sm"
                            onPress={() => void handleStartDay(day.id)}
                            icon={<Ionicons name="play" size={13} color={colors.textInverse} />}
                          />
                        </View>

                        <View style={styles.exList}>
                          {day.exercises.map((rx) => (
                            <View key={rx.id} style={styles.exRow}>
                              <View style={styles.exLeft}>
                                <Text style={styles.exName} numberOfLines={1}>
                                  {rx.exercise.name}
                                </Text>
                                <Text style={styles.exSub}>
                                  {rx.exercise.muscleGroup} • {rx.exercise.equipment}
                                  {rx.weightMode === 'per_side' ? ' • Unilateral' : ''}
                                </Text>
                              </View>
                              <View style={styles.exRight}>
                                <Text style={styles.exTarget}>
                                  {rx.targetSets}×{rx.repMin}–{rx.repMax}
                                </Text>
                                <Text style={styles.exRest}>{rx.restSeconds}s</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
  },
  title: {
    ...typography.title,
    fontSize: 24,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    flex: 1,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  routineBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  routineName: {
    ...typography.title,
    fontSize: 18,
  },
  routineDesc: {
    ...typography.caption,
    marginTop: 4,
    lineHeight: 18,
  },
  routineMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  routineActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  daysList: {
    marginTop: spacing.lg,
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dayCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exList: {
    gap: spacing.sm,
  },
  exRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  exName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  exSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  exRight: {
    alignItems: 'flex-end',
  },
  exTarget: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  exRest: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
