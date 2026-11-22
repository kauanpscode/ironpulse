import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme';
import type { NextWorkoutRecommendation } from '../../types';
import { Badge, Button } from '../common';

interface NextWorkoutCardProps {
  recommendation: NextWorkoutRecommendation | null;
  hasActiveWorkout: boolean;
  onStartWorkout: (routineDayId: string) => void;
  onResumeWorkout: () => void;
  onStartEmpty: () => void;
}

export function NextWorkoutCard({
  recommendation,
  hasActiveWorkout,
  onStartWorkout,
  onResumeWorkout,
  onStartEmpty,
}: NextWorkoutCardProps): React.JSX.Element {
  if (!recommendation) {
    return (
      <LinearGradient
        colors={['#251710', '#18181B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Badge label="PRÓXIMO TREINO" tone="primary" />
        <Text style={styles.dayName}>Nenhuma ficha ativa</Text>
        <Text style={styles.desc}>
          Ative uma divisão na aba Fichas ou inicie um treino livre agora mesmo.
        </Text>
        <Button
          title={hasActiveWorkout ? 'Retomar Treino Ativo' : 'Iniciar Treino Livre'}
          onPress={hasActiveWorkout ? onResumeWorkout : onStartEmpty}
          size="lg"
          fullWidth
          icon={<Ionicons name="play" size={18} color={colors.textInverse} />}
        />
      </LinearGradient>
    );
  }

  const { day, routineName, daysSinceLast } = recommendation;
  const preview = day.exercises.slice(0, 4);

  return (
    <LinearGradient
      colors={['#291810', '#1B1615', '#18181B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.topMeta}>
        <Badge label="PRÓXIMO TREINO" tone="primary" />
        <View style={styles.metaPill}>
          <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.metaRight}>
            ~{day.estimatedMinutes} min • {day.exercises.length} ex.
          </Text>
        </View>
      </View>

      <Text style={styles.routineName}>{routineName}</Text>
      <Text style={styles.dayName}>{day.name}</Text>

      <View style={styles.muscleRow}>
        {day.focusMuscles.map((m) => (
          <View key={m} style={styles.muscleTag}>
            <Text style={styles.muscleTagText}>{m}</Text>
          </View>
        ))}
      </View>

      <View style={styles.previewBox}>
        {preview.map((rx, idx) => (
          <View key={rx.id} style={styles.previewRow}>
            <View style={styles.indexCircle}>
              <Text style={styles.previewIndex}>{idx + 1}</Text>
            </View>
            <Text style={styles.previewName} numberOfLines={1}>
              {rx.exercise.name}
            </Text>
            <Text style={styles.previewPrescription}>
              {rx.targetSets}×{rx.repMin}–{rx.repMax}
            </Text>
          </View>
        ))}
        {day.exercises.length > 4 ? (
          <Text style={styles.moreText}>
            + {day.exercises.length - 4} exercícios no treino
          </Text>
        ) : null}
      </View>

      {daysSinceLast !== null ? (
        <View style={styles.lastRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <Text style={styles.lastTime}>
            Última execução {daysSinceLast === 0 ? 'hoje' : `há ${daysSinceLast} dias`}
          </Text>
        </View>
      ) : null}

      <Button
        title={hasActiveWorkout ? 'Retomar Treino em Andamento' : 'Iniciar Treino Agora'}
        onPress={() =>
          hasActiveWorkout ? onResumeWorkout() : onStartWorkout(day.id)
        }
        variant={hasActiveWorkout ? 'secondary' : 'primary'}
        size="lg"
        fullWidth
        icon={<Ionicons name="flash" size={20} color={colors.textInverse} />}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.45)',
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
  topMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  metaRight: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  routineName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayName: {
    ...typography.title,
    fontSize: 22,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  desc: {
    ...typography.caption,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  muscleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  muscleTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  muscleTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewBox: {
    backgroundColor: 'rgba(13, 13, 15, 0.58)',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indexCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewIndex: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  previewName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    paddingRight: spacing.sm,
  },
  previewPrescription: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  moreText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  lastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.md,
  },
  lastTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
