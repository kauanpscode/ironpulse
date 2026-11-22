import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AnimatedProgressBar,
  Button,
  Chip,
  EmptyState,
  ExerciseSessionCard,
  ModalSheet,
  PostWorkoutSummaryModal,
  PulseDot,
  RestTimerBar,
  SubstituteExerciseModal,
} from '../components';
import { useActiveWorkout } from '../context';
import { exerciseRepository } from '../repositories';
import { colors, radii, spacing } from '../theme';
import {
  MUSCLE_GROUPS,
  type ActiveSessionExercise,
  type Exercise,
  type MuscleGroup,
  type RootStackParamList,
  type WeightMode,
} from '../types';
import { formatDurationClock, formatTonnage, isWorkingSet } from '../utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ActiveWorkoutScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const {
    activeWorkout,
    elapsedSeconds,
    restTimer,
    lastSummary,
    updateSet,
    addSet,
    deleteSet,
    addExercise,
    removeExercise,
    substituteExercise,
    finishWorkout,
    cancelWorkout,
    clearLastSummary,
    adjustRestTimer,
    skipRestTimer,
  } = useActiveWorkout();

  const [effortMode, setEffortMode] = useState<'RPE' | 'RIR'>('RPE');
  const [sessionNotes, setSessionNotes] = useState('');
  const [subTarget, setSubTarget] = useState<ActiveSessionExercise | null>(null);

  // Add exercise modal state
  const [showAddEx, setShowAddEx] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'Todos'>('Todos');

  useEffect(() => {
    if (!showAddEx) return;
    void (async () => {
      const list = await exerciseRepository.list();
      setAllExercises(list);
    })();
  }, [showAddEx]);

  const handleToggleExerciseWeightMode = (
    exItem: ActiveSessionExercise,
    nextMode: WeightMode
  ): void => {
    void Promise.all(
      exItem.sets.map((s) => updateSet(s.id, { weightMode: nextMode }))
    );
  };

  const handleConfirmFinish = (): void => {
    if (!activeWorkout) return;
    const completedWorking = activeWorkout.exercises.reduce(
      (sum, ex) =>
        sum + ex.sets.filter((s) => s.completed && isWorkingSet(s.setType)).length,
      0
    );
    if (completedWorking === 0) {
      Alert.alert(
        'Nenhuma série concluída',
        'Marque ao menos uma série válida (✓) antes de finalizar, ou cancele o treino.'
      );
      return;
    }

    Alert.alert(
      'Finalizar treino?',
      `Você concluiu ${completedWorking} séries válidas em ${formatDurationClock(elapsedSeconds)}.`,
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: () => {
            void finishWorkout(sessionNotes);
          },
        },
      ]
    );
  };

  const handleConfirmCancel = (): void => {
    Alert.alert(
      'Descartar treino?',
      'Os dados desta sessão em andamento serão descartados.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await cancelWorkout();
              navigation.goBack();
            })();
          },
        },
      ]
    );
  };

  const handleCloseSummary = (): void => {
    clearLastSummary();
    navigation.goBack();
  };

  if (!activeWorkout && lastSummary) {
    return (
      <SafeAreaView style={styles.safe}>
        <PostWorkoutSummaryModal
          summary={lastSummary}
          onClose={handleCloseSummary}
        />
      </SafeAreaView>
    );
  }

  if (!activeWorkout) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          icon="barbell-outline"
          title="Nenhum treino ativo"
          description="Volte ao painel ou às suas fichas para iniciar uma sessão."
          actionLabel="Voltar"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const liveTonnage = activeWorkout.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets
        .filter((s) => s.completed && isWorkingSet(s.setType))
        .reduce((sSum, s) => sSum + s.volume, 0),
    0
  );

  const liveValidSets = activeWorkout.exercises.reduce(
    (sum, ex) =>
      sum + ex.sets.filter((s) => s.completed && isWorkingSet(s.setType)).length,
    0
  );

  const totalPlannedSets = activeWorkout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => isWorkingSet(s.setType)).length,
    0
  );
  const workoutProgress =
    totalPlannedSets > 0 ? liveValidSets / totalPlannedSets : 0;

  const filteredAddExercises = allExercises.filter((ex) => {
    if (muscleFilter !== 'Todos' && ex.muscleGroup !== muscleFilter) return false;
    if (search.trim() && !ex.name.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Sticky Live Workout Header */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={styles.workoutTitle} numberOfLines={1}>
            {activeWorkout.session.title}
          </Text>
          <View style={styles.liveClockRow}>
            <PulseDot color={colors.secondary} size={6} />
            <Text style={styles.clockValue}>{formatDurationClock(elapsedSeconds)}</Text>
            <Text style={styles.liveSep}>•</Text>
            <Text style={styles.liveStatText}>{formatTonnage(liveTonnage)}</Text>
            <Text style={styles.liveSep}>•</Text>
            <Text style={styles.liveStatText}>
              {liveValidSets}/{totalPlannedSets} séries
            </Text>
          </View>
        </View>

        <Button
          title="Finalizar"
          size="sm"
          variant="secondary"
          onPress={handleConfirmFinish}
        />
      </View>

      <AnimatedProgressBar
        progress={workoutProgress}
        color={colors.secondary}
        height={3}
        trackColor={colors.surfaceElevated}
        duration={300}
      />

      {/* Effort mode & legend strip */}
      <View style={styles.subBar}>
        <Text style={styles.legendText}>
          Tipo: W=Aquec • N=Trab • D=Drop • F=Falha
        </Text>
        <Pressable
          onPress={() => setEffortMode((m) => (m === 'RPE' ? 'RIR' : 'RPE'))}
          style={styles.effortToggle}
        >
          <Text style={styles.effortToggleText}>Esforço: {effortMode}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {activeWorkout.exercises.length === 0 ? (
          <EmptyState
            icon="add-circle-outline"
            title="Treino livre iniciado"
            description="Adicione os exercícios que vai executar hoje para começar a registrar séries e cargas."
            actionLabel="Adicionar Exercício"
            onAction={() => setShowAddEx(true)}
          />
        ) : (
          activeWorkout.exercises.map((item) => (
            <ExerciseSessionCard
              key={item.id}
              item={item}
              effortMode={effortMode}
              onUpdateSet={(setId, patch, restSec, exName) =>
                void updateSet(setId, patch, restSec, exName)
              }
              onAddSet={(setType) => void addSet(item.id, setType)}
              onDeleteSet={(setId) => void deleteSet(setId)}
              onToggleExerciseWeightMode={(mode) =>
                handleToggleExerciseWeightMode(item, mode)
              }
              onSubstitute={() => setSubTarget(item)}
              onRemoveExercise={() => {
                Alert.alert(
                  'Remover exercício',
                  `Remover "${item.exercise.name}" apenas desta sessão?`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Remover',
                      style: 'destructive',
                      onPress: () => void removeExercise(item.id),
                    },
                  ]
                );
              }}
            />
          ))
        )}

        <Button
          title="Adicionar Exercício ao Treino"
          variant="ghost"
          size="md"
          fullWidth
          onPress={() => setShowAddEx(true)}
          icon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} />}
        />

        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Notas da Sessão</Text>
          <TextInput
            value={sessionNotes}
            onChangeText={setSessionNotes}
            placeholder="Sensação de energia, pump, articulações, observações..."
            placeholderTextColor={colors.textMuted}
            style={styles.notesInput}
            multiline
          />
        </View>

        <Button
          title="Descartar Treino"
          variant="danger"
          size="md"
          fullWidth
          onPress={handleConfirmCancel}
        />
      </ScrollView>

      {/* Automatic Rest Timer Sticky Bar */}
      <RestTimerBar
        timer={restTimer}
        onAdjust={adjustRestTimer}
        onSkip={skipRestTimer}
      />

      {/* Quick Substitution Modal */}
      {subTarget ? (
        <SubstituteExerciseModal
          visible={subTarget !== null}
          currentExerciseName={subTarget.exercise.name}
          targetMuscleGroup={subTarget.exercise.muscleGroup}
          excludeExerciseId={subTarget.exerciseId}
          onSelect={(newExId) => {
            const targetId = subTarget.id;
            setSubTarget(null);
            void substituteExercise(targetId, newExId);
          }}
          onClose={() => setSubTarget(null)}
        />
      ) : null}

      {/* Add Exercise Modal */}
      <ModalSheet
        visible={showAddEx}
        title="Adicionar Exercício"
        subtitle="Inclusão avulsa apenas nesta sessão"
        onClose={() => setShowAddEx(false)}
      >
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar exercício..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
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

        <View style={styles.pickerList}>
          {filteredAddExercises.map((ex) => (
            <Pressable
              key={ex.id}
              onPress={() => {
                setShowAddEx(false);
                void addExercise(ex.id);
              }}
              style={styles.pickerItem}
            >
              <View style={styles.pickerInfo}>
                <Text style={styles.pickerName}>{ex.name}</Text>
                <Text style={styles.pickerMeta}>
                  {ex.muscleGroup} • {ex.equipment}
                </Text>
              </View>
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  liveClockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  clockValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
  },
  liveSep: {
    fontSize: 11,
    color: colors.textMuted,
  },
  liveStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  subBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: '#131317',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  effortToggle: {
    backgroundColor: colors.warningMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  effortToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  notesInput: {
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  searchInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  filterScroll: {
    marginVertical: spacing.md,
  },
  pickerList: {
    gap: spacing.sm,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  pickerInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  pickerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pickerMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
