import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
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
import { Badge, Button, Card, Chip, EmptyState, ModalSheet } from '../components';
import { useAppContext } from '../context';
import { exerciseRepository } from '../repositories';
import { colors, radii, spacing } from '../theme';
import {
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  type EquipmentType,
  type Exercise,
  type MuscleGroup,
  type RootStackParamList,
  type WeightMode,
} from '../types';
import { hapticSuccess } from '../utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ExerciseLibraryScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const { bumpDataVersion } = useAppContext();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'Todos'>('Todos');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentType | 'Todos'>('Todos');

  // Custom exercise creation modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('Peito');
  const [newEquipment, setNewEquipment] = useState<EquipmentType>('Halter');
  const [newWeightMode, setNewWeightMode] = useState<WeightMode>('total');
  const [newNotes, setNewNotes] = useState('');

  const loadExercises = useCallback(async () => {
    const list = await exerciseRepository.list({
      search,
      muscleGroup: muscleFilter,
      equipment: equipmentFilter,
    });
    setExercises(list);
  }, [search, muscleFilter, equipmentFilter]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  const handleCreateCustom = async (): Promise<void> => {
    if (!newName.trim()) {
      Alert.alert('Nome obrigatório', 'Digite o nome do exercício customizado.');
      return;
    }
    await exerciseRepository.create({
      name: newName,
      muscleGroup: newMuscle,
      equipment: newEquipment,
      defaultWeightMode: newWeightMode,
      notes: newNotes,
    });
    void hapticSuccess();
    setNewName('');
    setNewNotes('');
    setShowCreate(false);
    bumpDataVersion();
    await loadExercises();
  };

  const handleDeleteCustom = (exercise: Exercise): void => {
    if (!exercise.isCustom) return;
    Alert.alert('Excluir exercício', `Remover "${exercise.name}" da biblioteca?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await exerciseRepository.softDeleteCustom(exercise.id);
            bumpDataVersion();
            await loadExercises();
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.topControls}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar exercício..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Button
            title="Novo"
            size="sm"
            onPress={() => setShowCreate(true)}
            icon={<Ionicons name="add" size={16} color={colors.textInverse} />}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip
            label="Todos músculos"
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip
            label="Todos equip."
            selected={equipmentFilter === 'Todos'}
            onPress={() => setEquipmentFilter('Todos')}
            accentColor={colors.secondary}
          />
          {EQUIPMENT_TYPES.map((eq) => (
            <Chip
              key={eq}
              label={eq}
              selected={equipmentFilter === eq}
              onPress={() => setEquipmentFilter(eq)}
              accentColor={colors.secondary}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="Nenhum exercício encontrado"
            description="Ajuste os filtros ou cadastre seu próprio exercício customizado."
            actionLabel="Cadastrar Exercício"
            onAction={() => setShowCreate(true)}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate('ExerciseDetail', { exerciseId: item.id })
            }
          >
            <Card style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.badgesRow}>
                    <Badge label={item.muscleGroup} tone="primary" />
                    <Badge label={item.equipment} tone="neutral" />
                    {item.defaultWeightMode === 'per_side' ? (
                      <Badge label="Unilateral" tone="info" />
                    ) : null}
                    {item.isCustom ? <Badge label="Custom" tone="success" /> : null}
                  </View>
                  {item.notes ? (
                    <Text style={styles.itemNotes} numberOfLines={2}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.itemRight}>
                  {item.isCustom ? (
                    <Pressable
                      onPress={() => handleDeleteCustom(item)}
                      hitSlop={10}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  ) : null}
                  <Ionicons name="analytics-outline" size={20} color={colors.textMuted} />
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />

      <ModalSheet
        visible={showCreate}
        title="Novo Exercício Customizado"
        subtitle="Salvo offline na sua biblioteca pessoal"
        onClose={() => setShowCreate(false)}
      >
        <Text style={styles.fieldLabel}>Nome do Exercício</Text>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Ex: Supino Convergente Unilateral"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={[styles.fieldLabel, styles.mt]}>Grupo Muscular Principal</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MUSCLE_GROUPS.map((mg) => (
            <Chip
              key={mg}
              label={mg}
              selected={newMuscle === mg}
              onPress={() => setNewMuscle(mg)}
            />
          ))}
        </ScrollView>

        <Text style={[styles.fieldLabel, styles.mt]}>Equipamento</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {EQUIPMENT_TYPES.map((eq) => (
            <Chip
              key={eq}
              label={eq}
              selected={newEquipment === eq}
              onPress={() => setNewEquipment(eq)}
              accentColor={colors.secondary}
            />
          ))}
        </ScrollView>

        <Text style={[styles.fieldLabel, styles.mt]}>Modo de Carga Padrão</Text>
        <View style={styles.modeRow}>
          <Chip
            label="Carga Total (kg)"
            selected={newWeightMode === 'total'}
            onPress={() => setNewWeightMode('total')}
          />
          <Chip
            label="Por Lado / Unilateral (×2)"
            selected={newWeightMode === 'per_side'}
            onPress={() => setNewWeightMode('per_side')}
          />
        </View>

        <Text style={[styles.fieldLabel, styles.mt]}>Observações Técnicas</Text>
        <TextInput
          value={newNotes}
          onChangeText={setNewNotes}
          placeholder="Dicas de execução, regulagem do banco..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.textArea]}
          multiline
        />

        <View style={styles.modalActions}>
          <Button
            title="Salvar Exercício"
            size="lg"
            fullWidth
            onPress={() => void handleCreateCustom()}
          />
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
  topControls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  chipRow: {
    paddingVertical: 2,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  itemCard: {
    padding: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemNotes: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteBtn: {
    padding: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
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
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalActions: {
    marginTop: spacing.xl,
  },
});
