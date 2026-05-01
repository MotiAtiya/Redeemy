import { useState, useMemo, useRef, useEffect } from 'react';
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
import { createFamily } from '@/lib/firestoreFamilies';
import { migrateCreditsToFamily } from '@/lib/firestoreCredits';
import { migrateSubscriptionsToFamily } from '@/lib/firestoreSubscriptions';
import { migrateWarrantiesToFamily } from '@/lib/firestoreWarranties';
import { migrateOccasionsToFamily } from '@/lib/firestoreOccasions';
import { migrateDocumentsToFamily } from '@/lib/firestoreDocuments';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

function makeStyles(colors: AppColors, isRTL: boolean) {
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
      flexShrink: 1,
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 24,
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: 20,
      textAlign: 'left',
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 8,
      marginStart: 4,
      alignSelf: 'flex-start',
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.separator,
      textAlign: isRTL ? 'right' : 'left',
      letterSpacing: 0,
    },
    inputError: {
      borderColor: colors.danger,
    },
    errorText: {
      fontSize: 13,
      color: colors.danger,
      marginTop: 6,
      marginStart: 4,
      alignSelf: 'flex-start',
    },
    createButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    createButtonDisabled: {
      opacity: 0.45,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
}

export default function CreateFamilyScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const { t } = useTranslation();

  const currentUser = useAuthStore((s) => s.currentUser);
  const setFamilyId = useSettingsStore((s) => s.setFamilyId);

  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus on mount
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || !currentUser) return;

    setIsLoading(true);
    setError(null);

    try {
      const familyId = await createFamily(trimmed, currentUser);
      const displayName = currentUser.displayName ?? currentUser.email?.split('@')[0] ?? 'Member';
      await Promise.all([
        migrateCreditsToFamily(currentUser.uid, familyId, displayName),
        migrateSubscriptionsToFamily(currentUser.uid, familyId, displayName),
        migrateWarrantiesToFamily(currentUser.uid, familyId, displayName),
        migrateOccasionsToFamily(currentUser.uid, familyId, displayName),
        migrateDocumentsToFamily(currentUser.uid, familyId, displayName),
      ]);
      setFamilyId(familyId);
      router.replace(`/family/${familyId}?created=1`);
    } catch (err) {
      setError((err as Error).message ?? t('family.errors.createFailed'));
      setIsLoading(false);
    }
  }

  const canCreate = name.trim().length > 0 && !isLoading;

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
          <Text style={styles.headerTitle}>{t('family.createScreen.title')}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>{t('family.createScreen.description')}</Text>
          <Text style={styles.label}>{t('family.createScreen.namePlaceholder')}</Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, error ? styles.inputError : null]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError(null);
            }}
            placeholder={t('family.createScreen.nameHelper')}
            placeholderTextColor={colors.textTertiary}
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={canCreate ? handleCreate : undefined}
            editable={!isLoading}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.createButton, !canCreate ? styles.createButtonDisabled : null]}
            onPress={handleCreate}
            disabled={!canCreate}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canCreate }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.createButtonText}>{t('family.createScreen.createButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
