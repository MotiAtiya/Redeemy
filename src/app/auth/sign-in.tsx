import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  isAppleAuthAvailable,
  mapFirebaseAuthError,
} from '@/lib/auth';
import { SAGE_TEAL } from '@/components/ui/theme';

export default function SignInScreen() {
  const router = useRouter();

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
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email';
    return '';
  }

  function validatePassword(value: string): string {
    if (!value) return 'Password is required';
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
          <Text style={styles.tagline}>Your gift credits, organized.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Sign in</Text>

          {/* Email field */}
          <View style={styles.fieldContainer}>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="Email"
              placeholderTextColor="#9E9E9E"
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
                placeholder="Password"
                placeholderTextColor="#9E9E9E"
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
                  color="#9E9E9E"
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
            accessibilityLabel="Sign in"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.socialButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading || googleLoading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            {googleLoading ? (
              <ActivityIndicator color="#3C4043" />
            ) : (
              <>
                {/* Google "G" logo — inline SVG-safe colored circles via emoji/text */}
                <View style={styles.googleIconWrapper}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Apple Sign-In — iOS only */}
          {isAppleAuthAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={10}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          {/* Create account */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-up')}>
              <Text style={styles.link}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: {
    fontSize: 34,
    fontWeight: '700',
    color: SAGE_TEAL,
    letterSpacing: -0.5,
  },
  tagline: { fontSize: 14, color: '#757575', marginTop: 4 },
  form: { width: '100%' },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 24,
  },
  fieldContainer: { marginBottom: 16 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#212121',
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#D32F2F' },
  inputRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
  },
  inputFlex: { flex: 1, fontSize: 16, color: '#212121' },
  errorText: { fontSize: 12, color: '#D32F2F', marginTop: 4 },
  generalError: { marginBottom: 8, textAlign: 'center' },
  button: {
    height: 52,
    backgroundColor: SAGE_TEAL,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { fontSize: 13, color: '#9E9E9E' },
  // Google button — follows Google branding guidelines (white bg, border, colored G)
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
  googleG: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3C4043',
  },
  // Apple button — uses native AppleAuthenticationButton for HIG compliance
  appleButton: {
    height: 52,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  footerText: { color: '#757575', fontSize: 14 },
  link: { color: SAGE_TEAL, fontSize: 14, fontWeight: '600' },
});
