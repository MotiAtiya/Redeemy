import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Dimensions,
  Switch,
  Animated,
  Pressable,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { StoreAutocomplete } from '@/components/redeemy/StoreAutocomplete';
import { StepProgressBar } from '@/components/redeemy/StepProgressBar';
import { openCamera, openGallery } from '@/lib/imageUpload';
import { uploadCreditImage } from '@/lib/imageUpload';
import { CropModal } from '@/components/redeemy/CropModal';
import { createCredit, updateCredit } from '@/lib/firestoreCredits';
import { scheduleReminderNotification } from '@/lib/notifications';
import { parseAmountToAgot, formatCurrency } from '@/constants/currencies';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import { DEFAULT_CATEGORY_ID, CATEGORIES } from '@/constants/categories';
import { getCategoryForStore } from '@/data/israeliStores';
import { REMINDER_PRESETS } from '@/constants/reminders';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatDate } from '@/lib/formatDate';
import type { AppColors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Step types
// ---------------------------------------------------------------------------

type StepId =
  | 'storeName'
  | 'category'
  | 'amount'
  | 'expiryDate'
  | 'reminder'
  | 'photo'
  | 'notesQuestion'
  | 'notesInput'
  | 'summary';

function getSteps(noExpiry: boolean, wantsNotes: boolean | null, skipNotesQuestion = false): StepId[] {
  const steps: StepId[] = ['storeName', 'category', 'amount', 'expiryDate'];
  if (!noExpiry) steps.push('reminder');
  steps.push('photo');
  if (!skipNotesQuestion) steps.push('notesQuestion');
  if (skipNotesQuestion || wantsNotes === true) steps.push('notesInput');
  steps.push('summary');
  return steps;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeStyles(colors: AppColors, isRTL: boolean) {
  const { width: screenWidth } = Dimensions.get('window');
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    headerBack: { width: 40, justifyContent: 'center' },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    headerRight: { width: 40 },
    stepContainer: {
      flex: 1,
      width: screenWidth,
    },
    stepScroll: { flex: 1 },
    stepContent: { padding: 24, paddingBottom: 16, flexGrow: 1 },
    stepTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
      alignSelf: 'flex-start',
      marginBottom: 16,
    },
    stepSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      alignSelf: 'flex-start',
      marginBottom: 32,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 8 : 16,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    continueBtn: {
      height: 54,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    continueBtnDisabled: { backgroundColor: colors.separator },
    continueBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
    // Store name step
    // (uses StoreAutocomplete)
    // Amount step
    amountInputContainer: {
      height: 64,
      flexDirection: 'row',
      direction: 'ltr',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      gap: 6,
    },
    amountSymbol: {
      fontSize: 20,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    amountInput: {
      flex: 1,
      fontSize: 28,
      fontWeight: '500',
      color: colors.textPrimary,
      textAlign: 'left',
    },
    amountError: { fontSize: 13, color: colors.danger, marginTop: 8 },
    // Category step — grid
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    categoryCell: {
      width: '30%',
      aspectRatio: 1,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.separator,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 4,
    },
    categoryCellSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySurface,
    },
    // Inner container so icon+label are grouped and centered as a unit
    categoryCellInner: {
      alignItems: 'center',
      gap: 6,
    },
    categoryLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 4,
    },
    categoryLabelSelected: { color: colors.primary, fontWeight: '700' },
    // Expiry date step
    noExpiryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
      marginTop: 8,
    },
    noExpiryLabel: { fontSize: 15, color: colors.textPrimary },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      gap: 10,
    },
    dateButtonText: { flex: 1, fontSize: 16, color: colors.textPrimary },
    datePlaceholder: { color: colors.textTertiary },
    dateError: { fontSize: 12, color: colors.danger, marginTop: 6, alignSelf: 'flex-start' },
    // Reminder step
    reminderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    reminderChip: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.separator,
      backgroundColor: colors.background,
      minWidth: '45%',
      alignItems: 'center',
    },
    reminderChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    reminderChipText: { fontSize: 15, fontWeight: '500', color: colors.textSecondary },
    reminderChipTextSelected: { color: '#FFFFFF', fontWeight: '700' },
    // Photo step
    photoStepCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 24,
    },
    photoPlaceholderIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoPlaceholderLabel: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    photoButtons: { gap: 12, width: '100%', paddingHorizontal: 24 },
    photoBtn: {
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
    },
    photoBtnSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    photoBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    photoBtnTextSecondary: { color: colors.primary },
    photoPreview: {
      width: '100%',
      height: 240,
      borderRadius: 16,
      backgroundColor: colors.separator,
    },
    retakeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    retakeBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
    // Notes question step
    notesQCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      gap: 16,
    },
    notesQIcon: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    notesQTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    notesQSub: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 16,
    },
    notesQBtn: {
      width: '100%',
      height: 54,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notesQBtnSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.separator,
    },
    notesQBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    notesQBtnTextSecondary: { color: colors.textSecondary, fontWeight: '500' },
    // Notes input step
    notesInput: {
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 14,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      textAlignVertical: 'top',
      textAlign: isRTL ? 'right' : 'left',
      minHeight: 120,
    },
    // Summary step
    summaryPhoto: {
      width: '100%',
      height: 200,
      borderRadius: 16,
      backgroundColor: colors.separator,
      marginBottom: 24,
    },
    summaryCard: {
      borderRadius: 16,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.separator,
      overflow: 'hidden',
      // Force LTR so we can control label/value positioning manually
      direction: 'ltr',
    },
    summaryRow: {
      // row-reverse in LTR context = right-to-left: label on right, value on left
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
      gap: 12,
    },
    summaryRowLast: { borderBottomWidth: 0 },
    summaryLabel: {
      fontSize: 13,
      color: colors.textTertiary,
      fontWeight: '500',
      width: 72,
      // RTL: label column is on the right → right-align text to hug the right edge
      textAlign: isRTL ? 'right' : 'left',
    },
    summaryValue: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
      // Always left-align: in RTL the value column is on the physical left
      textAlign: 'left',
    },
    summaryAmountValue: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.primary,
    },
  });
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function AddCreditScreen() {
  const router = useRouter();
  const { creditId } = useLocalSearchParams<{ creditId?: string }>();
  const isEditing = !!creditId;
  const colors = useAppTheme();
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);

  const currentUser = useAuthStore((s) => s.currentUser);
  const familyId = useSettingsStore((s) => s.familyId);
  const addCreditToStore = useCreditsStore((s) => s.addCredit);
  const removeCredit = useCreditsStore((s) => s.removeCredit);
  const updateCreditInStore = useCreditsStore((s) => s.updateCredit);
  const existingCredit = useCreditsStore((s) =>
    creditId ? s.credits.find((c) => c.id === creditId) : undefined
  );
  const allCredits = useCreditsStore((s) => s.credits);

  // Form state
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY_ID);
  const [amountInput, setAmountInput] = useState('');
  const [noExpiry, setNoExpiry] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderDays, setReminderDays] = useState(
    () => useSettingsStore.getState().defaultReminderDays
  );
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [wantsNotes, setWantsNotes] = useState<boolean | null>(null);
  const [skipNotesQuestion, setSkipNotesQuestion] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [dateError, setDateError] = useState('');

  // Step state
  const [currentStepId, setCurrentStepId] = useState<StepId>('storeName');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Keyboard tracking — keeps footer above keyboard on iOS & Android
  const keyboardPadding = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height,
        duration: (e as any).duration ?? 250,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: 0,
        duration: (e as any).duration ?? 250,
        useNativeDriver: false,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = useMemo(() => getSteps(noExpiry, wantsNotes, skipNotesQuestion), [noExpiry, wantsNotes, skipNotesQuestion]);
  const currentStepIndex = steps.indexOf(currentStepId);

  // Pre-fill for edit mode
  useEffect(() => {
    if (!isEditing || !existingCredit) return;
    setStoreName(existingCredit.storeName);
    setAmountInput((existingCredit.amount / 100).toFixed(2));
    setCategory(existingCredit.category);
    if (existingCredit.expirationDate) {
      const d =
        existingCredit.expirationDate instanceof Date
          ? existingCredit.expirationDate
          : new Date(existingCredit.expirationDate as unknown as string);
      setExpirationDate(d);
      setNoExpiry(false);
    } else {
      setNoExpiry(true);
    }
    setReminderDays(existingCredit.reminderDays);
    if (existingCredit.notes) {
      setNotes(existingCredit.notes);
      setWantsNotes(true);
      setSkipNotesQuestion(true);
    } else {
      setWantsNotes(false);
    }
    if (existingCredit.imageUrl) setImageUri(existingCredit.imageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-detect category when a store is selected from autocomplete.
  // Priority: 1) most recent credit for this store, 2) store→category map.
  function handleSelectStoreSuggestion(selectedName: string) {
    const match = [...allCredits]
      .filter((c) => c.storeName.toLowerCase() === selectedName.toLowerCase())
      .sort(
        (a, b) =>
          new Date(b.createdAt as Date).getTime() -
          new Date(a.createdAt as Date).getTime()
      )[0];
    if (match) {
      setCategory(match.category);
      return;
    }
    const mapped = getCategoryForStore(selectedName);
    if (mapped) setCategory(mapped);
  }

  // Also resolve category when continuing from storeName step manually (without selecting a suggestion).
  function applyStoreCategoryIfNeeded(name: string) {
    if (category !== DEFAULT_CATEGORY_ID) return; // already customised
    const mapped = getCategoryForStore(name);
    if (mapped) setCategory(mapped);
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  function animateTransition(direction: 'forward' | 'back', callback: () => void) {
    const { width } = Dimensions.get('window');
    const exitX = direction === 'forward' ? -width * 0.25 : width * 0.25;
    const enterX = direction === 'forward' ? width * 0.25 : -width * 0.25;

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: exitX, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(enterX);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 11,
        }),
      ]).start();
    });
  }

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      animateTransition('forward', () => setCurrentStepId(steps[nextIndex]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, steps]);

  function goBack() {
    if (currentStepIndex > 0) {
      animateTransition('back', () => setCurrentStepId(steps[currentStepIndex - 1]));
    } else {
      router.back();
    }
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  function validateCurrentStep(): boolean {
    switch (currentStepId) {
      case 'amount': {
        const agot = parseAmountToAgot(amountInput);
        if (!amountInput.trim()) {
          setAmountError(t('addCredit.validation.amountRequired'));
          return false;
        }
        if (isNaN(agot)) {
          setAmountError(t('addCredit.validation.amountInvalid'));
          return false;
        }
        setAmountError('');
        return true;
      }
      case 'expiryDate': {
        if (!noExpiry) {
          if (!expirationDate) {
            setDateError(t('addCredit.validation.dateRequired'));
            return false;
          }
          if (expirationDate <= new Date()) {
            setDateError(t('addCredit.validation.datePast'));
            return false;
          }
        }
        setDateError('');
        return true;
      }
      default:
        return true;
    }
  }

  function handleContinue() {
    if (!validateCurrentStep()) return;
    if (currentStepId === 'storeName') applyStoreCategoryIfNeeded(storeName);
    goNext();
  }

  // ---------------------------------------------------------------------------
  // Can continue check (live)
  // ---------------------------------------------------------------------------

  const canContinue = useMemo(() => {
    switch (currentStepId) {
      case 'storeName': return storeName.trim().length > 0;
      case 'category': return true;
      case 'amount': {
        const agot = parseAmountToAgot(amountInput);
        return amountInput.trim().length > 0 && !isNaN(agot);
      }
      case 'expiryDate': return noExpiry || expirationDate !== null;
      case 'reminder': return true;
      case 'photo': return imageUri !== null;
      case 'notesInput': return true;
      default: return false;
    }
  }, [currentStepId, storeName, amountInput, noExpiry, expirationDate, imageUri]);

  // ---------------------------------------------------------------------------
  // Photo helpers
  // ---------------------------------------------------------------------------

  async function handleCamera() {
    try {
      const picked = await openCamera();
      if (picked) setCropUri(picked.localUri);
    } catch {
      /* Camera not available (simulator) — silently skip */
    }
  }

  async function handleGallery() {
    const picked = await openGallery();
    if (picked) setCropUri(picked.localUri);
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function handleSave() {
    if (!currentUser) return;
    if (useUIStore.getState().offlineMode) {
      Alert.alert(
        t('offline.title'),
        isEditing ? t('addCredit.offline.editing') : t('addCredit.offline.adding'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    const agot = parseAmountToAgot(amountInput);
    setSaving(true);

    if (isEditing && existingCredit) {
      try {
        const finalExpiry = noExpiry ? null : expirationDate;
        const changes: Partial<Credit> = {
          storeName: storeName.trim(),
          amount: agot,
          category,
          expirationDate: finalExpiry ?? undefined,
          reminderDays,
          notes: notes.trim(),
          updatedAt: new Date(),
        };
        updateCreditInStore(existingCredit.id, changes);
        const { reminderId, expiryId } = await scheduleReminderNotification(
          {
            id: existingCredit.id,
            storeName: storeName.trim(),
            amount: agot,
            expirationDate: finalExpiry ?? undefined,
            reminderDays,
          },
          existingCredit.notificationId,
          existingCredit.expirationNotificationId
        );
        if (reminderId) {
          changes.notificationId = reminderId;
          updateCreditInStore(existingCredit.id, { notificationId: reminderId });
        }
        if (expiryId) {
          changes.expirationNotificationId = expiryId;
          updateCreditInStore(existingCredit.id, { expirationNotificationId: expiryId });
        }
        if (imageUri && imageUri !== existingCredit.imageUrl) {
          const { imageUrl, thumbnailUrl } = await uploadCreditImage(imageUri, existingCredit.id);
          changes.imageUrl = imageUrl;
          changes.thumbnailUrl = thumbnailUrl;
          updateCreditInStore(existingCredit.id, { imageUrl, thumbnailUrl });
        }
        await updateCredit(existingCredit.id, changes);
        router.back();
      } catch {
        updateCreditInStore(existingCredit.id, existingCredit as Partial<Credit>);
        setSaving(false);
        Alert.alert(t('addCredit.error.save'), t('addCredit.error.saveMessage'));
      }
      return;
    }

    // Create new credit
    const tempId = `temp-${Date.now()}`;
    const optimisticCredit: Credit = {
      id: tempId,
      userId: currentUser.uid,
      storeName: storeName.trim(),
      amount: agot,
      category,
      expirationDate: noExpiry ? undefined : expirationDate ?? undefined,
      reminderDays,
      notes: notes.trim(),
      status: CreditStatus.ACTIVE,
      imageUri: imageUri ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Credit;
    addCreditToStore(optimisticCredit);

    try {
      const finalExpiry = noExpiry ? undefined : expirationDate ?? undefined;
      const displayName = currentUser.displayName ?? currentUser.email?.split('@')[0] ?? 'Member';
      const newCreditId = await createCredit({
        userId: currentUser.uid,
        storeName: storeName.trim(),
        amount: agot,
        category,
        expirationDate: finalExpiry,
        reminderDays,
        notes: notes.trim(),
        status: CreditStatus.ACTIVE,
        ...(familyId ? { familyId, createdBy: currentUser.uid, createdByName: displayName } : {}),
      });
      const { reminderId, expiryId } = await scheduleReminderNotification({
        id: newCreditId,
        storeName: storeName.trim(),
        amount: agot,
        expirationDate: finalExpiry,
        reminderDays,
      });
      if (reminderId || expiryId) {
        await updateCredit(newCreditId, {
          ...(reminderId ? { notificationId: reminderId } : {}),
          ...(expiryId ? { expirationNotificationId: expiryId } : {}),
        });
      }
      if (imageUri) {
        try {
          const { imageUrl, thumbnailUrl } = await uploadCreditImage(imageUri, newCreditId);
          await updateCredit(newCreditId, { imageUrl, thumbnailUrl });
        } catch {
          Alert.alert(t('addCredit.error.photo'));
        }
      }
      removeCredit(tempId);
      router.back();
    } catch (e) {
      console.error('Save error:', e);
      removeCredit(tempId);
      setSaving(false);
      Alert.alert(t('addCredit.error.save'), t('addCredit.error.saveMessage'));
    }
  }

  // ---------------------------------------------------------------------------
  // Date picker handler
  // ---------------------------------------------------------------------------

  function onDateChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setExpirationDate(date);
      setDateError('');
    }
  }

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  function renderStoreNameStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addCredit.step.storeName')}</Text>
        <StoreAutocomplete
          value={storeName}
          onChange={setStoreName}
          onSelectSuggestion={handleSelectStoreSuggestion}
          autoFocus
        />
      </ScrollView>
    );
  }

  function renderCategoryStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addCredit.step.category')}</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = cat.id === category;
            return (
              <Pressable
                key={cat.id}
                style={[styles.categoryCell, isSelected && styles.categoryCellSelected]}
                onPress={() => setCategory(cat.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <View style={styles.categoryCellInner}>
                  <Ionicons
                    name={cat.icon}
                    size={26}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}
                    numberOfLines={2}
                  >
                    {t('category.' + cat.id)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  function renderAmountStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addCredit.step.amount')}</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.amountSymbol}>₪</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            value={amountInput}
            onChangeText={(v) => {
              setAmountInput(v);
              setAmountError('');
            }}
            autoFocus
          />
        </View>
        {!!amountError && <Text style={styles.amountError}>{amountError}</Text>}
      </ScrollView>
    );
  }

  function renderExpiryDateStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={[styles.stepContent, { paddingBottom: showDatePicker ? 320 : 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addCredit.step.expiryDate')}</Text>

        {!noExpiry && (
          <>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker((v) => !v)}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <Text
                style={[
                  styles.dateButtonText,
                  !expirationDate && styles.datePlaceholder,
                ]}
              >
                {expirationDate ? formatDate(expirationDate, dateFormat) : dateFormat}
              </Text>
            </TouchableOpacity>
            {!!dateError && <Text style={styles.dateError}>{dateError}</Text>}

            {showDatePicker && (
              <DateTimePicker
                value={expirationDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={onDateChange}
                locale="en-GB"
              />
            )}
          </>
        )}

        <View style={styles.noExpiryRow}>
          <Text style={styles.noExpiryLabel}>{t('addCredit.noExpiry')}</Text>
          <Switch
            value={noExpiry}
            onValueChange={(v) => {
              setNoExpiry(v);
              if (v) {
                setShowDatePicker(false);
                setDateError('');
              }
            }}
            trackColor={{ false: colors.separator, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ScrollView>
    );
  }

  function renderReminderStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
      >
        <Text style={styles.stepTitle}>{t('addCredit.step.reminder')}</Text>
        <Text style={styles.stepSubtitle}>{t('addCredit.stepSub.reminder')}</Text>
        <View style={styles.reminderGrid}>
          {REMINDER_PRESETS.map((preset) => {
            const isSelected = reminderDays === preset.days;
            const key =
              preset.days === 1
                ? 'reminder.1day'
                : preset.days === 7
                ? 'reminder.1week'
                : preset.days === 30
                ? 'reminder.1month'
                : 'reminder.3months';
            return (
              <TouchableOpacity
                key={preset.days}
                style={[styles.reminderChip, isSelected && styles.reminderChipSelected]}
                onPress={() => setReminderDays(preset.days)}
              >
                <Text
                  style={[
                    styles.reminderChipText,
                    isSelected && styles.reminderChipTextSelected,
                  ]}
                >
                  {t(key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  function renderPhotoStep() {
    return (
      <View style={[styles.stepContent, styles.photoStepCenter]}>
        {imageUri ? (
          <>
            <Image
              source={{ uri: imageUri }}
              style={styles.photoPreview}
              contentFit="cover"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            />
            <TouchableOpacity style={styles.retakeBtn} onPress={handleCamera}>
              <Ionicons name="camera-outline" size={16} color={colors.primary} />
              <Text style={styles.retakeBtnText}>{t('addCredit.retakePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retakeBtn} onPress={handleGallery}>
              <Ionicons name="images-outline" size={16} color={colors.primary} />
              <Text style={styles.retakeBtnText}>{t('addCredit.chooseGallery')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.photoPlaceholderIcon}>
              <Ionicons name="camera-outline" size={44} color={colors.primary} />
            </View>
            <Text style={styles.photoPlaceholderLabel}>{t('addCredit.stepSub.photo')}</Text>
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleCamera}>
                <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                <Text style={styles.photoBtnText}>{t('addCredit.takePhoto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoBtn, styles.photoBtnSecondary]}
                onPress={handleGallery}
              >
                <Ionicons name="images-outline" size={20} color={colors.primary} />
                <Text style={[styles.photoBtnText, styles.photoBtnTextSecondary]}>
                  {t('addCredit.chooseGallery')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }

  function renderNotesQuestionStep() {
    return (
      <View style={[styles.stepContent, styles.notesQCenter]}>
        <View style={styles.notesQIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.notesQTitle}>{t('addCredit.step.notesQuestion')}</Text>
        <Text style={styles.notesQSub}>{t('addCredit.stepSub.notesQuestion')}</Text>
        <TouchableOpacity
          style={styles.notesQBtn}
          onPress={() => {
            setWantsNotes(true);
            // steps will recompute to include notesInput
            animateTransition('forward', () => {
              const updatedSteps = getSteps(noExpiry, true);
              const nextIdx = updatedSteps.indexOf('notesInput');
              if (nextIdx !== -1) setCurrentStepId('notesInput');
            });
          }}
        >
          <Text style={styles.notesQBtnText}>{t('addCredit.notesYes')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.notesQBtn, styles.notesQBtnSecondary]}
          onPress={() => {
            setWantsNotes(false);
            animateTransition('forward', () => setCurrentStepId('summary'));
          }}
        >
          <Text style={[styles.notesQBtnText, styles.notesQBtnTextSecondary]}>
            {t('addCredit.notesNo')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderNotesInputStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addCredit.step.notesInput')}</Text>
        <Text style={styles.stepSubtitle}>{t('addCredit.stepSub.notesInput')}</Text>
        <TextInput
          style={styles.notesInput}
          placeholder={t('addCredit.notesPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={5}
          value={notes}
          onChangeText={setNotes}
          autoFocus
        />
      </ScrollView>
    );
  }

  function renderSummaryStep() {
    const agot = parseAmountToAgot(amountInput);
    const categoryObj = CATEGORIES.find((c) => c.id === category);
    const reminderKey =
      reminderDays === 1
        ? 'reminder.1day'
        : reminderDays === 7
        ? 'reminder.1week'
        : reminderDays === 30
        ? 'reminder.1month'
        : 'reminder.3months';

    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
      >
        <Text style={styles.stepTitle}>{t('addCredit.step.summary')}</Text>
        <Text style={styles.stepSubtitle}>{t('addCredit.stepSub.summary')}</Text>

        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.summaryPhoto}
            contentFit="cover"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          />
        )}

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addCredit.summary.store')}</Text>
            <Text style={styles.summaryValue}>{storeName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addCredit.summary.amount')}</Text>
            <Text style={[styles.summaryValue, styles.summaryAmountValue]}>
              {!isNaN(agot) ? formatCurrency(agot) : amountInput}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addCredit.summary.category')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              {categoryObj && (
                <Ionicons name={categoryObj.icon} size={16} color={colors.textSecondary} />
              )}
              <Text style={styles.summaryValue}>{t('category.' + category)}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addCredit.summary.expiry')}</Text>
            <Text style={styles.summaryValue}>
              {noExpiry
                ? t('addCredit.summary.noExpiry')
                : expirationDate
                ? formatDate(expirationDate, dateFormat)
                : '—'}
            </Text>
          </View>

          {!noExpiry && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('addCredit.summary.reminder')}</Text>
              <Text style={styles.summaryValue}>{t(reminderKey)}</Text>
            </View>
          )}

          {notes.trim().length > 0 && (
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <Text style={styles.summaryLabel}>{t('addCredit.summary.notes')}</Text>
              <Text style={styles.summaryValue} numberOfLines={3}>{notes}</Text>
            </View>
          )}

          {!notes.trim() && noExpiry && (
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              {/* keeps border bottom clean when last row */}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  function renderCurrentStep() {
    switch (currentStepId) {
      case 'storeName': return renderStoreNameStep();
      case 'category': return renderCategoryStep();
      case 'amount': return renderAmountStep();
      case 'expiryDate': return renderExpiryDateStep();
      case 'reminder': return renderReminderStep();
      case 'photo': return renderPhotoStep();
      case 'notesQuestion': return renderNotesQuestionStep();
      case 'notesInput': return renderNotesInputStep();
      case 'summary': return renderSummaryStep();
    }
  }

  // ---------------------------------------------------------------------------
  // Footer button
  // ---------------------------------------------------------------------------

  function renderFooterButton() {
    if (currentStepId === 'notesQuestion') return null;
    if (currentStepId === 'summary') {
      return (
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueBtnText}>{t('addCredit.save')}</Text>
          )}
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
        onPress={handleContinue}
        disabled={!canContinue}
        activeOpacity={canContinue ? 0.8 : 1}
      >
        <Text style={styles.continueBtnText}>{t('addCredit.continue')}</Text>
      </TouchableOpacity>
    );
  }

  // ---------------------------------------------------------------------------
  // Header title
  // ---------------------------------------------------------------------------

  const stepTitleKey: Record<StepId, string> = {
    storeName: 'addCredit.step.storeName',
    category: 'addCredit.step.category',
    amount: 'addCredit.step.amount',
    expiryDate: 'addCredit.step.expiryDate',
    reminder: 'addCredit.step.reminder',
    photo: 'addCredit.step.photo',
    notesQuestion: 'addCredit.step.notesQuestion',
    notesInput: 'addCredit.step.notesInput',
    summary: 'addCredit.step.summary',
  };

  const headerTitle = isEditing
    ? t('addCredit.titleEdit')
    : t(stepTitleKey[currentStepId]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {cropUri && (
        <CropModal
          uri={cropUri}
          onCrop={(uri) => {
            setImageUri(uri);
            setCropUri(null);
          }}
          onCancel={() => setCropUri(null)}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={goBack} hitSlop={8}>
          <Ionicons
            name={currentStepIndex === 0 ? 'close' : (isRTL ? 'chevron-forward' : 'chevron-back')}
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Keyboard-aware wrapper: paddingBottom tracks keyboard height so footer stays visible */}
      <Animated.View style={[styles.flex, { paddingBottom: keyboardPadding }]}>
        {/* Step content with animation */}
        <Animated.View
          style={[
            styles.stepContainer,
            { flex: 1, opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {renderCurrentStep()}
        </Animated.View>

        {/* Footer: progress bar + button */}
        <View style={styles.footer}>
          <StepProgressBar totalSteps={steps.length} currentStep={currentStepIndex} />
          {renderFooterButton()}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
