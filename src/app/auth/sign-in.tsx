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
  I18nManager,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
import { Image } from 'expo-image';
import { useAppTheme, useIsDark } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

const logoLight = require('../../../assets/images/logo-light.png');
const logoDark = require('../../../assets/images/logo-dark.png');

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    logoImage: { width: 90, height: 90, borderRadius: 20 },
    appName: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, marginTop: 12 },
    tagline: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    form: { width: '100%' },
    title: { fontSize: 24, fontWeight: '600', color: colors.textPrimary, marginBottom: 24, alignSelf: 'flex-start' },
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
      textAlign: isRTL ? 'right' : 'left',
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
    inputFlex: { flex: 1, fontSize: 16, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
    errorText: { fontSize: 12, color: colors.danger, marginTop: 4, alignSelf: 'flex-start' },
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
    socialButton: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 10,
      backgroundColor: colors.surface,
      gap: 12,
      marginBottom: 12,
    },
    googleLogo: { width: 20, height: 20 },
    socialButtonText: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 4 },
    footerText: { color: colors.textSecondary, fontSize: 14 },
    link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  });
}

export default function SignInScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isDark = useIsDark();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

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
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (err: any) {
      console.error('Apple Sign-In error:', err);
      setGeneralError(mapFirebaseAuthError(err?.code ?? ''));
    } finally {
      setAppleLoading(false);
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
          <Image
            source={isDark ? logoDark : logoLight}
            style={styles.logoImage}
            contentFit="contain"
          />
          <Text style={styles.appName}>Redeemy</Text>
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
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
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
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <Svg viewBox="0 0 24 24" style={styles.googleLogo}>
                  <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </Svg>
                <Text style={styles.socialButtonText}>{t('auth.google')}</Text>
              </>
            )}
          </TouchableOpacity>


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
