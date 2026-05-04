import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Keyboard,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StoreAutocomplete } from '@/components/redeemy/StoreAutocomplete';
import { StepDatePicker } from '@/components/redeemy/StepDatePicker';
import { AutocompleteInput, type AutocompleteItem } from '@/components/redeemy/AutocompleteInput';
import { StepFormScreen } from '@/components/redeemy/StepFormScreen';
import { uploadEntityImage, type DocumentImage } from '@/lib/imageUpload';
import { usePhotoPicker } from '@/hooks/usePhotoPicker';
import { PhotoPickerStep, type PhotoItem } from '@/components/redeemy/PhotoPickerStep';
import { createWarranty, updateWarranty } from '@/lib/firestoreWarranties';
import { scheduleReminderNotification, cancelNotification } from '@/lib/notifications';
import { useAuthStore } from '@/stores/authStore';
import { useWarrantiesStore } from '@/stores/warrantiesStore';
import { useUIStore } from '@/stores/uiStore';
import { showToast } from '@/stores/toastStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFormExitConfirmation } from '@/hooks/useFormExitConfirmation';
import { WarrantyStatus, type Warranty } from '@/types/warrantyTypes';
import { WARRANTY_STORES } from '@/data/warrantyStores';
import { WARRANTY_PRODUCT_TYPES } from '@/data/warrantyProductTypes';
import { WARRANTY_BRANDS } from '@/data/warrantyBrands';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatDate } from '@/lib/formatDate';
import type { AppColors } from '@/constants/colors';
import { normalizeTimestampOrNow } from "@/lib/dateUtils";

// ---------------------------------------------------------------------------
// Step types
// ---------------------------------------------------------------------------

type StepId =
  | 'storeName'
  | 'productType'
  | 'productDetails'
  | 'expiryDate'
  | 'photo'
  | 'summary';

