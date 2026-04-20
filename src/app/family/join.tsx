import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { joinFamily, type JoinFamilyError } from '@/lib/firestoreFamilies';
import { migrateCreditsToFamily } from '@/lib/firestoreCredits';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    keyboardAvoid: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    backButton: { padding: 4 },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
      alignSelf: 'flex-start',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 24,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 24,
      alignSelf: 'flex-start',
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 12,
      marginStart: 4,
      alignSelf: 'flex-start',
    },
    codeInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 18,
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: 8,
      writingDirection: 'ltr',
      textAlign: 'center',
      borderWidth: 1,
      borderColor: colors.separator,
    },
    codeInputError: {
      borderColor: colors.danger,
    },
    errorText: {
      fontSize: 13,
      color: colors.danger,
      marginTop: 10,
      textAlign: 'center',
      alignSelf: 'center',
    },
    joinButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    joinButtonDisabled: {
      opacity: 0.45,
    },
    joinButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
}

const JOIN_ERRORS: Record<JoinFamilyError, string> = {
  'invalid-code': 'family.join.errors.invalidCode',
  'expired-code': 'family.join.errors.expiredCode',
  'family-full': 'family.join.errors.familyFull',
  'already-in-family': 'family.join.errors.alreadyInFamily',
  'network-error': 'family.join.errors.networkError',
};

export default function JoinFamilyScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const currentUser = useAuthStore((s) => s.currentUser);
  const setFamilyId = useSettingsStore((s) => s.setFamilyId);

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  function handleChangeCode(text: string) {
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(clean);
    if (error) setError(null);
  }

  async function handleJoin() {
    const trimmed = code.trim();
    if (trimmed.length !== 6 || !currentUser) return;

    setIsLoading(true);
    setError(null);

    try {
      const familyId = await joinFamily(trimmed, currentUser);
      // Migrate existing credits to family
      const displayName = currentUser.displayName ?? currentUser.email?.split('@')[0] ?? 'Member';
      await migrateCreditsToFamily(currentUser.uid, familyId, displayName);
      // Persist familyId (triggers useFamilyListener + credits re-subscription)
      setFamilyId(familyId);
      router.replace('/(tabs)');
    } catch (err) {
      const errorKey = JOIN_ERRORS[err as JoinFamilyError] ?? 'family.join.errors.networkError';
      setError(t(errorKey));
      setIsLoading(false);
    }
  }

  const canJoin = code.length === 6 && !isLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            hitSlop={8}
          >
            <Ionicons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('family.join.title')}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>{t('family.join.subtitle')}</Text>

          <Text style={styles.label}>{t('family.join.codeLabel')}</Text>
          <TextInput
            ref={inputRef}
            style={[styles.codeInput, error ? styles.codeInputError : null]}
            value={code}
            onChangeText={handleChangeCode}
            placeholder="ABC123"
            placeholderTextColor={colors.textTertiary}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={canJoin ? handleJoin : undefined}
            editable={!isLoading}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.joinButton, !canJoin ? styles.joinButtonDisabled : null]}
            onPress={handleJoin}
            disabled={!canJoin}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canJoin }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.joinButtonText}>{t('family.join.button')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
