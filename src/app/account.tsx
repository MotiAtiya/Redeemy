import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isEmailUser, updateDisplayName, changePassword, reauthenticateForDeletion, deleteAccount, signOut } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFamilyStore } from '@/stores/familyStore';
import { deleteAllUserData, clearAllLocalStores } from '@/lib/userDataCleanup';
import { cancelAllNotifications } from '@/lib/notifications';
import { leaveFamily } from '@/lib/firestoreFamilies';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getInitials } from '@/lib/initials';
import { getAvatarColor } from '@/lib/avatarColor';
import type { AppColors } from '@/constants/colors';

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 16, paddingBottom: 32 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 8,
    },
    headerTitle: {
      flexShrink: 1,
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    // Avatar card
    avatarCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      alignItems: 'center',
      padding: 24,
      marginBottom: 20,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatarInitial: { fontSize: 30, fontWeight: '700', color: '#FFFFFF' },
    displayName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
    email: { fontSize: 14, color: colors.textSecondary },
    // Section
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginStart: 4,
      alignSelf: 'flex-start',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    rowLabel: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' },
    separator: { height: 1, backgroundColor: colors.separator, marginStart: 16 },
    // Bottom sheet
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
    sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 16, alignSelf: 'flex-start' },
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
    sheetInputError: { borderColor: colors.danger },
    sheetErrorText: { fontSize: 12, color: colors.danger, marginBottom: 12, alignSelf: 'flex-start' },
    inputRow: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      marginBottom: 8,
    },
    inputRowError: { borderColor: colors.danger },
    inputFlex: { flex: 1, fontSize: 16, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
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
    dangerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
    },
    dangerText: { fontSize: 15, fontWeight: '600', color: colors.danger },
  });
}

