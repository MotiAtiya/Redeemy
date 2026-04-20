import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFamilyStore } from '@/stores/familyStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  generateInviteCode,
  leaveFamily,
  removeMember,
  renameFamily,
  transferAdmin,
} from '@/lib/firestoreFamilies';
import { migrateCreditsFromFamily } from '@/lib/firestoreCredits';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FamilyRole, type FamilyMember } from '@/types/familyTypes';
import type { AppColors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Toast helper
// ---------------------------------------------------------------------------

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = setTimeout(() => setMessage(null), 2000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { toastMessage: message, showToast: show };
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: { padding: 4 },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
      marginEnd: 32, // compensate for back button width
    },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 20,
      marginStart: 4,
      alignSelf: 'flex-start',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    separator: { height: 1, backgroundColor: colors.separator, marginStart: 16 },
    // Invite code section
    inviteCardPadding: { padding: 16 },
    inviteCodeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 8,
    },
    inviteCode: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: 4,
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    copyButton: {
      padding: 8,
      backgroundColor: colors.primarySurface,
      borderRadius: 8,
    },
    countdownText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
    },
    regenerateButton: {
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    regenerateText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
    },
    generateNewButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignSelf: 'center',
    },
    generateNewText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    // Member row
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    memberAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#5F9E8F',
      justifyContent: 'center',
      alignItems: 'center',
    },
    memberInitial: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    memberNameWrapper: {
      flex: 1,
    },
    memberName: {
      fontSize: 15,
      color: colors.textPrimary,
      alignSelf: 'flex-start',
    },
    adminBadge: {
      backgroundColor: colors.primarySurface,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    adminBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
    memberActions: {
      flexDirection: 'row',
      gap: 4,
    },
    memberActionBtn: { padding: 6 },
    // Action rows
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    rowLabel: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' },
    // Danger row (sign-out / leave style)
    dangerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
    },
    dangerText: { fontSize: 15, fontWeight: '600', color: colors.danger },
    // Bottom sheet (same pattern as account.tsx)
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.separator,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
      alignSelf: 'flex-start',
    },
    sheetInput: {
      height: 52,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 10,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      textAlign: isRTL ? 'right' : 'left',
      marginBottom: 8,
    },
    sheetButton: {
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    sheetButtonDisabled: { opacity: 0.7 },
    sheetButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    // Loading state
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    // Toast
    toast: {
      position: 'absolute',
      bottom: 48,
      alignSelf: 'center',
      backgroundColor: 'rgba(15,23,42,0.85)',
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FamilyManageScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const { t } = useTranslation();
  const { toastMessage, showToast } = useToast();

  const { created } = useLocalSearchParams<{ created?: string }>();
  const family = useFamilyStore((s) => s.family);
  const currentUser = useAuthStore((s) => s.currentUser);
  const setFamilyId = useSettingsStore((s) => s.setFamilyId);
  const setFamilyCreditsMigrated = useSettingsStore((s) => s.setFamilyCreditsMigrated);

  const isAdmin = family?.adminId === currentUser?.uid;

  // Invite code countdown
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Rename sheet
  const [showRenameSheet, setShowRenameSheet] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);

  // Action loading
  const [isLeaving, setIsLeaving] = useState(false);
  const [removingUid, setRemovingUid] = useState<string | null>(null);

  // Show "Family created!" toast on first open
  useEffect(() => {
    if (created === '1') showToast(t('family.createScreen.successToast'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync countdown when invite code expiry changes
  useEffect(() => {
    if (!family) return;
    const remaining = Math.max(0, Math.floor((family.inviteCodeExpiresAt.getTime() - Date.now()) / 1000));
    setSecondsLeft(remaining);
  }, [family?.inviteCodeExpiresAt]);

  // Tick every second
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(timer); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft > 0]);

  // ---------------------------------------------------------------------------
  // Invite code handlers
  // ---------------------------------------------------------------------------

  async function handleCopyCode() {
    if (!family || secondsLeft <= 0) return;
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(family.inviteCode);
      showToast(t('family.manageScreen.inviteCopiedToast'));
    } catch {
      showToast(family.inviteCode);
    }
  }

  async function handleRegenerate() {
    if (!family || isRegenerating) return;
    setIsRegenerating(true);
    try {
      const { expiresAt } = await generateInviteCode(family.id);
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
    } catch {
      Alert.alert(t('common.error'), t('family.errors.generateFailed'));
    } finally {
      setIsRegenerating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Rename handlers
  // ---------------------------------------------------------------------------

  function openRenameSheet() {
    if (!family) return;
    setRenameValue(family.name);
    setShowRenameSheet(true);
  }

  async function handleSaveRename() {
    if (!family || !renameValue.trim()) return;
    if (renameValue.trim() === family.name) { setShowRenameSheet(false); return; }
    setIsSavingRename(true);
    try {
      await renameFamily(family.id, renameValue.trim());
      setShowRenameSheet(false);
    } catch {
      Alert.alert(t('common.error'), t('family.errors.renameFailed'));
    } finally {
      setIsSavingRename(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Transfer admin handler
  // ---------------------------------------------------------------------------

  function handleTransferAdmin() {
    if (!family) return;
    const candidates = family.memberList.filter((m) => m.userId !== currentUser?.uid);
    if (candidates.length === 0) return;

    const buttons = candidates.map((m) => ({
      text: m.displayName,
      onPress: async () => {
        try {
          await transferAdmin(family.id, m.userId);
        } catch {
          Alert.alert(t('common.error'), t('family.errors.transferAdminFailed'));
        }
      },
    }));

    Alert.alert(
      t('family.manageScreen.transferAdminTitle'),
      t('family.manageScreen.transferAdminMessage'),
      [...buttons, { text: t('common.cancel'), style: 'cancel' as const }]
    );
  }

  // ---------------------------------------------------------------------------
  // Remove member handler
  // ---------------------------------------------------------------------------

  function handleRemoveMember(member: FamilyMember) {
    if (!family) return;
    Alert.alert(
      t('family.manageScreen.removeConfirmTitle', { name: member.displayName }),
      t('family.manageScreen.removeConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('family.manageScreen.removeConfirmAction'),
          style: 'destructive',
          onPress: async () => {
            setRemovingUid(member.userId);
            try {
              await migrateCreditsFromFamily(member.userId);
              await removeMember(family.id, member.userId);
            } catch {
              Alert.alert(t('common.error'), t('family.errors.removeFailed'));
            } finally {
              setRemovingUid(null);
            }
          },
        },
      ]
    );
  }

  // ---------------------------------------------------------------------------
  // Leave family handler
  // ---------------------------------------------------------------------------

  function handleLeave() {
    if (!family || !currentUser) return;
    Alert.alert(
      t('family.manageScreen.leaveConfirmTitle', { name: family.name }),
      t('family.manageScreen.leaveConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('family.manageScreen.leaveConfirmAction'),
          style: 'destructive',
          onPress: async () => {
            setIsLeaving(true);
            try {
              await migrateCreditsFromFamily(currentUser.uid);
              await leaveFamily(family.id, currentUser.uid);
              setFamilyId(null);
              setFamilyCreditsMigrated(false);
              router.replace('/(tabs)');
            } catch {
              Alert.alert(t('common.error'), t('family.errors.leaveFailed'));
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const formattedCountdown = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const isExpired = secondsLeft <= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        {family ? (
          <Text style={styles.headerTitle} numberOfLines={1}>{family.name}</Text>
        ) : null}
      </View>

      {!family ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Invite Code section */}
          <Text style={styles.sectionLabel}>{t('family.manageScreen.inviteSection')}</Text>
          <View style={styles.card}>
            <View style={styles.inviteCardPadding}>
              {isExpired ? (
                /* Expired: just show generate button */
                <TouchableOpacity
                  style={styles.generateNewButton}
                  onPress={handleRegenerate}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.generateNewText}>{t('family.manageScreen.inviteGenerateNew')}</Text>
                  )}
                </TouchableOpacity>
              ) : (
                /* Active: show code + countdown + actions */
                <>
                  <View style={styles.inviteCodeRow}>
                    <Text style={styles.inviteCode}>{family.inviteCode}</Text>
                    <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                      <Ionicons name="copy-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.countdownText}>
                    {t('family.manageScreen.inviteExpires', { time: formattedCountdown })}
                  </Text>
                  <TouchableOpacity style={styles.regenerateButton} onPress={handleRegenerate} disabled={isRegenerating}>
                    {isRegenerating ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <Text style={styles.regenerateText}>{t('family.manageScreen.inviteRegenerate')}</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Members section */}
          <Text style={styles.sectionLabel}>{t('family.manageScreen.membersSection')}</Text>
          <View style={styles.card}>
            {family.memberList.map((member: FamilyMember, index: number) => {
              const isCurrentUser = member.userId === currentUser?.uid;
              const isMemberAdmin = member.role === FamilyRole.ADMIN;
              const showAdminActions = isAdmin && !isCurrentUser && !isMemberAdmin;

              return (
                <View key={member.userId}>
                  {index > 0 && <View style={styles.separator} />}
                  <View style={styles.memberRow}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberInitial}>
                        {member.displayName[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={styles.memberNameWrapper}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {member.displayName}
                      </Text>
                    </View>
                    {isMemberAdmin && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>
                          {t('family.manageScreen.adminBadge')}
                        </Text>
                      </View>
                    )}
                    {showAdminActions && (
                      <View style={styles.memberActions}>
                        {removingUid === member.userId ? (
                          <ActivityIndicator size="small" color={colors.textTertiary} />
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.memberActionBtn}
                              onPress={() => {
                                Alert.alert(
                                  t('family.manageScreen.transferAdminTitle'),
                                  `${t('family.manageScreen.transferAdminConfirm')} ${member.displayName}?`,
                                  [
                                    { text: t('common.cancel'), style: 'cancel' },
                                    {
                                      text: t('family.manageScreen.transferAdminConfirm'),
                                      onPress: async () => {
                                        try {
                                          await transferAdmin(family.id, member.userId);
                                        } catch {
                                          Alert.alert(t('common.error'), t('family.errors.transferAdminFailed'));
                                        }
                                      },
                                    },
                                  ]
                                );
                              }}
                              hitSlop={8}
                            >
                              <Ionicons name="shield-outline" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.memberActionBtn}
                              onPress={() => handleRemoveMember(member)}
                              hitSlop={8}
                            >
                              <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Admin actions */}
          {isAdmin && (
            <>
              <Text style={styles.sectionLabel}>{t('family.manageScreen.actionsSection')}</Text>
              <View style={styles.card}>
                <TouchableOpacity style={styles.row} onPress={openRenameSheet}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{t('family.manageScreen.renameButton')}</Text>
                  </View>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
                </TouchableOpacity>
                {family.memberList.length > 1 && (
                  <>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.row} onPress={handleTransferAdmin}>
                      <Ionicons name="shield-outline" size={20} color={colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowLabel}>{t('family.manageScreen.transferAdminButton')}</Text>
                      </View>
                      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}

          {/* Leave family — same dangerRow style as sign-out in account.tsx */}
          <View style={[styles.card, { marginTop: 28 }]}>
            <TouchableOpacity
              style={styles.dangerRow}
              onPress={handleLeave}
              disabled={isLeaving}
              accessibilityRole="button"
            >
              {isLeaving ? (
                <ActivityIndicator color={colors.danger} size="small" />
              ) : (
                <>
                  <Ionicons name="exit-outline" size={20} color={colors.danger} />
                  <Text style={styles.dangerText}>{t('family.manageScreen.leaveButton')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}

      {/* Toast */}
      {toastMessage ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Rename bottom sheet */}
      <Modal
        visible={showRenameSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRenameSheet(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowRenameSheet(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('family.manageScreen.renameButton')}</Text>
            <TextInput
              style={styles.sheetInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder={t('family.createScreen.namePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              maxLength={40}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSaveRename}
            />
            <TouchableOpacity
              style={[styles.sheetButton, isSavingRename && styles.sheetButtonDisabled]}
              onPress={handleSaveRename}
              disabled={isSavingRename}
            >
              {isSavingRename ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.sheetButtonText}>{t('more.editName.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
