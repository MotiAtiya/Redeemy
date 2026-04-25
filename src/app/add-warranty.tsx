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
import { StepFormScreen } from '@/components/redeemy/StepFormScreen';
import { openCamera, openGallery, uploadCreditImage } from '@/lib/imageUpload';
import { CropModal } from '@/components/redeemy/CropModal';
import { createWarranty, updateWarranty } from '@/lib/firestoreWarranties';
import { scheduleReminderNotification, cancelNotification } from '@/lib/notifications';
import { useAuthStore } from '@/stores/authStore';
import { useWarrantiesStore } from '@/stores/warrantiesStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { WarrantyStatus, type Warranty } from '@/types/warrantyTypes';
import { DEFAULT_CATEGORY_ID, CATEGORIES } from '@/constants/categories';
import { getCategoryForStore } from '@/data/israeliStores';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatDate } from '@/lib/formatDate';
import type { AppColors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Step types
// ---------------------------------------------------------------------------

type StepId =
  | 'storeName'
  | 'category'
  | 'productName'
  | 'expiryDate'
  | 'photo'
  | 'notesQuestion'
  | 'notesInput'
  | 'summary';

function getSteps(noExpiry: boolean, wantsNotes: boolean | null, skipNotesQuestion = false, categoryChosen = false): StepId[] {
  const steps: StepId[] = ['storeName'];
  if (categoryChosen) steps.push('category');
  steps.push('productName', 'expiryDate', 'photo');
  if (!skipNotesQuestion) steps.push('notesQuestion');
  if (skipNotesQuestion || wantsNotes === true) steps.push('notesInput');
  steps.push('summary');
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
    // Product Name step
    productNameInput: {
      height: 64,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 20,
      fontWeight: '500',
      color: colors.textPrimary,
      backgroundColor: colors.background,
      textAlign: isRTL ? 'right' : 'left',
    },
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
      direction: 'ltr',
    },
    summaryRow: {
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
      textAlign: isRTL ? 'right' : 'left',
    },
    summaryValue: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
      textAlign: 'left',
    },
    summaryProductValue: {
      fontSize: 18,
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
      gap: 10,
      flex: 1,
    },
    categoryRowLabel: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
    },
  });
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function AddWarrantyScreen() {
  const router = useRouter();
  const { warrantyId } = useLocalSearchParams<{ warrantyId?: string }>();
  const isEditing = !!warrantyId;
  const colors = useAppTheme();
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);

  const currentUser = useAuthStore((s) => s.currentUser);
  const familyId = useSettingsStore((s) => s.familyId);
  const addWarrantyToStore = useWarrantiesStore((s) => s.addWarranty);
  const removeWarranty = useWarrantiesStore((s) => s.removeWarranty);
  const updateWarrantyInStore = useWarrantiesStore((s) => s.updateWarranty);
  const existingWarranty = useWarrantiesStore((s) =>
    warrantyId ? s.warranties.find((w) => w.id === warrantyId) : undefined
  );

  // Form state
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY_ID);
  const [productName, setProductName] = useState('');
  const [noExpiry, setNoExpiry] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [wantsNotes, setWantsNotes] = useState<boolean | null>(null);
  const [skipNotesQuestion, setSkipNotesQuestion] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState('');

  // Step state
  const [currentStepId, setCurrentStepId] = useState<StepId>('storeName');
  const [categoryChosen, setCategoryChosen] = useState(false);
  const { fadeAnim, slideAnim, animateTransition } = useStepAnimation();

  const steps = useMemo(() => getSteps(noExpiry, wantsNotes, skipNotesQuestion, categoryChosen), [noExpiry, wantsNotes, skipNotesQuestion, categoryChosen]);
  const currentStepIndex = steps.indexOf(currentStepId);

  // Pre-fill for edit mode
  useEffect(() => {
    if (!isEditing || !existingWarranty) return;
    setStoreName(existingWarranty.storeName);
    setProductName(existingWarranty.productName);
    setCategory(existingWarranty.category);
    if (existingWarranty.expirationDate) {
      const d =
        existingWarranty.expirationDate instanceof Date
          ? existingWarranty.expirationDate
          : new Date(existingWarranty.expirationDate as unknown as string);
      setExpirationDate(d);
      setNoExpiry(false);
    } else {
      setNoExpiry(true);
    }
    if (existingWarranty.notes) {
      setNotes(existingWarranty.notes);
      setWantsNotes(true);
      setSkipNotesQuestion(true);
    } else {
      setWantsNotes(false);
    }
    if (existingWarranty.imageUrl) setImageUri(existingWarranty.imageUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-detect category when a store is selected from autocomplete
  function handleSelectStoreSuggestion(selectedName: string) {
    const mapped = getCategoryForStore(selectedName);
    if (mapped) setCategory(mapped);
  }

  function applyStoreCategoryIfNeeded(name: string) {
    if (category !== DEFAULT_CATEGORY_ID) return;
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
  // Validation
  // ---------------------------------------------------------------------------

  function validateCurrentStep(): boolean {
    switch (currentStepId) {
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
      case 'productName': return productName.trim().length > 0;
      case 'expiryDate': return noExpiry || expirationDate !== null;
      case 'photo': return imageUri !== null;
      case 'notesInput': return true;
      default: return false;
    }
  }, [currentStepId, storeName, productName, noExpiry, expirationDate, imageUri]);

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
        t('addWarranty.offline.adding'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    const { warrantyReminderDays, warrantyLastDayAlert } = useSettingsStore.getState();
    setSaving(true);

    if (isEditing && existingWarranty) {
      try {
        const finalExpiry = noExpiry ? undefined : expirationDate ?? undefined;
        const changes: Partial<Warranty> = {
          storeName: storeName.trim(),
          productName: productName.trim(),
          category,
          expirationDate: finalExpiry,
          noExpiry,
          reminderDays: warrantyReminderDays,
          notes: notes.trim(),
          updatedAt: new Date(),
        };
        updateWarrantyInStore(existingWarranty.id, changes);

        // Cancel old notifications and schedule new ones
        await cancelNotification(existingWarranty.notificationId);
        await cancelNotification(existingWarranty.expirationNotificationId);
        if (finalExpiry) {
          const { reminderId, expiryId } = await scheduleReminderNotification(
            {
              id: existingWarranty.id,
              storeName: storeName.trim(),
              amount: 0,
              expirationDate: finalExpiry,
            },
            warrantyReminderDays,
            warrantyLastDayAlert,
          );
          if (reminderId) {
            changes.notificationId = reminderId;
            updateWarrantyInStore(existingWarranty.id, { notificationId: reminderId });
          }
          if (expiryId) {
            changes.expirationNotificationId = expiryId;
            updateWarrantyInStore(existingWarranty.id, { expirationNotificationId: expiryId });
          }
        }
        if (imageUri && imageUri !== existingWarranty.imageUrl) {
          const { imageUrl, thumbnailUrl } = await uploadCreditImage(imageUri, existingWarranty.id);
          changes.imageUrl = imageUrl;
          changes.thumbnailUrl = thumbnailUrl;
          updateWarrantyInStore(existingWarranty.id, { imageUrl, thumbnailUrl });
        }
        await updateWarranty(existingWarranty.id, changes);
        router.back();
      } catch {
        updateWarrantyInStore(existingWarranty.id, existingWarranty as Partial<Warranty>);
        setSaving(false);
        Alert.alert(t('addWarranty.error.save'), t('addWarranty.error.saveMessage'));
      }
      return;
    }

    // Create new warranty
    const tempId = `temp-${Date.now()}`;
    const optimisticWarranty: Warranty = {
      id: tempId,
      userId: currentUser.uid,
      storeName: storeName.trim(),
      productName: productName.trim(),
      category,
      expirationDate: noExpiry ? undefined : expirationDate ?? undefined,
      noExpiry,
      reminderDays: warrantyReminderDays,
      notes: notes.trim(),
      status: WarrantyStatus.ACTIVE,
      imageUri: imageUri ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addWarrantyToStore(optimisticWarranty);

    try {
      const finalExpiry = noExpiry ? undefined : expirationDate ?? undefined;
      const displayName = currentUser.displayName ?? currentUser.email?.split('@')[0] ?? 'Member';
      const newWarrantyId = await createWarranty({
        userId: currentUser.uid,
        storeName: storeName.trim(),
        productName: productName.trim(),
        category,
        expirationDate: finalExpiry,
        noExpiry,
        reminderDays: warrantyReminderDays,
        notes: notes.trim(),
        status: WarrantyStatus.ACTIVE,
        ...(familyId ? { familyId, createdBy: currentUser.uid, createdByName: displayName } : {}),
      });

      if (finalExpiry) {
        const { reminderId, expiryId } = await scheduleReminderNotification(
          {
            id: newWarrantyId,
            storeName: storeName.trim(),
            amount: 0,
            expirationDate: finalExpiry,
          },
          warrantyReminderDays,
          warrantyLastDayAlert,
        );
        if (reminderId || expiryId) {
          await updateWarranty(newWarrantyId, {
            ...(reminderId ? { notificationId: reminderId } : {}),
            ...(expiryId ? { expirationNotificationId: expiryId } : {}),
          });
        }
      }

      if (imageUri) {
        try {
          const { imageUrl, thumbnailUrl } = await uploadCreditImage(imageUri, newWarrantyId);
          await updateWarranty(newWarrantyId, { imageUrl, thumbnailUrl });
        } catch {
          Alert.alert(t('addWarranty.error.photo'));
        }
      }

      removeWarranty(tempId);
      router.back();
    } catch (e) {
      console.error('Save warranty error:', e);
      removeWarranty(tempId);
      setSaving(false);
      Alert.alert(t('addWarranty.error.save'), t('addWarranty.error.saveMessage'));
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
        <Text style={styles.stepTitle}>{t('addWarranty.step.storeName')}</Text>
        <StoreAutocomplete
          value={storeName}
          onChange={setStoreName}
          onSelectSuggestion={handleSelectStoreSuggestion}
          autoFocus
        />
        <TouchableOpacity style={styles.categoryRow} onPress={handleTapCategoryRow}>
          <View style={styles.categoryRowContent}>
            {categoryObj && <Ionicons name={categoryObj.icon} size={20} color={colors.primary} />}
            <Text style={styles.categoryRowLabel}>{t('category.' + category)}</Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
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
        <Text style={styles.stepTitle}>{t('addWarranty.step.category')}</Text>
        <CategorySelector
          categories={CATEGORIES}
          selected={category}
          onSelect={setCategory}
          labelFor={(id) => t('category.' + id)}
        />
      </ScrollView>
    );
  }

  function renderProductNameStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addWarranty.step.productName')}</Text>
        <TextInput
          style={styles.productNameInput}
          placeholder={t('addWarranty.productNamePlaceholder')}
          placeholderTextColor={colors.textTertiary}
          value={productName}
          onChangeText={setProductName}
          autoFocus
          autoCapitalize="sentences"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="next"
        />
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
        <Text style={styles.stepTitle}>{t('addWarranty.step.expiryDate')}</Text>

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
          <Text style={styles.noExpiryLabel}>{t('addWarranty.noExpiry')}</Text>
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
              <Text style={styles.retakeBtnText}>{t('addWarranty.retakePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retakeBtn} onPress={handleGallery}>
              <Ionicons name="images-outline" size={16} color={colors.primary} />
              <Text style={styles.retakeBtnText}>{t('addWarranty.chooseGallery')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.photoPlaceholderIcon}>
              <Ionicons name="camera-outline" size={44} color={colors.primary} />
            </View>
            <Text style={styles.photoPlaceholderLabel}>{t('addWarranty.step.photo')}</Text>
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleCamera}>
                <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                <Text style={styles.photoBtnText}>{t('addWarranty.takePhoto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoBtn, styles.photoBtnSecondary]}
                onPress={handleGallery}
              >
                <Ionicons name="images-outline" size={20} color={colors.primary} />
                <Text style={[styles.photoBtnText, styles.photoBtnTextSecondary]}>
                  {t('addWarranty.chooseGallery')}
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
        <Text style={styles.notesQTitle}>{t('addWarranty.step.notesQuestion')}</Text>
        <TouchableOpacity
          style={styles.notesQBtn}
          onPress={() => {
            setWantsNotes(true);
            animateTransition('forward', () => {
              const updatedSteps = getSteps(noExpiry, true);
              const nextIdx = updatedSteps.indexOf('notesInput');
              if (nextIdx !== -1) setCurrentStepId('notesInput');
            });
          }}
        >
          <Text style={styles.notesQBtnText}>{t('addWarranty.notesYes')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.notesQBtn, styles.notesQBtnSecondary]}
          onPress={() => {
            setWantsNotes(false);
            animateTransition('forward', () => setCurrentStepId('summary'));
          }}
        >
          <Text style={[styles.notesQBtnText, styles.notesQBtnTextSecondary]}>
            {t('addWarranty.notesNo')}
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
        <Text style={styles.stepTitle}>{t('addWarranty.step.notesInput')}</Text>
        <TextInput
          style={styles.notesInput}
          placeholder={t('addWarranty.notesPlaceholder')}
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
    const categoryObj = CATEGORIES.find((c) => c.id === category);

    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
      >
        <Text style={styles.stepTitle}>{t('addWarranty.step.summary')}</Text>

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
            <Text style={styles.summaryLabel}>{t('addWarranty.summary.store')}</Text>
            <Text style={styles.summaryValue}>{storeName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addWarranty.summary.product')}</Text>
            <Text style={[styles.summaryValue, styles.summaryProductValue]}>{productName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addWarranty.summary.category')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              {categoryObj && (
                <Ionicons name={categoryObj.icon} size={16} color={colors.textSecondary} />
              )}
              <Text style={styles.summaryValue}>{t('category.' + category)}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addWarranty.summary.expiry')}</Text>
            <Text style={styles.summaryValue}>
              {noExpiry
                ? t('addWarranty.summary.noExpiry')
                : expirationDate
                ? formatDate(expirationDate, dateFormat)
                : '—'}
            </Text>
          </View>

          {notes.trim().length > 0 && (
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <Text style={styles.summaryLabel}>{t('addWarranty.summary.notes')}</Text>
              <Text style={styles.summaryValue} numberOfLines={3}>{notes}</Text>
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
      case 'productName': return renderProductNameStep();
      case 'expiryDate': return renderExpiryDateStep();
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
            <Text style={styles.continueBtnText}>{t('addWarranty.save')}</Text>
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
        <Text style={styles.continueBtnText}>{t('addWarranty.continue')}</Text>
      </TouchableOpacity>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const headerTitle = isEditing ? t('addWarranty.titleEdit') : t('addWarranty.title');

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
          onCrop={(uri) => { setImageUri(uri); setCropUri(null); }}
          onCancel={() => setCropUri(null)}
        />
      ) : undefined}
    >
      {renderCurrentStep()}
    </StepFormScreen>
  );
}
