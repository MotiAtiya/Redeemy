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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { registerWithEmail, mapFirebaseAuthError } from '@/lib/auth';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------

type StrengthLevel = 'weak' | 'medium' | 'strong';

function getPasswordStrength(password: string): StrengthLevel {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

const STRENGTH_COLOR: Record<StrengthLevel, string> = {
  weak: '#D32F2F',
  medium: '#F9A825',
  strong: '#388E3C',
};

const STRENGTH_LABEL: Record<StrengthLevel, string> = {
  weak: 'Weak',
  medium: 'Medium',
  strong: 'Strong',
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
    back: { marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 32 },
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
    strengthContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
    strengthBars: { flex: 1, flexDirection: 'row', gap: 4 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 12, fontWeight: '600', minWidth: 46 },
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
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { color: colors.textSecondary, fontSize: 14 },
    link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SignUpScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = password.length > 0 ? getPasswordStrength(password) : null;

  // ---- validation ----------------------------------------------------------

  function validateEmail(value: string): string {
    if (!value) return 'Email is required';
    if (
      !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value)
    ) {
      return 'Enter a valid email address';
    }
    return '';
  }

  function validatePassword(value: string): string {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Must contain an uppercase letter';
    if (!/[0-9]/.test(value)) return 'Must contain a number';
    if (!/[^A-Za-z0-9]/.test(value)) return 'Must contain a special character';
    return '';
  }

  function validateConfirm(value: string): string {
    if (!value) return 'Please confirm your password';
    if (value !== password) return 'Passwords do not match';
    return '';
  }

  // ---- submit --------------------------------------------------------------

  async function handleCreateAccount() {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = validateConfirm(confirmPassword);
    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmError(cErr);
    setGeneralError('');

    if (eErr || pErr || cErr) return;

    setLoading(true);
    try {
      await registerWithEmail(email.trim(), password);
      // AuthGate in _layout.tsx handles redirect once auth state updates
    } catch (err: any) {
      setGeneralError(mapFirebaseAuthError(err?.code ?? ''));
    } finally {
      setLoading(false);
    }
  }

  // ---- render --------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity
            style={styles.back}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Redeemy to track your gift credits</Text>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="Email"
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

          {/* Password */}
          <View style={styles.fieldContainer}>
            <View style={[styles.inputRow, passwordError ? styles.inputError : null]}>
              <TextInput
                style={styles.inputFlex}
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                returnKeyType="next"
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

            {/* Strength indicator */}
            {strength && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {(['weak', 'medium', 'strong'] as StrengthLevel[]).map((level, i) => {
                    const levelIndex = { weak: 0, medium: 1, strong: 2 };
                    const isActive = levelIndex[strength] >= i;
                    return (
                      <View
                        key={level}
                        style={[
                          styles.strengthBar,
                          { backgroundColor: isActive ? STRENGTH_COLOR[strength] : colors.separator },
                        ]}
                      />
                    );
                  })}
                </View>
                <Text style={[styles.strengthLabel, { color: STRENGTH_COLOR[strength] }]}>
                  {STRENGTH_LABEL[strength]}
                </Text>
              </View>
            )}

            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          {/* Confirm password */}
          <View style={styles.fieldContainer}>
            <View style={[styles.inputRow, confirmError ? styles.inputError : null]}>
              <TextInput
                style={styles.inputFlex}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleCreateAccount}
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setConfirmError('');
                }}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((s) => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
            {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
          </View>

          {/* General / Firebase error */}
          {generalError ? (
            <Text style={[styles.errorText, styles.generalError]}>{generalError}</Text>
          ) : null}

          {/* Primary action */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateAccount}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Create Account"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Sign-in link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.link}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
