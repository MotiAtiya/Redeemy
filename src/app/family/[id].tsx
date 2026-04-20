import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
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
    headerEditButton: { padding: 4, marginStart: 4 },
    headerRenameInput: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
      paddingBottom: 2,
    },
    headerRenameActions: {
      flexDirection: 'row',
      gap: 4,
    },
    headerActionBtn: { padding: 6 },
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
    inviteCodeExpired: {
      fontSize: 28,
      fontWeight: '300',
      color: colors.textTertiary,
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
    countdownExpired: {
      fontSize: 13,
      color: colors.danger,
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
      marginTop: 4,
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
    memberName: {
      flex: 1,
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
    // Action rows card
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    actionRowText: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
    },
    // Leave button
    leaveButton: {
      marginTop: 28,
      marginHorizontal: 0,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: `${colors.danger}18`,
    },
    leaveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.danger,
    },
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
    toastText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '500',
    },
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FamilyManageScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
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

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<TextInput>(null);

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

  function startRename() {
    if (!family) return;
    setRenameValue(family.name);
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  }

  function cancelRename() {
    setIsRenaming(false);
    setRenameValue('');
  }

  async function confirmRename() {
    if (!family || !renameValue.trim() || renameValue.trim() === family.name) {
      cancelRename();
      return;
    }
    try {
      await renameFamily(family.id, renameValue.trim());
      setIsRenaming(false);
    } catch {
      Alert.alert(t('common.error'), t('family.errors.renameFailed'));
    }
  }

  // ---------------------------------------------------------------------------
  // Transfer admin handler
  // ---------------------------------------------------------------------------

  function handleTransferAdmin() {
    if (!family) return;
    const candidates = family.memberList.filter(
      (m) => m.userId !== currentUser?.uid
    );
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
              // Migrate credits first (while admin is still a member)
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
  // Render helpers
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
          isRenaming ? (
            <>
              <TextInput
                ref={renameInputRef}
                style={styles.headerRenameInput}
                value={renameValue}
                onChangeText={setRenameValue}
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={confirmRename}
                autoCapitalize="words"
              />
              <View style={styles.headerRenameActions}>
                <TouchableOpacity style={styles.headerActionBtn} onPress={confirmRename} hitSlop={8}>
                  <Ionicons name="checkmark" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn} onPress={cancelRename} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.headerTitle} numberOfLines={1}>{family.name}</Text>
              {isAdmin && (
                <TouchableOpacity style={styles.headerEditButton} onPress={startRename} hitSlop={8}>
                  <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </>
          )
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
              <View style={styles.inviteCodeRow}>
                {isExpired ? (
                  <Text style={styles.inviteCodeExpired}>—</Text>
                ) : (
                  <>
                    <Text style={styles.inviteCode}>{family.inviteCode}</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={handleCopyCode}
                      accessibilityRole="button"
                    >
                      <Ionicons name="copy-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {isExpired ? (
                <Text style={styles.countdownExpired}>{t('family.manageScreen.inviteExpired')}</Text>
              ) : (
                <Text style={styles.countdownText}>
                  {t('family.manageScreen.inviteExpires', { time: formattedCountdown })}
                </Text>
              )}

              {isExpired ? (
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
                <TouchableOpacity
                  style={styles.regenerateButton}
                  onPress={handleRegenerate}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Text style={styles.regenerateText}>{t('family.manageScreen.inviteRegenerate')}</Text>
                  )}
                </TouchableOpacity>
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
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.displayName}
                    </Text>
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
                            {/* Transfer admin */}
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
                              accessibilityRole="button"
                            >
                              <Ionicons name="shield-outline" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                            {/* Remove member */}
                            <TouchableOpacity
                              style={styles.memberActionBtn}
                              onPress={() => handleRemoveMember(member)}
                              hitSlop={8}
                              accessibilityRole="button"
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

          {/* Admin actions (rename + transfer admin) */}
          {isAdmin && (
            <>
              <Text style={styles.sectionLabel}>{t('family.manageScreen.actionsSection')}</Text>
              <View style={styles.card}>
                <TouchableOpacity style={styles.actionRow} onPress={startRename}>
                  <Ionicons name="pencil-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.actionRowText}>{t('family.manageScreen.renameButton')}</Text>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={16}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
                {family.memberList.length > 1 && (
                  <>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.actionRow} onPress={handleTransferAdmin}>
                      <Ionicons name="shield-outline" size={20} color={colors.textSecondary} />
                      <Text style={styles.actionRowText}>{t('family.manageScreen.transferAdminButton')}</Text>
                      <Ionicons
                        name={isRTL ? 'chevron-back' : 'chevron-forward'}
                        size={16}
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}

          {/* Leave family */}
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={handleLeave}
            disabled={isLeaving}
            accessibilityRole="button"
          >
            {isLeaving ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <Text style={styles.leaveButtonText}>{t('family.manageScreen.leaveButton')}</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* Toast */}
      {toastMessage ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
