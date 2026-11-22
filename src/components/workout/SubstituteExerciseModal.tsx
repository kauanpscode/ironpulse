import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exerciseRepository } from '../../repositories';
import { colors, radii, spacing } from '../../theme';
import type { Exercise, MuscleGroup } from '../../types';
import { Badge, ModalSheet } from '../common';

interface SubstituteExerciseModalProps {
  visible: boolean;
  currentExerciseName: string;
  targetMuscleGroup: MuscleGroup;
  excludeExerciseId: string;
  onSelect: (newExerciseId: string) => void;
  onClose: () => void;
}

export function SubstituteExerciseModal({
  visible,
  currentExerciseName,
  targetMuscleGroup,
  excludeExerciseId,
  onSelect,
  onClose,
}: SubstituteExerciseModalProps): React.JSX.Element {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) return;
    void (async () => {
      const list = await exerciseRepository.list();
      setExercises(list.filter((e) => e.id !== excludeExerciseId));
    })();
  }, [visible, excludeExerciseId]);

  const filtered = exercises.filter((e) =>
    search.trim().length === 0
      ? true
      : e.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        e.muscleGroup.toLowerCase().includes(search.trim().toLowerCase())
  );

  const sameMuscle = filtered.filter((e) => e.muscleGroup === targetMuscleGroup);
  const others = filtered.filter((e) => e.muscleGroup !== targetMuscleGroup);

  return (
    <ModalSheet
      visible={visible}
      title="Substituir Exercício"
      subtitle={`Aparelho ocupado? Troque "${currentExerciseName}" apenas neste treino`}
      onClose={onClose}
    >
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar substituto..."
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
      />

      {sameMuscle.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            RECOMENDADOS ({targetMuscleGroup.toUpperCase()})
          </Text>
          {sameMuscle.map((ex) => (
            <Pressable
              key={ex.id}
              onPress={() => onSelect(ex.id)}
              style={styles.item}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{ex.name}</Text>
                <View style={styles.itemBadges}>
                  <Badge label={ex.muscleGroup} tone="primary" />
                  <Badge label={ex.equipment} tone="neutral" />
                </View>
              </View>
              <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {others.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OUTROS EXERCÍCIOS</Text>
          {others.map((ex) => (
            <Pressable
              key={ex.id}
              onPress={() => onSelect(ex.id)}
              style={styles.item}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{ex.name}</Text>
                <View style={styles.itemBadges}>
                  <Badge label={ex.muscleGroup} tone="neutral" />
                  <Badge label={ex.equipment} tone="neutral" />
                </View>
              </View>
              <Ionicons name="swap-horizontal" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  itemBadges: {
    flexDirection: 'row',
    gap: 6,
  },
});
