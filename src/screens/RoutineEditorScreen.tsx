import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, Chip, ModalSheet } from '../components';
import { useAppContext } from '../context';
import {
  exerciseRepository,
  routineRepository,
  type SaveRoutineDayInput,
} from '../repositories';
import { colors, radii, spacing, typography } from '../theme';
import {
  MUSCLE_GROUPS,
  SPLIT_TYPES,
  type Exercise,
  type MuscleGroup,
  type RootStackParamList,
  type SplitType,
  type WeightMode,
} from '../types';
import { hapticSuccess } from '../utils';

type Route = RouteProp<RootStackParamList, 'RoutineEditor'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface DraftExercise {
  key: string;
  exercise: Exercise;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  weightMode: WeightMode;
  notes: string;
}

interface DraftDay {
  key: string;
  name: string;
  estimatedMinutes: number;
  exercises: DraftExercise[];
}

export function RoutineEditorScreen(): React.JSX.Element {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { bumpDataVersion } = useAppContext();

  const routineId = route.params?.routineId;

  const [name, setName] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('Upper/Lower');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState<DraftDay[]>([
    { key: 'day-1', name: 'Treino A', estimatedMinutes: 60, exercises: [] },
  ]);
  const [saving, setSaving] = useState(false);

  const [pickerDayKey, setPickerDayKey] = useState<string | null>(null);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'Todos'>('Todos');

  useEffect(() => {
    void (async () => {
      const exList = await exerciseRepository.list();
      setAllExercises(exList);

      if (routineId) {
        const existing = await routineRepository.getById(routineId);
        if (existing) {
          setName(existing.name);
          setSplitType(existing.splitType);
          setDescription(existing.description);
          setIsActive(existing.isActive);
          setDays(
            existing.days.map((d) => ({
              key: d.id,
              name: d.name,
              estimatedMinutes: d.estimatedMinutes,
              exercises: d.exercises.map((rx) => ({
                key: rx.id,
                exercise: rx.exercise,
                targetSets: rx.targetSets,
                repMin: rx.repMin,
                repMax: rx.repMax,
                restSeconds: rx.restSeconds,
                weightMode: rx.weightMode,
                notes: rx.notes,
              })),
            }))
          );
        }
      }
    })();
  }, [routineId]);

  const addDay = (): void => {
    const letter = String.fromCharCode(65 + days.length);
    setDays((prev) => [
      ...prev,
      {
        key: `day-${Date.now()}`,
        name: `Treino ${letter}`,
        estimatedMinutes: 60,
        exercises: [],
      },
    ]);
  };

  const removeDay = (dayKey: string): void => {
    if (days.length <= 1) {
      Alert.alert('Aviso', 'A ficha precisa ter pelo menos 1 dia de treino.');
      return;
    }
    setDays((prev) => prev.filter((d) => d.key !== dayKey));
  };

  const addExerciseToDay = (exercise: Exercise): void => {
    if (!pickerDayKey) return;
    setDays((prev) =>
      prev.map((d) =>
        d.key === pickerDayKey
          ? {
              ...d,
              exercises: [
                ...d.exercises,
                {
                  key: `${exercise.id}-${Date.now()}`,
                  exercise,
                  targetSets: 3,
                  repMin: 8,
                  repMax: 12,
                  restSeconds: 90,
                  weightMode: exercise.defaultWeightMode,
                  notes: '',
                },
              ],
            }
          : d
      )
    );
    setPickerDayKey(null);
  };

  const updateDraftExercise = (
    dayKey: string,
    exKey: string,
    patch: Partial<DraftExercise>
  ): void => {
    setDays((prev) =>
      prev.map((d) =>
        d.key === dayKey
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.key === exKey ? { ...e, ...patch } : e
              ),
            }
          : d
      )
    );
  };

  const removeDraftExercise = (dayKey: string, exKey: string): void => {
    setDays((prev) =>
      prev.map((d) =>
        d.key === dayKey
          ? { ...d, exercises: d.exercises.filter((e) => e.key !== exKey) }
          : d
      )
    );
  };

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Informe o nome da ficha de treino.');
      return;
    }
    const hasAtLeastOneExercise = days.some((d) => d.exercises.length > 0);
    if (!hasAtLeastOneExercise) {
      Alert.alert('Sem exercícios', 'Adicione ao menos um exercício em um dos dias.');
      return;
    }

    setSaving(true);
    try {
      const payloadDays: SaveRoutineDayInput[] = days.map((d) => {
        const focusSet = new Set<MuscleGroup>();
        d.exercises.forEach((e) => focusSet.add(e.exercise.muscleGroup));
        return {
          name: d.name.trim() || 'Treino',
          focusMuscles: Array.from(focusSet),
          estimatedMinutes: d.estimatedMinutes,
          exercises: d.exercises.map((e) => ({
            exerciseId: e.exercise.id,
            targetSets: e.targetSets,
            repMin: e.repMin,
            repMax: e.repMax,
            restSeconds: e.restSeconds,
            weightMode: e.weightMode,
            notes: e.notes,
          })),
        };
      });

      await routineRepository.saveRoutine({
        id: routineId,
        name,
        splitType,
        description,
        isActive,
        days: payloadDays,
      });

      void hapticSuccess();
      bumpDataVersion();
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const filteredPickerExercises = allExercises.filter((ex) => {
    if (muscleFilter !== 'Todos' && ex.muscleGroup !== muscleFilter) return false;
    if (search.trim() && !ex.name.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <Text style={styles.label}>Nome da Ficha</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: Upper / Lower 4x — Hipertrofia"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={[styles.label, styles.mt]}>Divisão (Split)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SPLIT_TYPES.map((st) => (
              <Chip
                key={st}
                label={st}
                selected={splitType === st}
                onPress={() => setSplitType(st)}
              />
            ))}
          </ScrollView>

          <Text style={[styles.label, styles.mt]}>Descrição / Objetivo</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Notas gerais sobre o mesociclo..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Definir como ficha ativa</Text>
              <Text style={styles.switchSub}>Aparece no card Próximo Treino da Home</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </Card>

        {days.map((day, idx) => (
          <Card key={day.key}>
            <View style={styles.dayHeaderRow}>
              <Badge label={`DIA ${idx + 1}`} tone="primary" />
              <Pressable onPress={() => removeDay(day.key)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>

            <TextInput
              value={day.name}
              onChangeText={(txt) =>
                setDays((prev) =>
                  prev.map((d) => (d.key === day.key ? { ...d, name: txt } : d))
                )
              }
              placeholder="Ex: Upper A — Peito e Costas"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <View style={styles.exercisesWrap}>
              {day.exercises.map((rx) => (
                <View key={rx.key} style={styles.rxCard}>
                  <View style={styles.rxTop}>
                    <View style={styles.rxTitleWrap}>
                      <Text style={styles.rxName}>{rx.exercise.name}</Text>
                      <Text style={styles.rxSub}>
                        {rx.exercise.muscleGroup} • {rx.exercise.equipment}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeDraftExercise(day.key, rx.key)}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>

                  <View style={styles.rxGrid}>
                    <View style={styles.rxField}>
                      <Text style={styles.rxFieldLabel}>Séries</Text>
                      <TextInput
                        value={String(rx.targetSets)}
                        onChangeText={(t) =>
                          updateDraftExercise(day.key, rx.key, {
                            targetSets: Math.max(1, parseInt(t, 10) || 1),
                          })
                        }
                        keyboardType="number-pad"
                        style={styles.rxInput}
                      />
                    </View>

                    <View style={styles.rxField}>
                      <Text style={styles.rxFieldLabel}>Rep Min</Text>
                      <TextInput
                        value={String(rx.repMin)}
                        onChangeText={(t) =>
                          updateDraftExercise(day.key, rx.key, {
                            repMin: Math.max(1, parseInt(t, 10) || 1),
                          })
                        }
                        keyboardType="number-pad"
                        style={styles.rxInput}
                      />
                    </View>

                    <View style={styles.rxField}>
                      <Text style={styles.rxFieldLabel}>Rep Max</Text>
                      <TextInput
                        value={String(rx.repMax)}
                        onChangeText={(t) =>
                          updateDraftExercise(day.key, rx.key, {
                            repMax: Math.max(1, parseInt(t, 10) || 1),
                          })
                        }
                        keyboardType="number-pad"
                        style={styles.rxInput}
                      />
                    </View>

                    <View style={styles.rxField}>
                      <Text style={styles.rxFieldLabel}>Desc. (s)</Text>
                      <TextInput
                        value={String(rx.restSeconds)}
                        onChangeText={(t) =>
                          updateDraftExercise(day.key, rx.key, {
                            restSeconds: Math.max(15, parseInt(t, 10) || 60),
                          })
                        }
                        keyboardType="number-pad"
                        style={styles.rxInput}
                      />
                    </View>
                  </View>

                  <View style={styles.rxModeRow}>
                    <Pressable
                      onPress={() =>
                        updateDraftExercise(day.key, rx.key, {
                          weightMode: rx.weightMode === 'total' ? 'per_side' : 'total',
                        })
                      }
                      style={styles.modeToggle}
                    >
                      <Ionicons
                        name="swap-horizontal"
                        size={14}
                        color={colors.primary}
                      />
                      <Text style={styles.modeToggleText}>
                        Carga: {rx.weightMode === 'per_side' ? 'Por Lado (×2)' : 'Total'}
                      </Text>
                    </Pressable>
                  </View>

                  <TextInput
                    value={rx.notes}
                    onChangeText={(txt) =>
                      updateDraftExercise(day.key, rx.key, { notes: txt })
                    }
                    placeholder="Observações técnicas (cadência, pegada, banco...)"
                    placeholderTextColor={colors.textMuted}
                    style={styles.notesInput}
                  />
                </View>
              ))}
            </View>

            <Button
              title="Adicionar Exercício"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => setPickerDayKey(day.key)}
              icon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} />}
            />
          </Card>
        ))}

        <Button
          title="Adicionar Novo Dia de Treino"
          variant="outline"
          size="md"
          fullWidth
          onPress={addDay}
          icon={<Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />}
        />

        <Button
          title={routineId ? 'Salvar Alterações da Ficha' : 'Criar Ficha de Treino'}
          variant="primary"
          size="lg"
          fullWidth
          loading={saving}
          onPress={() => void handleSave()}
        />
      </ScrollView>

      <ModalSheet
        visible={pickerDayKey !== null}
        title="Selecionar Exercício"
        subtitle="Toque para adicionar ao dia de treino"
        onClose={() => setPickerDayKey(null)}
      >
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar exercício..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
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
          {filteredPickerExercises.map((ex) => (
            <Pressable
              key={ex.id}
              onPress={() => addExerciseToDay(ex)}
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
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mt: {
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  switchTitle: {
    ...typography.bodyBold,
  },
  switchSub: {
    ...typography.caption,
    marginTop: 2,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exercisesWrap: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  rxCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  rxTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rxTitleWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  rxName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rxSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rxGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rxField: {
    flex: 1,
  },
  rxFieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  rxInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 8,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  rxModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 12,
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
