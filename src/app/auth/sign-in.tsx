import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  isAppleAuthAvailable,
  mapFirebaseAuthError,
} from '@/lib/auth';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    logo: { fontSize: 34, fontWeight: '700', color: colors.primary, letterSpacing: -0.5 },
    tagline: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    form: { width: '100%' },
    title: { fontSize: 24, fontWeight: '600', color: colors.textPrimary, marginBottom: 24 },
    fieldContainer: { marginBottom: 16 },
    input: {
      height: 52,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 10,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    inputError: { borderColor: colors.danger },
    inputRow: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
    },
    inputFlex: { flex: 1, fontSize: 16, color: colors.textPrimary },
    errorText: { fontSize: 12, color: colors.danger, marginTop: 4 },
    generalError: { marginBottom: 8, textAlign: 'center' },
    button: {
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.separator },
    dividerText: { fontSize: 13, color: colors.textTertiary },
    // Google button — keep white bg per Google branding guidelines
    socialButton: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#DADCE0',
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      gap: 12,
      marginBottom: 12,
    },
    googleIconWrapper: {
      width: 20,
      height: 20,
      borderRadius: 2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#4285F4',
    },
    googleG: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
    socialButtonText: { fontSize: 16, fontWeight: '500', color: '#3C4043' },
    // Apple button — uses native AppleAuthenticationButton for HIG compliance
    appleButton: { height: 52, marginBottom: 12 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
    footerText: { color: colors.textSecondary, fontSize: 14 },
    link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  });
}

export default function SignInScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ---- validation ----------------------------------------------------------

  function validateEmail(value: string): string {
    if (!value) return t('auth.validation.emailRequired');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t('auth.validation.emailInvalid');
    return '';
  }

  function validatePassword(value: string): string {
    if (!value) return t('auth.validation.passwordRequired');
    return '';
  }

  // ---- email sign-in -------------------------------------------------------

  async function handleSignIn() {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    setGeneralError('');

    if (eErr || pErr) return;

    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // AuthGate in _layout.tsx handles redirect
    } catch (err: any) {
      setGeneralError(mapFirebaseAuthError(err?.code ?? ''));
    } finally {
      setLoading(false);
    }
  }

  // ---- Google sign-in ------------------------------------------------------

  async function handleGoogleSignIn() {
    setGeneralError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // null = cancelled — AuthGate handles redirect on success
    } catch (err: any) {
      setGeneralError(mapFirebaseAuthError(err?.code ?? ''));
    } finally {
      setGoogleLoading(false);
    }
  }

  // ---- Apple sign-in -------------------------------------------------------

  async function handleAppleSignIn() {
    setGeneralError('');
    try {
      await signInWithApple();
      // null = cancelled — AuthGate handles redirect on success
    } catch (err: any) {
      setGeneralError(mapFirebaseAuthError(err?.code ?? ''));
    }
  }

  // ---- render --------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>Redeemy</Text>
          <Text style={styles.tagline}>{t('auth.tagline')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>{t('auth.signIn.title')}</Text>

          {/* Email field */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder={t('auth.email')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setEmailError('');
              }}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          {/* Password field */}
          <View style={styles.fieldContainer}>
            <View style={[styles.inputRow, passwordError ? styles.inputError : null]}>
              <TextInput
                style={styles.inputFlex}
                placeholder={t('auth.password')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setPasswordError('');
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          {/* General / Firebase error */}
          {generalError ? (
            <Text style={[styles.errorText, styles.generalError]}>{generalError}</Text>
          ) : null}

          {/* Primary: email sign-in */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading || googleLoading}
            accessibilityRole="button"
            accessibilityLabel={t('auth.signIn.button')}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.signIn.button')}</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.socialButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading || googleLoading}
            accessibilityRole="button"
            accessibilityLabel={t('auth.google')}
          >
            {googleLoading ? (
              <ActivityIndicator color="#3C4043" />
            ) : (
              <>
                <View style={styles.googleIconWrapper}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.socialButtonText}>{t('auth.google')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Apple Sign-In — iOS only */}
          {isAppleAuthAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={10}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          {/* Create account */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.signIn.noAccount')}</Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-up')}>
              <Text style={styles.link}>{t('auth.signIn.createLink')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
