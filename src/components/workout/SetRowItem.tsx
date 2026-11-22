import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, SET_TYPE_META, spacing } from '../../theme';
import type { GhostSetReference, SetType, WeightMode, WorkoutSet } from '../../types';
import { hapticLight } from '../../utils';

const SET_TYPE_CYCLE: readonly SetType[] = ['N', 'W', 'D', 'F'];
const RPE_CYCLE: readonly (number | null)[] = [null, 7, 7.5, 8, 8.5, 9, 9.5, 10];

interface SetRowItemProps {
  setItem: WorkoutSet;
  ghost: GhostSetReference | null;
  effortMode: 'RPE' | 'RIR';
  onUpdate: (patch: {
    setType?: SetType;
    weight?: number;
    weightMode?: WeightMode;
    reps?: number;
    rpe?: number | null;
    completed?: boolean;
  }) => void;
  onDelete: () => void;
}

export function SetRowItem({
  setItem,
  ghost,
  effortMode,
  onUpdate,
  onDelete,
}: SetRowItemProps): React.JSX.Element {
  const [weightText, setWeightText] = useState(
    setItem.weight > 0 ? String(setItem.weight) : ''
  );
  const [repsText, setRepsText] = useState(
    setItem.reps > 0 ? String(setItem.reps) : ''
  );
  const checkScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setWeightText(setItem.weight > 0 ? String(setItem.weight) : '');
    setRepsText(setItem.reps > 0 ? String(setItem.reps) : '');
  }, [setItem.id, setItem.weight, setItem.reps]);

  const animateCheckPop = (): void => {
    checkScale.setValue(0.75);
    Animated.spring(checkScale, {
      toValue: 1,
      speed: 22,
      bounciness: 14,
      useNativeDriver: true,
    }).start();
  };

  const typeMeta = SET_TYPE_META[setItem.setType];
  const hasPr =
    setItem.completed &&
    (setItem.isPrWeight || setItem.isPr1rm || setItem.isPrVolume || setItem.isPrReps);

  const cycleSetType = (): void => {
    void hapticLight();
    const idx = SET_TYPE_CYCLE.indexOf(setItem.setType);
    const next = SET_TYPE_CYCLE[(idx + 1) % SET_TYPE_CYCLE.length] ?? 'N';
    onUpdate({ setType: next });
  };

  const cycleRpe = (): void => {
    void hapticLight();
    const currentIdx = RPE_CYCLE.findIndex((v) => v === setItem.rpe);
    const nextRpe = RPE_CYCLE[(currentIdx + 1) % RPE_CYCLE.length] ?? null;
    onUpdate({ rpe: nextRpe });
  };

  const handleWeightBlur = (): void => {
    const parsed = parseFloat(weightText.replace(',', '.'));
    const nextVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    if (nextVal !== setItem.weight) {
      onUpdate({ weight: nextVal });
    }
  };

  const handleRepsBlur = (): void => {
    const parsed = parseInt(repsText, 10);
    const nextVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    if (nextVal !== setItem.reps) {
      onUpdate({ reps: nextVal });
    }
  };

  const handleApplyGhost = (): void => {
    if (!ghost) return;
    void hapticLight();
    setWeightText(String(ghost.weight));
    setRepsText(String(ghost.reps));
    onUpdate({ weight: ghost.weight, reps: ghost.reps, weightMode: ghost.weightMode });
  };

  const handleToggleComplete = (): void => {
    const parsedW = parseFloat(weightText.replace(',', '.'));
    const parsedR = parseInt(repsText, 10);
    const nextW = Number.isFinite(parsedW) && parsedW >= 0 ? parsedW : setItem.weight;
    const nextR = Number.isFinite(parsedR) && parsedR >= 0 ? parsedR : setItem.reps;

    animateCheckPop();
    onUpdate({
      weight: nextW,
      reps: nextR,
      completed: !setItem.completed,
    });
  };

  const effortLabel = (() => {
    if (setItem.rpe === null) return effortMode;
    if (effortMode === 'RPE') return `${setItem.rpe}`;
    const rir = Math.max(0, Math.round(10 - setItem.rpe));
    return `RIR ${rir}`;
  })();

  return (
    <View style={[styles.wrapper, setItem.completed && styles.wrapperDone]}>
      {/* Ghost reference row for progressive overload */}
      <View style={styles.metaRow}>
        {ghost ? (
          <Pressable onPress={handleApplyGhost} style={styles.ghostPill}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.ghostText}>
              Anterior: {ghost.weight}kg{ghost.weightMode === 'per_side' ? '/lado' : ''} ×{' '}
              {ghost.reps}
              {ghost.rpe ? ` @${ghost.rpe}` : ''}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.noGhostText}>Sem referência anterior</Text>
        )}

        <View style={styles.metaRight}>
          {setItem.weightMode === 'per_side' && setItem.weight > 0 ? (
            <Text style={styles.effectiveHint}>= {setItem.effectiveWeight}kg total</Text>
          ) : null}
          {hasPr ? (
            <View style={styles.prPill}>
              <Ionicons name="trophy" size={11} color={colors.textInverse} />
              <Text style={styles.prText}>PR</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Interactive logging row */}
      <View style={styles.mainRow}>
        <Pressable
          onPress={cycleSetType}
          style={[styles.typeBtn, { backgroundColor: typeMeta.bg }]}
        >
          <Text style={[styles.typeText, { color: typeMeta.color }]}>
            {setItem.setType === 'N' ? String(setItem.setOrder) : typeMeta.short}
          </Text>
        </Pressable>

        <View style={styles.inputBox}>
          <TextInput
            value={weightText}
            onChangeText={setWeightText}
            onBlur={handleWeightBlur}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={styles.numInput}
            selectTextOnFocus
          />
          <Text style={styles.unitTag}>
            {setItem.weightMode === 'per_side' ? 'kg/L' : 'kg'}
          </Text>
        </View>

        <View style={styles.inputBox}>
          <TextInput
            value={repsText}
            onChangeText={setRepsText}
            onBlur={handleRepsBlur}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={styles.numInput}
            selectTextOnFocus
          />
          <Text style={styles.unitTag}>reps</Text>
        </View>

        <Pressable
          onPress={cycleRpe}
          style={[
            styles.rpeBtn,
            setItem.rpe !== null && styles.rpeBtnActive,
          ]}
        >
          <Text
            style={[
              styles.rpeText,
              setItem.rpe !== null && styles.rpeTextActive,
            ]}
          >
            {effortLabel}
          </Text>
        </Pressable>

        <Animated.View style={{ transform: [{ scale: checkScale }] }}>
          <Pressable
            onPress={handleToggleComplete}
            style={[
              styles.checkBtn,
              setItem.completed ? styles.checkBtnDone : styles.checkBtnIdle,
            ]}
          >
            <Ionicons
              name="checkmark"
              size={22}
              color={setItem.completed ? colors.textInverse : colors.textSecondary}
            />
          </Pressable>
        </Animated.View>

        {!setItem.completed ? (
          <Pressable onPress={onDelete} hitSlop={6} style={styles.delBtn}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  wrapperDone: {
    backgroundColor: 'rgba(132, 204, 22, 0.08)',
    borderColor: 'rgba(132, 204, 22, 0.35)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  ghostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.xs,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ghostText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  noGhostText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  effectiveHint: {
    fontSize: 11,
    color: colors.info,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  prPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  prText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textInverse,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBtn: {
    width: 36,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  inputBox: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  numInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  unitTag: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  rpeBtn: {
    minWidth: 50,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  rpeBtnActive: {
    borderColor: colors.warning,
    backgroundColor: colors.warningMuted,
  },
  rpeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  rpeTextActive: {
    color: colors.warning,
  },
  checkBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkBtnDone: {
    backgroundColor: colors.secondary,
  },
  delBtn: {
    width: 24,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
