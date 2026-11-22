import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, PeriodComparisonCard } from '../components';
import { useAppContext, useAuth } from '../context';
import { getDatabase, runRealisticSeed } from '../database';
import { analyticsRepository, exportRepository } from '../repositories';
import { colors, radii, spacing, typography } from '../theme';
import type { PeriodComparisonReport, ReportPeriod } from '../types';
import {
  hapticSuccess,
  saveAndShareFile,
  serializeWorkoutRowsToCsv,
  toDateKey,
  validateBackupPayload,
} from '../utils';

export function ReportsExportScreen(): React.JSX.Element {
  const { bumpDataVersion } = useAppContext();
  const { user } = useAuth();

  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [report, setReport] = useState<PeriodComparisonReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    const rep = await analyticsRepository.getPeriodComparisonReport(period);
    setReport(rep);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExportCsv = async (): Promise<void> => {
    setBusyAction('csv');
    setStatusMessage(null);
    try {
      const rows = await exportRepository.getCsvWorkoutRows();
      const csv = serializeWorkoutRowsToCsv(rows);
      const filename = `ironpulse-historico-${toDateKey(new Date())}.csv`;
      const result = await saveAndShareFile(filename, csv, 'text/csv');
      void hapticSuccess();
      setStatusMessage(`${result.message} (${rows.length} séries exportadas)`);
    } catch (err) {
      Alert.alert(
        'Erro ao exportar CSV',
        err instanceof Error ? err.message : 'Falha inesperada.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportJson = async (): Promise<void> => {
    setBusyAction('json');
    setStatusMessage(null);
    try {
      const payload = await exportRepository.buildFullJsonBackup();
      const json = JSON.stringify(payload, null, 2);
      const filename = `ironpulse-backup-${toDateKey(new Date())}.json`;
      const result = await saveAndShareFile(filename, json, 'application/json');
      void hapticSuccess();
      setStatusMessage(
        `${result.message} (${payload.data.workoutSessions.length} sessões, ${payload.data.workoutSets.length} séries)`
      );
    } catch (err) {
      Alert.alert(
        'Erro ao gerar backup JSON',
        err instanceof Error ? err.message : 'Falha inesperada.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleRestoreJson = async (): Promise<void> => {
    setBusyAction('restore');
    setStatusMessage(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (picked.canceled || !picked.assets || picked.assets.length === 0) {
        setBusyAction(null);
        return;
      }

      const fileUri = picked.assets[0]?.uri;
      if (!fileUri) {
        setBusyAction(null);
        return;
      }

      const rawText =
        Platform.OS === 'web'
          ? await (await fetch(fileUri)).text()
          : await new File(fileUri).text();
      const parsed: unknown = JSON.parse(rawText);
      const valid = validateBackupPayload(parsed);

      if (!valid) {
        Alert.alert(
          'Arquivo inválido',
          'O arquivo selecionado não é um backup válido do IronPulse.'
        );
        setBusyAction(null);
        return;
      }

      Alert.alert(
        'Confirmar restauração',
        `Restaurar backup de ${toDateKey(valid.exportedAt)} com ${valid.data.workoutSessions.length} treinos? Os dados locais atuais serão substituídos.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                await exportRepository.restoreFromJsonBackup(valid);
                void hapticSuccess();
                bumpDataVersion();
                await loadReport();
                setStatusMessage('Backup restaurado com sucesso!');
              })();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert(
        'Erro na restauração',
        err instanceof Error ? err.message : 'Não foi possível ler o arquivo JSON.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleReseedDemo = (): void => {
    if (!user) return;
    const executeReseed = async (): Promise<void> => {
      setBusyAction('seed');
      try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
          await db.runAsync(
            `DELETE FROM workout_sets WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)`,
            [user.id]
          );
          await db.runAsync(
            `DELETE FROM workout_session_exercises WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)`,
            [user.id]
          );
          await db.runAsync(`DELETE FROM workout_sessions WHERE user_id = ?`, [user.id]);
          await db.runAsync(
            `DELETE FROM routine_exercises WHERE routine_day_id IN (SELECT id FROM routine_days WHERE routine_id IN (SELECT id FROM routines WHERE user_id = ?))`,
            [user.id]
          );
          await db.runAsync(
            `DELETE FROM routine_days WHERE routine_id IN (SELECT id FROM routines WHERE user_id = ?)`,
            [user.id]
          );
          await db.runAsync(`DELETE FROM routines WHERE user_id = ?`, [user.id]);
          await db.runAsync(`DELETE FROM body_measurements WHERE user_id = ?`, [user.id]);
          await db.runAsync(`DELETE FROM cardio_sessions WHERE user_id = ?`, [user.id]);
        });
        await runRealisticSeed(db, user.id);
        void hapticSuccess();
        bumpDataVersion();
        await loadReport();
        setStatusMessage('Dados de demonstração (4 semanas) carregados nesta conta.');
      } finally {
        setBusyAction(null);
      }
    };

    if (Platform.OS === 'web') {
      void executeReseed();
      return;
    }

    Alert.alert(
      'Recarregar dados demo (4 semanas)',
      'Isso substituirá os treinos da conta atual pelo histórico realista de demonstração (4 semanas, platô e sinal de progressão). Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recarregar',
          style: 'destructive',
          onPress: () => void executeReseed(),
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {report ? (
          <PeriodComparisonCard
            report={report}
            period={period}
            onChangePeriod={setPeriod}
          />
        ) : null}

        {statusMessage ? (
          <View style={styles.statusBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.secondary} />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        ) : null}

        <Card style={styles.cardGap}>
          <Text style={styles.cardTitle}>Exportação de Dados</Text>
          <Text style={styles.cardSub}>
            Exporte todo o histórico de treinos para planilhas (CSV) ou gere um backup completo offline em JSON (exercícios, fichas, treinos, corpo e cardio).
          </Text>

          <Button
            title="Exportar Histórico em CSV"
            variant="primary"
            size="lg"
            fullWidth
            loading={busyAction === 'csv'}
            onPress={() => void handleExportCsv()}
            icon={<Ionicons name="grid-outline" size={18} color={colors.textInverse} />}
          />

          <Button
            title="Exportar Backup Completo (JSON)"
            variant="secondary"
            size="lg"
            fullWidth
            loading={busyAction === 'json'}
            onPress={() => void handleExportJson()}
            icon={<Ionicons name="code-download-outline" size={18} color={colors.textInverse} />}
          />
        </Card>

        <Card style={styles.cardGap}>
          <Text style={styles.cardTitle}>Backup & Restauração Local</Text>
          <Text style={styles.cardSub}>
            Restaure um arquivo `.json` exportado anteriormente ou recarregue o dataset realista de 4 semanas para testes.
          </Text>

          <Button
            title="Restaurar Backup Local (.json)"
            variant="ghost"
            size="md"
            fullWidth
            loading={busyAction === 'restore'}
            onPress={() => void handleRestoreJson()}
            icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />}
          />

          <Button
            title="Recarregar Dataset Demo (4 semanas)"
            variant="outline"
            size="md"
            fullWidth
            loading={busyAction === 'seed'}
            onPress={handleReseedDemo}
            icon={<Ionicons name="refresh-outline" size={18} color={colors.textPrimary} />}
          />
        </Card>
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondaryMuted,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardGap: {
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.subtitle,
  },
  cardSub: {
    ...typography.caption,
    lineHeight: 19,
  },
});