function getSteps(): StepId[] {
  return ['storeName', 'productType', 'productDetails', 'expiryDate', 'photo', 'summary'];
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
    // productDetails step
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textTertiary,
      alignSelf: 'flex-start',
      marginBottom: 6,
      marginTop: 16,
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

  const MAX_PHOTOS = 3;

  // Form state
  const [storeName, setStoreName] = useState('');
  const [productType, setProductType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [noExpiry, setNoExpiry] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Step state
  const [currentStepId, setCurrentStepId] = useState<StepId>('storeName');
  const { fadeAnim, slideAnim, animateTransition } = useStepAnimation();
  const summaryScrollRef = useRef<ScrollView>(null);

  const steps = useMemo(() => getSteps(), []);
  const currentStepIndex = steps.indexOf(currentStepId);

  useFormExitConfirmation(
    !isEditing && !saving && (storeName.trim().length > 0 || currentStepIndex > 0),
  );

  // Pre-fill for edit mode
  useEffect(() => {
    if (!isEditing || !existingWarranty) return;
    setStoreName(existingWarranty.storeName);
    setProductType(existingWarranty.productType ?? existingWarranty.productName ?? '');
    setBrand(existingWarranty.brand ?? '');
    setModel(existingWarranty.model ?? '');
    if (existingWarranty.expirationDate) {
      const d =
        normalizeTimestampOrNow(existingWarranty.expirationDate);
      setExpirationDate(d);
      setNoExpiry(false);
    } else {
      setNoExpiry(true);
    }
    if (existingWarranty.notes) setNotes(existingWarranty.notes);
    const existingImages = existingWarranty.images ?? (existingWarranty.imageUrl ? [{ url: existingWarranty.imageUrl, thumbnailUrl: existingWarranty.thumbnailUrl ?? existingWarranty.imageUrl }] : []);
    if (existingImages.length > 0) {
      setPhotoItems(existingImages.map((img) => ({ type: 'existing' as const, image: img })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    return true;
  }

  function handleContinue() {
    if (!validateCurrentStep()) return;
    goNext();
  }

  // ---------------------------------------------------------------------------
  // Can continue check (live)
  // ---------------------------------------------------------------------------

  const canContinue = useMemo(() => {
    switch (currentStepId) {
      case 'storeName':     return storeName.trim().length > 0;
      case 'productType':   return productType.trim().length > 0;
      case 'productDetails': return true;
      case 'expiryDate':    return true;
      case 'photo':         return photoItems.length > 0;
      default: return false;
    }
  }, [currentStepId, storeName, productType, noExpiry, expirationDate, photoItems]);

  // productType step derived data
  const productTypeDisplayValue = useMemo(() => {
    const found = WARRANTY_PRODUCT_TYPES.find((p) => p.id === productType);
    return found ? found.heLabel : productType;
  }, [productType]);

  const productTypeSuggestions = useMemo((): AutocompleteItem[] => {
    const q = productTypeDisplayValue.trim().toLowerCase();
    if (!q) return [];
    const isEnglishQuery = /[a-zA-Z]/.test(q);
    return WARRANTY_PRODUCT_TYPES
      .filter((p) => p.heLabel.toLowerCase().includes(q) || p.enLabel.toLowerCase().includes(q))
      .sort((a, b) => {
        const primaryLabel = (p: typeof a) => isEnglishQuery ? p.enLabel.toLowerCase() : p.heLabel.toLowerCase();
        const aStarts = primaryLabel(a).startsWith(q);
        const bStarts = primaryLabel(b).startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return isEnglishQuery
          ? a.enLabel.localeCompare(b.enLabel, 'en')
          : a.heLabel.localeCompare(b.heLabel, 'he');
      })
      .slice(0, 30)
      .map((p) => ({ label: isEnglishQuery ? p.enLabel : p.heLabel, value: p.id }));
  }, [productTypeDisplayValue]);

  // productDetails step derived data
  const brandSuggestions = useMemo((): AutocompleteItem[] => {
    const q = brand.trim().toLowerCase();
    if (!q) return [];
    return WARRANTY_BRANDS
      .filter((b) => b.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(q);
        const bStarts = b.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b, 'he');
      })
      .slice(0, 30)
      .map((b) => ({ label: b, value: b }));
  }, [brand]);

  // ---------------------------------------------------------------------------
  // Photo helpers
  // ---------------------------------------------------------------------------

  const { fromCamera: handleCamera, fromGallery: handleGallery, cropOverlay } = usePhotoPicker({
    maxPhotos: MAX_PHOTOS,
    currentCount: photoItems.length,
    onAdd: (uri) =>
      setPhotoItems((prev) => (prev.length < MAX_PHOTOS ? [...prev, { type: 'local', uri }] : prev)),
  });

  function handleRemovePhoto(index: number) {
    setPhotoItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddPhoto() {
    if (photoItems.length >= MAX_PHOTOS) return;
    Alert.alert(
      t('common.choosePhotoSource'),
      undefined,
      [
        { text: t('addWarranty.takePhoto'), onPress: handleCamera },
        { text: t('addWarranty.chooseGallery'), onPress: handleGallery },
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
        t('addWarranty.offline.adding'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    const { warrantyReminderDays, warrantyLastDayAlert } = useSettingsStore.getState();
    setSaving(true);

    if (isEditing && existingWarranty) {
      try {
        const finalExpiry = noExpiry ? undefined : expirationDate;
        const changes: Partial<Warranty> = {
          storeName: storeName.trim(),
          productType: productType.trim() || undefined,
          brand: brand.trim() || undefined,
          model: model.trim() || undefined,
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
        const hasLocalPhotos = photoItems.some((item) => item.type === 'local');
        const existingImgCount = existingWarranty.images?.length ?? (existingWarranty.imageUrl ? 1 : 0);
        if (hasLocalPhotos || photoItems.length !== existingImgCount) {
          const uploadedImages = await Promise.all(
            photoItems.map((item, i) =>
              item.type === 'existing'
                ? Promise.resolve(item.image)
                : uploadEntityImage(item.uri, 'warranties', existingWarranty.id, i)
            )
          );
          changes.images = uploadedImages;
          updateWarrantyInStore(existingWarranty.id, { images: uploadedImages });
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
      productType: productType.trim() || undefined,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      expirationDate: noExpiry ? undefined : expirationDate,
      noExpiry,
      reminderDays: warrantyReminderDays,
      notes: notes.trim(),
      status: WarrantyStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addWarrantyToStore(optimisticWarranty);

    try {
      const finalExpiry = noExpiry ? undefined : expirationDate;
      const displayName = currentUser.displayName ?? currentUser.email?.split('@')[0] ?? 'Member';
      const newWarrantyId = await createWarranty({
        userId: currentUser.uid,
        storeName: storeName.trim(),
        productType: productType.trim() || undefined,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
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
          // Post-create system fixup — already logged item_created above; suppress duplicate.
          await updateWarranty(newWarrantyId, {
            ...(reminderId ? { notificationId: reminderId } : {}),
            ...(expiryId ? { expirationNotificationId: expiryId } : {}),
          }, { silent: true });
        }
      }

      if (photoItems.length > 0) {
        try {
          const uploadedImages = await Promise.all(
            photoItems.map((item, i) =>
              item.type === 'existing'
                ? Promise.resolve(item.image)
                : uploadEntityImage(item.uri, 'warranties', newWarrantyId, i)
            )
          );
          await updateWarranty(newWarrantyId, { images: uploadedImages }, { silent: true });
        } catch {
          Alert.alert(t('addWarranty.error.photo'));
        }
      }

      removeWarranty(tempId);
      showToast(t('toasts.created.warranty'));
      router.back();
    } catch (e) {
      console.error('Save warranty error:', e);
      removeWarranty(tempId);
      setSaving(false);
      Alert.alert(t('addWarranty.error.save'), t('addWarranty.error.saveMessage'));
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
        <Text style={styles.stepTitle}>{t('addWarranty.step.storeName')}</Text>
        <StoreAutocomplete
          value={storeName}
          onChange={setStoreName}
          storeList={WARRANTY_STORES}
          autoFocus
        />
      </ScrollView>
    );
  }

  function renderProductTypeStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addWarranty.step.productType')}</Text>
        <AutocompleteInput
          value={productTypeDisplayValue}
          suggestions={productTypeSuggestions}
          onChangeText={setProductType}
          onSelect={(item) => setProductType(item.value)}
          placeholder={t('addWarranty.productType.placeholder')}
          autoFocus
        />
      </ScrollView>
    );
  }

  function renderProductDetailsStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addWarranty.step.productDetails')}</Text>

        <Text style={styles.fieldLabel}>{`${t('addWarranty.brand.label')} (${t('addWarranty.optional')})`}</Text>
        <AutocompleteInput
          value={brand}
          suggestions={brandSuggestions}
          onChangeText={setBrand}
          onSelect={(item) => setBrand(item.value)}
          placeholder={t('addWarranty.brand.placeholder')}
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>{`${t('addWarranty.model.label')} (${t('addWarranty.optional')})`}</Text>
        <AutocompleteInput
          value={model}
          suggestions={[]}
          onChangeText={setModel}
          onSelect={() => {}}
          placeholder={t('addWarranty.model.placeholder')}
          autoCapitalize="none"
        />
      </ScrollView>
    );
  }

  function renderExpiryDateStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addWarranty.step.expiryDate')}</Text>

        {!noExpiry && (
          <StepDatePicker
            value={expirationDate}
            onChange={setExpirationDate}
            isActive={currentStepId === 'expiryDate'}
            autoOpenOnAndroid={false}
            minimumDate={new Date()}
          />
        )}

        <View style={styles.noExpiryRow}>
          <Text style={styles.noExpiryLabel}>{t('addWarranty.noExpiry')}</Text>
          <Switch
            style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
            value={noExpiry}
            onValueChange={setNoExpiry}
            trackColor={{ false: colors.separator, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ScrollView>
    );
  }

  function renderPhotoStep() {
    return (
      <PhotoPickerStep
        title={t('addWarranty.step.photo')}
        photosHint={t('addWarranty.photosHint')}
        photoItems={photoItems}
        onAddPhoto={handleAddPhoto}
        onRemovePhoto={handleRemovePhoto}
      />
    );
  }

  function renderSummaryStep() {
    const productLabel = WARRANTY_PRODUCT_TYPES.find((p) => p.id === productType)?.heLabel ?? productType;
    const productDisplay = productLabel
      + (brand ? ` — ${brand}` : '')
      + (model ? ` (${model})` : '');

    return (
      <ScrollView
        ref={summaryScrollRef}
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
      >
        <Text style={styles.stepTitle}>{t('addWarranty.step.summary')}</Text>

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
            <Text style={styles.summaryLabel}>{t('addWarranty.summary.store')}</Text>
            <Text style={styles.summaryValue}>{storeName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addWarranty.summary.product')}</Text>
            <Text style={[styles.summaryValue, styles.summaryProductValue]}>{productDisplay}</Text>
          </View>

          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>{t('addWarranty.summary.expiry')}</Text>
            <Text style={styles.summaryValue}>
              {noExpiry
                ? t('addWarranty.summary.noExpiry')
                : formatDate(expirationDate, dateFormat)}
            </Text>
          </View>
        </View>

        <Text style={styles.notesLabel}>{t('addWarranty.summary.notes')}</Text>
        <TextInput
          style={styles.notesInput}
          placeholder={t('addWarranty.notesPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          multiline
          value={notes}
          onChangeText={setNotes}
          returnKeyType="done"
          onFocus={() => {
            const sub = Keyboard.addListener('keyboardDidShow', () => {
              summaryScrollRef.current?.scrollToEnd({ animated: true });
              sub.remove();
            });
          }}
        />
      </ScrollView>
    );
  }

  function renderCurrentStep() {
    switch (currentStepId) {
      case 'storeName':     return renderStoreNameStep();
      case 'productType':   return renderProductTypeStep();
      case 'productDetails': return renderProductDetailsStep();
      case 'expiryDate':    return renderExpiryDateStep();
      case 'photo':         return renderPhotoStep();
      case 'summary':       return renderSummaryStep();
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
      extras={cropOverlay ?? undefined}
    >
      {renderCurrentStep()}
    </StepFormScreen>
  );
}