export default function AccountScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const { t } = useTranslation();

  const currentUser = useAuthStore((s) => s.currentUser);
  const emailUser = isEmailUser();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingData, setDeletingData] = useState(false);

  // Edit name sheet
  const [showEditNameSheet, setShowEditNameSheet] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newDisplayNameError, setNewDisplayNameError] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Delete account sheet (email users need password confirmation)
  const [showDeleteAccountSheet, setShowDeleteAccountSheet] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [showDeletePwd, setShowDeletePwd] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Change password sheet
  const [showChangePasswordSheet, setShowChangePasswordSheet] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  function openDeleteAccountSheet() {
    setDeletePassword('');
    setDeletePasswordError('');
    setShowDeletePwd(false);
    setShowDeleteAccountSheet(true);
  }

  async function performAccountDeletion(password?: string) {
    const uid = currentUser?.uid;
    if (!uid) return;

    setDeletingAccount(true);
    try {
      // Step 1: Reauthenticate FIRST — throws immediately if password is wrong.
      // No data is touched until this succeeds.
      await reauthenticateForDeletion(password);

      // Step 2: Delete all user data only after successful authentication.
      const familyId = useSettingsStore.getState().familyId;
      if (familyId) {
        await leaveFamily(familyId, uid).catch(() => { /* silent */ });
      }
      await deleteAllUserData(uid);

      // Step 3: Delete Firebase Auth user + Firestore user doc.
      await deleteAccount();

      // Step 4: Clear all local stores.
      clearAllLocalStores();
    } catch (err: any) {
      setDeletingAccount(false);
      const code = err?.code ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeletePasswordError(t('account.deleteAccount.wrongPassword'));
      } else {
        Alert.alert(t('common.error'), t('account.deleteAccount.error'));
        setShowDeleteAccountSheet(false);
      }
    }
  }

  function handleDeleteAllData() {
    Alert.alert(t('more.deleteData.title'), t('more.deleteData.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('more.deleteData.confirm'),
        style: 'destructive',
        onPress: async () => {
          if (!currentUser?.uid) return;
          setDeletingData(true);
          try {
            await cancelAllNotifications();
            await deleteAllUserData(currentUser.uid);
            clearAllLocalStores();
            setDeletingData(false);
            Alert.alert(t('more.deleteData.successTitle'), t('more.deleteData.successMessage'));
          } catch {
            setDeletingData(false);
            Alert.alert(t('common.error'), t('more.deleteData.error'));
          }
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    if (emailUser) {
      openDeleteAccountSheet();
    } else {
      Alert.alert(
        t('account.deleteAccount.reauthTitle'),
        t('account.deleteAccount.reauthMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('account.deleteAccount.confirm'),
            style: 'destructive',
            onPress: () => performAccountDeletion(),
          },
        ]
      );
    }
  }

  async function handleConfirmDeleteWithPassword() {
    if (!deletePassword) {
      setDeletePasswordError(t('account.deleteAccount.passwordRequired'));
      return;
    }
    await performAccountDeletion(deletePassword);
  }

  function handleSignOut() {
    Alert.alert(t('more.signOut.title'), t('more.signOut.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('more.signOut.button'),
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            clearAllLocalStores();
            await signOut();
          } catch {
            setSigningOut(false);
            Alert.alert(t('common.error'), t('more.signOut.error'));
          }
        },
      },
    ]);
  }

  function openEditNameSheet() {
    setNewDisplayName(currentUser?.displayName ?? '');
    setNewDisplayNameError('');
    setShowEditNameSheet(true);
  }

  async function handleSaveName() {
    const trimmed = newDisplayName.trim();
    if (!trimmed) {
      setNewDisplayNameError(t('auth.validation.displayNameRequired'));
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(trimmed);
      useAuthStore.getState().setCurrentUser({ ...currentUser!, displayName: trimmed });
      setShowEditNameSheet(false);
    } catch {
      setNewDisplayNameError(t('common.error'));
    } finally {
      setSavingName(false);
    }
  }

  function openChangePasswordSheet() {
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setShowCurrentPwd(false);
    setShowNewPwd(false);
    setShowConfirmPwd(false);
    setShowChangePasswordSheet(true);
  }

  async function handleSavePassword() {
    let hasError = false;
    if (!currentPasswordInput) {
      setCurrentPasswordError(t('more.changePassword.currentRequired'));
      hasError = true;
    }
    if (!newPasswordInput || newPasswordInput.length < 8) {
      setNewPasswordError(t('auth.validation.passwordMin'));
      hasError = true;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setConfirmPasswordError(t('auth.validation.passwordMismatch'));
      hasError = true;
    }
    if (hasError) return;

    setSavingPassword(true);
    try {
      await changePassword(currentPasswordInput, newPasswordInput);
      setShowChangePasswordSheet(false);
      Alert.alert(t('more.changePassword.successTitle'), t('more.changePassword.successMessage'));
    } catch (err: any) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setCurrentPasswordError(t('more.changePassword.wrongPassword'));
      } else {
        setCurrentPasswordError(t('common.error'));
      }
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('account.title')}</Text>
        </View>

        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(currentUser?.uid) }]}>
            <Text style={styles.avatarInitial}>
              {currentUser?.displayName
                ? getInitials(currentUser.displayName)
                : currentUser?.email?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          {currentUser?.displayName ? (
            <Text style={styles.displayName}>{currentUser.displayName}</Text>
          ) : null}
          <Text style={styles.email}>{currentUser?.email ?? ''}</Text>
        </View>

        {/* Account actions */}
        <Text style={styles.sectionLabel}>{t('more.sections.account')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={openEditNameSheet} accessibilityRole="button">
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t('more.editName.label')}</Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {emailUser && (
            <>
              <View style={styles.separator} />
              <TouchableOpacity style={styles.row} onPress={openChangePasswordSheet} accessibilityRole="button">
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('more.changePassword.label')}</Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </>
          )}
        </View>
        {/* Sign out */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.dangerRow}
            onPress={handleSignOut}
            disabled={signingOut}
            accessibilityRole="button"
          >
            {signingOut ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                <Text style={styles.dangerText}>{t('more.signOut.button')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Delete all data + Delete account */}
        <Text style={styles.sectionLabel}>{t('more.deleteData.sectionLabel')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.dangerRow}
            onPress={handleDeleteAllData}
            disabled={deletingData || signingOut}
            accessibilityRole="button"
          >
            {deletingData ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={styles.dangerText}>{t('more.deleteData.button')}</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.dangerRow}
            onPress={handleDeleteAccount}
            disabled={deletingAccount || signingOut || deletingData}
            accessibilityRole="button"
          >
            {deletingAccount ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <>
                <Ionicons name="person-remove-outline" size={20} color={colors.danger} />
                <Text style={styles.dangerText}>{t('account.deleteAccount.button')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Edit name bottom sheet */}
      <Modal
        visible={showEditNameSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditNameSheet(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowEditNameSheet(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('more.editName.title')}</Text>
            <TextInput
              style={[styles.sheetInput, newDisplayNameError ? styles.sheetInputError : null]}
              value={newDisplayName}
              onChangeText={(v) => { setNewDisplayName(v); setNewDisplayNameError(''); }}
              placeholder={t('auth.displayName')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            {newDisplayNameError ? <Text style={styles.sheetErrorText}>{newDisplayNameError}</Text> : null}
            <TouchableOpacity
              style={[styles.sheetButton, savingName && styles.sheetButtonDisabled]}
              onPress={handleSaveName}
              disabled={savingName}
            >
              {savingName ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sheetButtonText}>{t('more.editName.save')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete account bottom sheet (email users only) */}
      <Modal
        visible={showDeleteAccountSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteAccountSheet(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowDeleteAccountSheet(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('account.deleteAccount.passwordTitle')}</Text>
            <Text style={[styles.sheetErrorText, { color: colors.textSecondary, marginBottom: 16 }]}>
              {t('account.deleteAccount.passwordMessage')}
            </Text>
            <View style={[styles.inputRow, deletePasswordError ? styles.inputRowError : null]}>
              <TextInput
                style={styles.inputFlex}
                value={deletePassword}
                onChangeText={(v) => { setDeletePassword(v); setDeletePasswordError(''); }}
                placeholder={t('account.deleteAccount.passwordPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showDeletePwd}
                returnKeyType="done"
                onSubmitEditing={handleConfirmDeleteWithPassword}
              />
              <TouchableOpacity onPress={() => setShowDeletePwd((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showDeletePwd ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {deletePasswordError ? <Text style={styles.sheetErrorText}>{deletePasswordError}</Text> : null}
            <TouchableOpacity
              style={[styles.sheetButton, { backgroundColor: colors.danger }, deletingAccount && styles.sheetButtonDisabled]}
              onPress={handleConfirmDeleteWithPassword}
              disabled={deletingAccount}
            >
              {deletingAccount ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.sheetButtonText}>{t('account.deleteAccount.confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change password bottom sheet */}
      <Modal
        visible={showChangePasswordSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePasswordSheet(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowChangePasswordSheet(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('more.changePassword.title')}</Text>

            {/* Hidden username field — required for iOS Password AutoFill to offer "Update Password" */}
            <TextInput
              style={{ height: 0, opacity: 0 }}
              value={currentUser?.email ?? ''}
              textContentType="username"
              autoComplete="username"
              importantForAutofill="yes"
            />

            <View style={[styles.inputRow, currentPasswordError ? styles.inputRowError : null]}>
              <TextInput
                style={styles.inputFlex}
                value={currentPasswordInput}
                onChangeText={(v) => { setCurrentPasswordInput(v); setCurrentPasswordError(''); }}
                placeholder={t('more.changePassword.current')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showCurrentPwd}
                textContentType="password"
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowCurrentPwd((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showCurrentPwd ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {currentPasswordError ? <Text style={styles.sheetErrorText}>{currentPasswordError}</Text> : null}

            <View style={[styles.inputRow, newPasswordError ? styles.inputRowError : null]}>
              <TextInput
                style={styles.inputFlex}
                value={newPasswordInput}
                onChangeText={(v) => { setNewPasswordInput(v); setNewPasswordError(''); }}
                placeholder={t('more.changePassword.new')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showNewPwd}
                textContentType="newPassword"
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowNewPwd((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showNewPwd ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {newPasswordError ? <Text style={styles.sheetErrorText}>{newPasswordError}</Text> : null}

            <View style={[styles.inputRow, confirmPasswordError ? styles.inputRowError : null]}>
              <TextInput
                style={styles.inputFlex}
                value={confirmPasswordInput}
                onChangeText={(v) => { setConfirmPasswordInput(v); setConfirmPasswordError(''); }}
                placeholder={t('more.changePassword.confirm')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showConfirmPwd}
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSavePassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPwd((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showConfirmPwd ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {confirmPasswordError ? <Text style={styles.sheetErrorText}>{confirmPasswordError}</Text> : null}

            <TouchableOpacity
              style={[styles.sheetButton, savingPassword && styles.sheetButtonDisabled]}
              onPress={handleSavePassword}
              disabled={savingPassword}
            >
              {savingPassword ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sheetButtonText}>{t('more.changePassword.save')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
