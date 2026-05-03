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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { sendPasswordResetEmail, mapFirebaseAuthError } from '@/lib/auth';
import { useAppTheme, useIsDark } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

const logoLight = require('../../../assets/images/logo-light.png');
const logoDark = require('../../../assets/images/logo-dark.png');

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    backButton: { padding: 16, alignSelf: 'flex-start' },
    container: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 24, paddingTop: 32 },
    header: { alignItems: 'center', marginBottom: 32 },
    logoImage: { width: 72, height: 72, borderRadius: 16 },
    appName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginTop: 10 },
    form: { width: '100%' },
    title: { fontSize: 24, fontWeight: '600', color: colors.textPrimary, marginBottom: 8, alignSelf: 'flex-start' },
    description: { fontSize: 14, color: colors.textSecondary, marginBottom: 24, alignSelf: 'flex-start', lineHeight: 20, textAlign: 'left' },
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
    errorText: { fontSize: 12, color: colors.danger, marginTop: 4, marginBottom: 4, alignSelf: 'flex-start' },
    button: {
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    successContainer: { alignItems: 'center', gap: 16, paddingHorizontal: 8 },
    successIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + '25',
      justifyContent: 'center',
      alignItems: 'center',
    },
    successTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    successDescription: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    backLink: {
      height: 52,
      width: '100%',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
      backgroundColor: colors.primary,
    },
    backLinkText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  });
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isDark = useIsDark();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function validateEmail(value: string): string {
    if (!value.trim()) return t('auth.validation.emailRequired');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return t('auth.validation.emailInvalid');
    return '';
  }

  async function handleSubmit() {
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setLoading(true);
    try {
      await sendPasswordResetEmail(email.trim());
    } catch (e: any) {
      // auth/user-not-found: show success anyway for security
      const code = e?.code ?? '';
      if (code !== 'auth/user-not-found') {
        setEmailError(mapFirebaseAuthError(code));
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    setSent(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons
          name={isRTL ? 'arrow-forward' : 'arrow-back'}
          size={24}
          color={colors.textPrimary}
        />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {sent ? (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="mail-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.successTitle}>{t('auth.forgotPassword.successTitle')}</Text>
            <Text style={styles.successDescription}>{t('auth.forgotPassword.successDescription')}</Text>
            <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
              <Text style={styles.backLinkText}>{t('auth.forgotPassword.backToSignIn')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.title}>{t('auth.forgotPassword.title')}</Text>
            <Text style={styles.description}>{t('auth.forgotPassword.description')}</Text>

            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder={t('auth.email')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setEmailError('');
              }}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.forgotPassword.button')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
