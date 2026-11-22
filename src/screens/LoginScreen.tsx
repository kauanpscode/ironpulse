import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, FadeInView } from '../components';
import { useAuth } from '../context';
import { colors, radii, spacing, typography } from '../theme';
import type { AuthStackParamList } from '../types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const { login, loginDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleLogin = async (): Promise<void> => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Não foi possível entrar.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (): Promise<void> => {
    setErrorMsg(null);
    setDemoLoading(true);
    try {
      await loginDemo();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Falha ao abrir conta de exemplo.'
      );
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['rgba(249, 115, 22, 0.14)', 'rgba(13, 13, 15, 0)']}
        style={styles.ambientGlow}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <FadeInView delay={0} style={styles.hero}>
            <View style={styles.logoFrame}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImg}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.brand}>IRONPULSE</Text>
            <Text style={styles.headline}>Seus treinos, no seu ritmo</Text>
            <Text style={styles.subheadline}>
              Acompanhe cargas, evolução e descansos diretamente na academia — 100% offline.
            </Text>
          </FadeInView>

          <FadeInView delay={90}>
            <Card style={styles.formCard}>
              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.label}>E-mail</Text>
                <View
                  style={[
                    styles.inputRow,
                    focusedField === 'email' && styles.inputRowFocused,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={focusedField === 'email' ? colors.primary : colors.textMuted}
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="seu@email.com"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Senha</Text>
                <View
                  style={[
                    styles.inputRow,
                    focusedField === 'password' && styles.inputRowFocused,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={
                      focusedField === 'password' ? colors.primary : colors.textMuted
                    }
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Digite sua senha"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    textContentType="password"
                    style={styles.input}
                    onSubmitEditing={() => void handleLogin()}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>

              <Button
                title="Entrar"
                size="lg"
                fullWidth
                loading={loading}
                onPress={() => void handleLogin()}
                style={styles.submitBtn}
                icon={
                  <Ionicons name="log-in-outline" size={20} color={colors.textInverse} />
                }
              />

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>primeira vez aqui?</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                title="Criar Minha Conta"
                variant="outline"
                size="md"
                fullWidth
                onPress={() => navigation.navigate('Register')}
                icon={
                  <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                }
              />
            </Card>
          </FadeInView>

          <FadeInView delay={180} style={styles.demoFooter}>
            <Pressable
              onPress={() => void handleDemoLogin()}
              disabled={demoLoading}
              style={styles.demoLinkBtn}
              hitSlop={10}
            >
              <Ionicons name="sparkles-outline" size={15} color={colors.secondary} />
              <Text style={styles.demoLinkText}>
                {demoLoading
                  ? 'Carregando exemplo...'
                  : 'Explorar com conta de exemplo (4 semanas de dados)'}
              </Text>
            </Pressable>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  logoFrame: {
    width: 82,
    height: 82,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(249, 115, 22, 0.5)',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  brand: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3.2,
    color: colors.primary,
  },
  headline: {
    ...typography.hero,
    fontSize: 26,
    marginTop: 6,
    textAlign: 'center',
  },
  subheadline: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 310,
  },
  formCard: {
    gap: spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 52,
    gap: spacing.sm,
  },
  inputRowFocused: {
    borderColor: colors.primary,
    backgroundColor: '#252120',
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  demoFooter: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  demoLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(132, 204, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(132, 204, 22, 0.25)',
  },
  demoLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
});
