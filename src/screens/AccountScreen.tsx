import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, Chip } from '../components';
import { useAuth } from '../context';
import { analyticsRepository, routineRepository } from '../repositories';
import { colors, radii, spacing, typography } from '../theme';
import { TRAINING_GOALS, type TrainingGoal } from '../types';
import { formatShortDate } from '../utils';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'IP';
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? 'IP').toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

export function AccountScreen(): React.JSX.Element {
  const { user, updateProfile, changePassword, logout } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [goal, setGoal] = useState<TrainingGoal>(user?.goal ?? 'Hipertrofia');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passFeedback, setPassFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const [stats, setStats] = useState({
    totalWorkouts: 0,
    currentStreak: 0,
    routinesCount: 0,
  });

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setGoal(user.goal);
    void (async () => {
      const [streak, routines] = await Promise.all([
        analyticsRepository.getStreakSummary(),
        routineRepository.listWithDays(),
      ]);
      setStats({
        totalWorkouts: streak.totalWorkoutsAllTime,
        currentStreak: streak.currentStreak,
        routinesCount: routines.length,
      });
    })();
  }, [user]);

  const handleSaveProfile = async (): Promise<void> => {
    setProfileFeedback(null);
    setSavingProfile(true);
    try {
      await updateProfile({ name, goal });
      setProfileFeedback('Perfil atualizado com sucesso!');
    } catch (err) {
      Alert.alert(
        'Erro ao atualizar',
        err instanceof Error ? err.message : 'Tente novamente.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    setPassFeedback(null);
    if (newPassword !== confirmNewPassword) {
      setPassFeedback({ type: 'err', text: 'As novas senhas não coincidem.' });
      return;
    }

    setSavingPass(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPassFeedback({ type: 'ok', text: 'Senha alterada com sucesso!' });
    } catch (err) {
      setPassFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao alterar senha.',
      });
    } finally {
      setSavingPass(false);
    }
  };

  const handleLogout = (): void => {
    if (Platform.OS === 'web') {
      void logout();
      return;
    }
    Alert.alert(
      'Sair da conta',
      'Seus treinos continuam salvos com segurança nesta conta. Deseja sair agora?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => void logout(),
        },
      ]
    );
  };

  if (!user) return <View style={styles.safe} />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.profileHero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.badgesRow}>
            <Badge label={user.goal} tone="primary" />
            <Badge label="Offline-first • SQLite" tone="success" />
          </View>
          <Text style={styles.sinceText}>
            Membro desde {formatShortDate(user.createdAt)}
          </Text>

          <View style={styles.statsStrip}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{stats.totalWorkouts}</Text>
              <Text style={styles.statLbl}>Treinos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{stats.currentStreak}</Text>
              <Text style={styles.statLbl}>Sequência</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{stats.routinesCount}</Text>
              <Text style={styles.statLbl}>Fichas</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Editar Perfil</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Objetivo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TRAINING_GOALS.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  selected={goal === g}
                  onPress={() => setGoal(g)}
                />
              ))}
            </ScrollView>
          </View>

          {profileFeedback ? (
            <Text style={styles.okText}>{profileFeedback}</Text>
          ) : null}

          <Button
            title="Salvar Alterações"
            size="md"
            fullWidth
            loading={savingProfile}
            onPress={() => void handleSaveProfile()}
          />
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Segurança & Senha</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Senha Atual</Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Digite sua senha atual"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nova Senha</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmar Nova Senha</Text>
            <TextInput
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              placeholder="Repita a nova senha"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          {passFeedback ? (
            <Text
              style={passFeedback.type === 'ok' ? styles.okText : styles.errText}
            >
              {passFeedback.text}
            </Text>
          ) : null}

          <Button
            title="Alterar Senha"
            variant="ghost"
            size="md"
            fullWidth
            loading={savingPass}
            onPress={() => void handleChangePassword()}
          />
        </Card>

        <Button
          title="Sair da Conta"
          variant="danger"
          size="lg"
          fullWidth
          onPress={handleLogout}
          icon={<Ionicons name="log-out-outline" size={20} color={colors.danger} />}
        />
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
  profileHero: {
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryMuted,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
  },
  userName: {
    ...typography.title,
    fontSize: 21,
  },
  userEmail: {
    ...typography.caption,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sinceText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  statsStrip: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLbl: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  sectionCard: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  okText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  errText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});
