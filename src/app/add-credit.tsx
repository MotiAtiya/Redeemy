import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStepAnimation } from '@/hooks/useStepAnimation';
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
  Switch,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { StoreAutocomplete } from '@/components/redeemy/StoreAutocomplete';
import { CategorySelector } from '@/components/redeemy/CategorySelector';
import { CurrencyPicker } from '@/components/redeemy/CurrencyPicker';
import { StepFormScreen } from '@/components/redeemy/StepFormScreen';
import { openCamera, openGallery, uploadEntityImage, type DocumentImage } from '@/lib/imageUpload';
import { CropModal } from '@/components/redeemy/CropModal';
import { createCredit, updateCredit } from '@/lib/firestoreCredits';
import { scheduleReminderNotification } from '@/lib/notifications';
import { parseAmountToAgot } from '@/constants/currencies';
import { formatCurrency } from '@/lib/formatCurrency';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import { DEFAULT_CATEGORY_ID, CATEGORIES } from '@/constants/categories';
import { getCategoryForStore } from '@/data/israeliStores';
import { useSettingsStore, CURRENCY_SYMBOLS, type CurrencyCode } from '@/stores/settingsStore';
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
  | 'photo'
  | 'summary';

function getSteps(categoryChosen = false): StepId[] {
  const steps: StepId[] = ['storeName'];
  if (categoryChosen) steps.push('category');
  steps.push('amount', 'expiryDate', 'photo', 'summary');
  return steps;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
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
    amountError: { fontSize: 13, color: colors.danger, marginTop: 8, alignSelf: 'flex-start' },
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
    // Photo step
    photoPlaceholderCard: {
      width: '100%',
      height: 180,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.separator,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
      backgroundColor: colors.surface,
    },
    photoPlaceholderCardText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    photoRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    photoSlotFilled: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.separator,
    },
    slotImage: { width: '100%', height: '100%' },
    removePhotoBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 11,
      padding: 1,
    },
    photoSlotAdd: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    summaryPhotoBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    summaryPhotoBadgeText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
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
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      padding: 14,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
    },
    categoryRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    categoryRowTitle: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    categoryRowLabel: {
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: '400',
    },
    notesLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textTertiary,
      alignSelf: 'flex-start',
      marginTop: 20,
      marginBottom: 4,
    },
    notesInput: {
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      textAlign: isRTL ? 'right' : 'left',
      minHeight: 80,
      textAlignVertical: 'top',
      marginTop: 12,
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

  type PhotoItem = { type: 'local'; uri: string } | { type: 'existing'; image: DocumentImage };

  // Form state
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY_ID);
  const [amountInput, setAmountInput] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(
    () => useSettingsStore.getState().currency
  );
  const [noExpiry, setNoExpiry] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [dateError, setDateError] = useState('');

  // Step state
  const [currentStepId, setCurrentStepId] = useState<StepId>('storeName');
  const [categoryChosen, setCategoryChosen] = useState(false);
  const { fadeAnim, slideAnim, animateTransition } = useStepAnimation();

  const steps = useMemo(() => getSteps(categoryChosen), [categoryChosen]);
  const currentStepIndex = steps.indexOf(currentStepId);

  // Pre-fill for edit mode
  useEffect(() => {
    if (!isEditing || !existingCredit) return;
    setStoreName(existingCredit.storeName);
    setAmountInput((existingCredit.amount / 100).toFixed(2));
    if (existingCredit.currency) setCurrency(existingCredit.currency);
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
    if (existingCredit.notes) setNotes(existingCredit.notes);
    const existingImages = existingCredit.images ?? (existingCredit.imageUrl ? [{ url: existingCredit.imageUrl, thumbnailUrl: existingCredit.thumbnailUrl ?? existingCredit.imageUrl }] : []);
    if (existingImages.length > 0) {
      setPhotoItems(existingImages.map((img) => ({ type: 'existing' as const, image: img })));
    }
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

  function handleTapCategoryRow() {
    animateTransition('forward', () => {
      setCategoryChosen(true);
      setCurrentStepId('category');
    });
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

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
      case 'photo': return photoItems.length > 0;
      default: return false;
    }
  }, [currentStepId, storeName, amountInput, noExpiry, expirationDate, photoItems]);

  // ---------------------------------------------------------------------------
  // Photo helpers
  // ---------------------------------------------------------------------------

  const MAX_PHOTOS = 3;

  async function handleCamera() {
    if (photoItems.length >= MAX_PHOTOS) return;
    try {
      const picked = await openCamera();
      if (picked) setCropUri(picked.localUri);
    } catch {
      /* Camera not available (simulator) — silently skip */
    }
  }

  async function handleGallery() {
    if (photoItems.length >= MAX_PHOTOS) return;
    const picked = await openGallery();
    if (picked) setCropUri(picked.localUri);
  }

  function handleRemovePhoto(index: number) {
    setPhotoItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddPhoto() {
    if (photoItems.length >= MAX_PHOTOS) return;
    Alert.alert(
      t('common.choosePhotoSource'),
      undefined,
      [
        { text: t('addCredit.takePhoto'), onPress: handleCamera },
        { text: t('addCredit.chooseGallery'), onPress: handleGallery },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
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
    const { creditReminderDays, creditLastDayAlert } = useSettingsStore.getState();
    setSaving(true);

    if (isEditing && existingCredit) {
      try {
        const finalExpiry = noExpiry ? null : expirationDate;
        const changes: Partial<Credit> = {
          storeName: storeName.trim(),
          amount: agot,
          currency,
          category,
          expirationDate: finalExpiry ?? undefined,
          reminderDays: creditReminderDays,
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
          },
          creditReminderDays,
          creditLastDayAlert,
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
        const hasLocalPhotos = photoItems.some((item) => item.type === 'local');
        const existingImgCount = existingCredit.images?.length ?? (existingCredit.imageUrl ? 1 : 0);
        if (hasLocalPhotos || photoItems.length !== existingImgCount) {
          const uploadedImages = await Promise.all(
            photoItems.map((item, i) =>
              item.type === 'existing'
                ? Promise.resolve(item.image)
                : uploadEntityImage(item.uri, 'credits', existingCredit.id, i)
            )
          );
          changes.images = uploadedImages;
          updateCreditInStore(existingCredit.id, { images: uploadedImages });
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
      currency,
      category,
      expirationDate: noExpiry ? undefined : expirationDate ?? undefined,
      reminderDays: creditReminderDays,
      notes: notes.trim(),
      status: CreditStatus.ACTIVE,
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
        currency,
        category,
        expirationDate: finalExpiry,
        reminderDays: creditReminderDays,
        notes: notes.trim(),
        status: CreditStatus.ACTIVE,
        ...(familyId ? { familyId, createdBy: currentUser.uid, createdByName: displayName } : {}),
      });
      const { reminderId, expiryId } = await scheduleReminderNotification(
        {
          id: newCreditId,
          storeName: storeName.trim(),
          amount: agot,
          expirationDate: finalExpiry,
        },
        creditReminderDays,
        creditLastDayAlert,
      );
      if (reminderId || expiryId) {
        await updateCredit(newCreditId, {
          ...(reminderId ? { notificationId: reminderId } : {}),
          ...(expiryId ? { expirationNotificationId: expiryId } : {}),
        });
      }
      if (photoItems.length > 0) {
        try {
          const uploadedImages = await Promise.all(
            photoItems.map((item, i) =>
              item.type === 'existing'
                ? Promise.resolve(item.image)
                : uploadEntityImage(item.uri, 'credits', newCreditId, i)
            )
          );
          await updateCredit(newCreditId, { images: uploadedImages });
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
    const categoryObj = CATEGORIES.find((c) => c.id === category);
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
        <TouchableOpacity style={styles.categoryRow} onPress={handleTapCategoryRow}>
          <Text style={styles.categoryRowTitle}>{t('addCredit.category')}</Text>
          <View style={styles.categoryRowContent}>
            {categoryObj && <Ionicons name={categoryObj.icon} size={18} color={colors.textSecondary} />}
            <Text style={styles.categoryRowLabel}>{t('category.' + category)}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>
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
        <CategorySelector
          categories={CATEGORIES}
          selected={category}
          onSelect={setCategory}
          labelFor={(id) => t('category.' + id)}
        />
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
          <Text style={styles.amountSymbol}>{CURRENCY_SYMBOLS[currency]}</Text>
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
        <CurrencyPicker value={currency} onChange={setCurrency} />
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
            style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
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

  function renderPhotoStep() {
    const hasPhotos = photoItems.length > 0;
    const canAddMore = photoItems.length < MAX_PHOTOS;
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>{t('addCredit.step.photo')}</Text>

        {!hasPhotos ? (
          <TouchableOpacity style={styles.photoPlaceholderCard} onPress={handleAddPhoto} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.photoPlaceholderCardText}>{t('addCredit.photosHint')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.photoRow}>
            {photoItems.map((item, index) => {
              const uri = item.type === 'local' ? item.uri : item.image.thumbnailUrl;
              return (
                <View key={index} style={styles.photoSlotFilled}>
                  <Image source={{ uri }} style={styles.slotImage} contentFit="cover" transition={200} />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => handleRemovePhoto(index)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              );
            })}
            {canAddMore && (
              <TouchableOpacity style={styles.photoSlotAdd} onPress={handleAddPhoto} activeOpacity={0.7}>
                <Ionicons name="add" size={28} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>
    );
  }

  function renderSummaryStep() {
    const agot = parseAmountToAgot(amountInput);
    const categoryObj = CATEGORIES.find((c) => c.id === category);

    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
      >
        <Text style={styles.stepTitle}>{t('addCredit.step.summary')}</Text>
        <Text style={styles.stepSubtitle}>{t('addCredit.stepSub.summary')}</Text>

        {photoItems.length > 0 && (() => {
          const first = photoItems[0];
          const uri = first.type === 'local' ? first.uri : first.image.url;
          return (
            <View style={{ marginBottom: 24 }}>
              <Image source={{ uri }} style={styles.summaryPhoto} contentFit="cover" placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
              {photoItems.length > 1 && (
                <View style={styles.summaryPhotoBadge}>
                  <Ionicons name="images-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.summaryPhotoBadgeText}>{photoItems.length}</Text>
                </View>
              )}
            </View>
          );
        })()}

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addCredit.summary.store')}</Text>
            <Text style={styles.summaryValue}>{storeName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addCredit.summary.amount')}</Text>
            <Text style={[styles.summaryValue, styles.summaryAmountValue]}>
              {!isNaN(agot) ? formatCurrency(agot, CURRENCY_SYMBOLS[currency]) : amountInput}
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

          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>{t('addCredit.summary.expiry')}</Text>
            <Text style={styles.summaryValue}>
              {noExpiry
                ? t('addCredit.summary.noExpiry')
                : expirationDate
                ? formatDate(expirationDate, dateFormat)
                : '—'}
            </Text>
          </View>
        </View>

        <Text style={styles.notesLabel}>{t('addCredit.summary.notes')}</Text>
        <TextInput
          style={styles.notesInput}
          placeholder={t('addCredit.notesPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          multiline
          value={notes}
          onChangeText={setNotes}
          returnKeyType="done"
        />
      </ScrollView>
    );
  }

  function renderCurrentStep() {
    switch (currentStepId) {
      case 'storeName': return renderStoreNameStep();
      case 'category': return renderCategoryStep();
      case 'amount': return renderAmountStep();
      case 'expiryDate': return renderExpiryDateStep();
      case 'photo': return renderPhotoStep();
      case 'summary': return renderSummaryStep();
    }
  }

  // ---------------------------------------------------------------------------
  // Footer button
  // ---------------------------------------------------------------------------

  function renderFooterButton() {
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

  const headerTitle = isEditing ? t('addCredit.titleEdit') : t('addCredit.title');

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <StepFormScreen
      title={headerTitle}
      onBack={goBack}
      isFirstStep={currentStepIndex === 0}
      totalSteps={steps.length}
      currentStepIndex={currentStepIndex}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      footerButton={renderFooterButton()}
      onSave={isEditing ? handleSave : undefined}
      isSaving={saving}
      extras={cropUri ? (
        <CropModal
          uri={cropUri}
          onCrop={(uri) => {
            setPhotoItems((prev) => prev.length < MAX_PHOTOS ? [...prev, { type: 'local', uri }] : prev);
            setCropUri(null);
          }}
          onCancel={() => setCropUri(null)}
        />
      ) : undefined}
    >
      {renderCurrentStep()}
    </StepFormScreen>
  );
}
