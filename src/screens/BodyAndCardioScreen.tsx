import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Badge,
  BodyTrendChartCard,
  Button,
  Card,
  Chip,
  EmptyState,
  ModalSheet,
  SectionHeader,
} from '../components';
import { useAppContext } from '../context';
import {
  analyticsRepository,
  bodyRepository,
  cardioRepository,
} from '../repositories';
import { colors, radii, spacing, typography } from '../theme';
import {
  CARDIO_INTENSITIES,
  CARDIO_MODALITIES,
  type BodyMeasurement,
  type BodyMetricKey,
  type CardioIntensity,
  type CardioModality,
  type CardioSession,
  type HeatmapDay,
} from '../types';
import {
  formatShortDate,
  formatWeekdayShort,
  hapticLight,
  hapticSuccess,
  nowIso,
  toDateKey,
} from '../utils';

type ActiveTab = 'body' | 'cardio';

export function BodyAndCardioScreen(): React.JSX.Element {
  const { dataVersion, bumpDataVersion } = useAppContext();

  const [tab, setTab] = useState<ActiveTab>('body');
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [cardioList, setCardioList] = useState<CardioSession[]>([]);
  const [weekDays, setWeekDays] = useState<HeatmapDay[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<BodyMetricKey>('weightKg');

  // Body modal state
  const [showBodyModal, setShowBodyModal] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [armCm, setArmCm] = useState('');
  const [chestCm, setChestCm] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [thighCm, setThighCm] = useState('');
  const [bodyNotes, setBodyNotes] = useState('');

  // Cardio modal state
  const [showCardioModal, setShowCardioModal] = useState(false);
  const [modality, setModality] = useState<CardioModality>('Caminhada Inclinada');
  const [durationMin, setDurationMin] = useState('30');
  const [distanceKm, setDistanceKm] = useState('');
  const [intensity, setIntensity] = useState<CardioIntensity>('Moderada');
  const [cardioNotes, setCardioNotes] = useState('');

  const loadAll = useCallback(async () => {
    const [bList, cList, hm] = await Promise.all([
      bodyRepository.list(),
      cardioRepository.list(40),
      analyticsRepository.getHeatmapData(1),
    ]);
    setMeasurements(bList);
    setCardioList(cList);
    setWeekDays(hm);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll, dataVersion]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll])
  );

  const parseOptNum = (txt: string): number | null => {
    if (!txt.trim()) return null;
    const n = parseFloat(txt.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const handleSaveBody = async (): Promise<void> => {
    const w = parseOptNum(weightKg);
    if (!w) {
      Alert.alert('Peso obrigatório', 'Informe seu peso corporal em kg.');
      return;
    }

    await bodyRepository.create({
      measuredAt: toDateKey(new Date()),
      weightKg: w,
      bodyFatPct: parseOptNum(bodyFatPct),
      armCm: parseOptNum(armCm),
      chestCm: parseOptNum(chestCm),
      waistCm: parseOptNum(waistCm),
      thighCm: parseOptNum(thighCm),
      notes: bodyNotes,
    });

    void hapticSuccess();
    setWeightKg('');
    setBodyFatPct('');
    setArmCm('');
    setChestCm('');
    setWaistCm('');
    setThighCm('');
    setBodyNotes('');
    setShowBodyModal(false);
    bumpDataVersion();
    await loadAll();
  };

  const handleSaveCardio = async (): Promise<void> => {
    const dur = parseInt(durationMin, 10);
    if (!Number.isFinite(dur) || dur <= 0) {
      Alert.alert('Duração obrigatória', 'Informe a duração em minutos.');
      return;
    }

    await cardioRepository.create({
      performedAt: nowIso(),
      modality,
      durationMinutes: dur,
      distanceKm: parseOptNum(distanceKm),
      intensity,
      notes: cardioNotes,
    });

    void hapticSuccess();
    setDurationMin('30');
    setDistanceKm('');
    setCardioNotes('');
    setShowCardioModal(false);
    bumpDataVersion();
    await loadAll();
  };

  const latest = measurements[0] ?? null;

  const last7Cardio = cardioList.filter((c) => {
    const diff = Date.now() - new Date(c.performedAt).getTime();
    return diff <= 7 * 24 * 60 * 60 * 1000;
  });
  const weeklyCardioMin = last7Cardio.reduce((s, c) => s + c.durationMinutes, 0);
  const weeklyCardioKm = last7Cardio.reduce((s, c) => s + (c.distanceKm ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Corpo & Cardio</Text>
            <Text style={styles.subtitle}>
              Biometria, circunferências e condicionamento
            </Text>
          </View>
          <Button
            title={tab === 'body' ? 'Medir' : 'Cardio'}
            size="sm"
            variant={tab === 'body' ? 'secondary' : 'primary'}
            onPress={() =>
              tab === 'body' ? setShowBodyModal(true) : setShowCardioModal(true)
            }
            icon={<Ionicons name="add" size={16} color={colors.textInverse} />}
          />
        </View>

        <View style={styles.segment}>
          <Pressable
            onPress={() => {
              void hapticLight();
              setTab('body');
            }}
            style={[styles.segBtn, tab === 'body' && styles.segBtnActive]}
          >
            <Text style={[styles.segText, tab === 'body' && styles.segTextActive]}>
              Medidas Corporais
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void hapticLight();
              setTab('cardio');
            }}
            style={[styles.segBtn, tab === 'cardio' && styles.segBtnActive]}
          >
            <Text style={[styles.segText, tab === 'cardio' && styles.segTextActive]}>
              Sessões de Cardio
            </Text>
          </Pressable>
        </View>

        {tab === 'body' ? (
          <>
            {latest ? (
              <Card>
                <View style={styles.snapHeader}>
                  <Text style={styles.snapTitle}>Última Avaliação</Text>
                  <Badge label={formatShortDate(latest.measuredAt)} tone="success" />
                </View>
                <View style={styles.snapGrid}>
                  <View style={styles.snapTile}>
                    <Text style={styles.snapVal}>{latest.weightKg} kg</Text>
                    <Text style={styles.snapLbl}>Peso</Text>
                  </View>
                  <View style={styles.snapTile}>
                    <Text style={styles.snapVal}>
                      {latest.bodyFatPct !== null ? `${latest.bodyFatPct}%` : '—'}
                    </Text>
                    <Text style={styles.snapLbl}>% Gordura</Text>
                  </View>
                  <View style={styles.snapTile}>
                    <Text style={styles.snapVal}>
                      {latest.armCm !== null ? `${latest.armCm} cm` : '—'}
                    </Text>
                    <Text style={styles.snapLbl}>Braço</Text>
                  </View>
                  <View style={styles.snapTile}>
                    <Text style={styles.snapVal}>
                      {latest.chestCm !== null ? `${latest.chestCm} cm` : '—'}
                    </Text>
                    <Text style={styles.snapLbl}>Peito</Text>
                  </View>
                  <View style={styles.snapTile}>
                    <Text style={styles.snapVal}>
                      {latest.waistCm !== null ? `${latest.waistCm} cm` : '—'}
                    </Text>
                    <Text style={styles.snapLbl}>Cintura</Text>
                  </View>
                  <View style={styles.snapTile}>
                    <Text style={styles.snapVal}>
                      {latest.thighCm !== null ? `${latest.thighCm} cm` : '—'}
                    </Text>
                    <Text style={styles.snapLbl}>Coxa</Text>
                  </View>
                </View>
              </Card>
            ) : null}

            <BodyTrendChartCard
              measurements={measurements}
              selectedMetric={selectedMetric}
              onSelectMetric={setSelectedMetric}
            />

            <View>
              <SectionHeader
                title="Histórico Corporal"
                actionLabel="+ Registrar"
                onAction={() => setShowBodyModal(true)}
              />
              {measurements.length === 0 ? (
                <Card>
                  <EmptyState
                    icon="body-outline"
                    title="Nenhuma medição registrada"
                    description="Registre peso, % de gordura e circunferências semanalmente para acompanhar sua recomposição."
                    actionLabel="Registrar Medição"
                    onAction={() => setShowBodyModal(true)}
                  />
                </Card>
              ) : (
                <View style={styles.list}>
                  {measurements.map((m) => (
                    <Card key={m.id} style={styles.rowCard}>
                      <View style={styles.rowTop}>
                        <Text style={styles.rowDate}>
                          {formatShortDate(m.measuredAt)}
                        </Text>
                        <Pressable
                          onPress={() => {
                            Alert.alert('Excluir medição', 'Remover este registro?', [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Excluir',
                                style: 'destructive',
                                onPress: () => {
                                  void (async () => {
                                    await bodyRepository.remove(m.id);
                                    bumpDataVersion();
                                    await loadAll();
                                  })();
                                },
                              },
                            ]);
                          }}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={colors.textMuted}
                          />
                        </Pressable>
                      </View>
                      <Text style={styles.bodyLine}>
                        Peso: <Text style={styles.bold}>{m.weightKg} kg</Text>
                        {m.bodyFatPct !== null ? `  •  BF: ${m.bodyFatPct}%` : ''}
                      </Text>
                      <Text style={styles.bodySubLine}>
                        Braço: {m.armCm ?? '—'} • Peito: {m.chestCm ?? '—'} • Cintura:{' '}
                        {m.waistCm ?? '—'} • Coxa: {m.thighCm ?? '—'} cm
                      </Text>
                      {m.notes ? <Text style={styles.noteText}>{m.notes}</Text> : null}
                    </Card>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Integrated 7-day calendar strip (Strength + Cardio) */}
            <Card>
              <Text style={styles.snapTitle}>Calendário Semanal Integrado</Text>
              <Text style={styles.weekSub}>
                Laranja = Musculação • Azul = Cardio
              </Text>
              <View style={styles.weekStrip}>
                {weekDays.map((d) => (
                  <View key={d.date} style={styles.weekDayCell}>
                    <Text style={styles.weekDayLbl}>
                      {formatWeekdayShort(d.date)}
                    </Text>
                    <View style={styles.weekDots}>
                      <View
                        style={[
                          styles.actDot,
                          {
                            backgroundColor:
                              d.workoutCount > 0
                                ? colors.primary
                                : colors.surfaceElevated,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.actDot,
                          {
                            backgroundColor:
                              d.cardioCount > 0
                                ? colors.info
                                : colors.surfaceElevated,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.cardioKpiRow}>
                <View style={styles.cardioKpi}>
                  <Text style={styles.cardioKpiVal}>{last7Cardio.length}</Text>
                  <Text style={styles.cardioKpiLbl}>Sessões (7d)</Text>
                </View>
                <View style={styles.cardioKpi}>
                  <Text style={[styles.cardioKpiVal, { color: colors.info }]}>
                    {weeklyCardioMin} min
                  </Text>
                  <Text style={styles.cardioKpiLbl}>Tempo (7d)</Text>
                </View>
                <View style={styles.cardioKpi}>
                  <Text style={styles.cardioKpiVal}>
                    {weeklyCardioKm.toFixed(1)} km
                  </Text>
                  <Text style={styles.cardioKpiLbl}>Distância (7d)</Text>
                </View>
              </View>
            </Card>

            <View>
              <SectionHeader
                title="Histórico de Cardio"
                actionLabel="+ Registrar"
                onAction={() => setShowCardioModal(true)}
              />

              {cardioList.length === 0 ? (
                <Card>
                  <EmptyState
                    icon="heart-outline"
                    title="Sem sessões de cardio"
                    description="Registre caminhada inclinada, bike, corrida, escada ou HIIT integrado ao seu calendário."
                    actionLabel="Registrar Cardio"
                    onAction={() => setShowCardioModal(true)}
                  />
                </Card>
              ) : (
                <View style={styles.list}>
                  {cardioList.map((c) => (
                    <Card key={c.id} style={styles.rowCard}>
                      <View style={styles.rowTop}>
                        <View style={styles.cardioTitleRow}>
                          <Text style={styles.cardioModality}>{c.modality}</Text>
                          <Badge
                            label={c.intensity}
                            tone={
                              c.intensity === 'Alta'
                                ? 'danger'
                                : c.intensity === 'Moderada'
                                ? 'warning'
                                : 'info'
                            }
                          />
                        </View>
                        <Pressable
                          onPress={() => {
                            Alert.alert('Excluir cardio', 'Remover esta sessão?', [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Excluir',
                                style: 'destructive',
                                onPress: () => {
                                  void (async () => {
                                    await cardioRepository.remove(c.id);
                                    bumpDataVersion();
                                    await loadAll();
                                  })();
                                },
                              },
                            ]);
                          }}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={colors.textMuted}
                          />
                        </Pressable>
                      </View>

                      <Text style={styles.bodyLine}>
                        {formatShortDate(c.performedAt)} •{' '}
                        <Text style={styles.bold}>{c.durationMinutes} min</Text>
                        {c.distanceKm !== null ? ` • ${c.distanceKm} km` : ''}
                        {c.caloriesEst !== null ? ` • ~${c.caloriesEst} kcal` : ''}
                      </Text>
                      {c.notes ? <Text style={styles.noteText}>{c.notes}</Text> : null}
                    </Card>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Body Measurement Modal */}
      <ModalSheet
        visible={showBodyModal}
        title="Nova Medição Corporal"
        subtitle={`Data: ${formatShortDate(toDateKey(new Date()))}`}
        onClose={() => setShowBodyModal(false)}
      >
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Peso (kg) *</Text>
            <TextInput
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
              placeholder="79.5"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>% Gordura</Text>
            <TextInput
              value={bodyFatPct}
              onChangeText={setBodyFatPct}
              keyboardType="decimal-pad"
              placeholder="14.5"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>

        <View style={[styles.twoCol, styles.mt]}>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Braço (cm)</Text>
            <TextInput
              value={armCm}
              onChangeText={setArmCm}
              keyboardType="decimal-pad"
              placeholder="38.0"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Peito (cm)</Text>
            <TextInput
              value={chestCm}
              onChangeText={setChestCm}
              keyboardType="decimal-pad"
              placeholder="103.5"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>

        <View style={[styles.twoCol, styles.mt]}>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Cintura (cm)</Text>
            <TextInput
              value={waistCm}
              onChangeText={setWaistCm}
              keyboardType="decimal-pad"
              placeholder="82.0"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Coxa (cm)</Text>
            <TextInput
              value={thighCm}
              onChangeText={setThighCm}
              keyboardType="decimal-pad"
              placeholder="59.5"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>

        <Text style={[styles.fieldLabel, styles.mt]}>Observações</Text>
        <TextInput
          value={bodyNotes}
          onChangeText={setBodyNotes}
          placeholder="Em jejum, pós-descanso..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <View style={styles.modalBtn}>
          <Button
            title="Salvar Medição"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => void handleSaveBody()}
          />
        </View>
      </ModalSheet>

      {/* Cardio Modal */}
      <ModalSheet
        visible={showCardioModal}
        title="Registrar Cardio"
        subtitle="Integrado ao calendário e relatórios"
        onClose={() => setShowCardioModal(false)}
      >
        <Text style={styles.fieldLabel}>Modalidade</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CARDIO_MODALITIES.map((m) => (
            <Chip
              key={m}
              label={m}
              selected={modality === m}
              onPress={() => setModality(m)}
            />
          ))}
        </ScrollView>

        <View style={[styles.twoCol, styles.mt]}>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Duração (min) *</Text>
            <TextInput
              value={durationMin}
              onChangeText={setDurationMin}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Distância (km)</Text>
            <TextInput
              value={distanceKm}
              onChangeText={setDistanceKm}
              keyboardType="decimal-pad"
              placeholder="Opcional"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>

        <Text style={[styles.fieldLabel, styles.mt]}>Intensidade</Text>
        <View style={styles.intensityRow}>
          {CARDIO_INTENSITIES.map((lvl) => (
            <Chip
              key={lvl}
              label={lvl}
              selected={intensity === lvl}
              onPress={() => setIntensity(lvl)}
              accentColor={colors.info}
            />
          ))}
        </View>

        <Text style={[styles.fieldLabel, styles.mt]}>Notas</Text>
        <TextInput
          value={cardioNotes}
          onChangeText={setCardioNotes}
          placeholder="Zona 2, inclinação, ritmo..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <View style={styles.modalBtn}>
          <Button
            title="Salvar Sessão de Cardio"
            size="lg"
            fullWidth
            onPress={() => void handleSaveCardio()}
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
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  segBtnActive: {
    backgroundColor: colors.primary,
  },
  segText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segTextActive: {
    color: colors.textInverse,
  },
  snapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  snapTitle: {
    ...typography.subtitle,
  },
  snapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  snapTile: {
    width: '31%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  snapVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  snapLbl: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  list: {
    gap: spacing.sm,
  },
  rowCard: {
    padding: spacing.md,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  bodyLine: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  bold: {
    fontWeight: '800',
  },
  bodySubLine: {
    fontSize: 12,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  noteText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  weekSub: {
    ...typography.caption,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  weekDayCell: {
    alignItems: 'center',
    gap: 6,
  },
  weekDayLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  weekDots: {
    flexDirection: 'row',
    gap: 4,
  },
  actDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardioKpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardioKpi: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  cardioKpiVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  cardioKpiLbl: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardioModality: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  col: {
    flex: 1,
  },
  mt: {
    marginTop: spacing.md,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    color: colors.textPrimary,
    fontSize: 15,
  },
  intensityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalBtn: {
    marginTop: spacing.xl,
  },
});
