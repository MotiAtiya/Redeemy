import { useState, useEffect, useRef, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Dimensions,
  Keyboard,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CategoryChipSelector } from '@/components/redeemy/CategoryChipSelector';
import { StoreAutocomplete } from '@/components/redeemy/StoreAutocomplete';
import { openCamera, openGallery, uploadCreditImage } from '@/lib/imageUpload';
import { CropModal } from '@/components/redeemy/CropModal';
import { createCredit, updateCredit } from '@/lib/firestoreCredits';
import { scheduleReminderNotification } from '@/lib/notifications';
import { parseAmountToAgot } from '@/lib/formatCurrency';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import { DEFAULT_CATEGORY_ID } from '@/constants/categories';
import { REMINDER_PRESETS } from '@/constants/reminders';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatDate } from '@/lib/formatDate';
import type { AppColors } from '@/constants/colors';

interface FormErrors {
  storeName?: string;
  amount?: string;
  category?: string;
  expirationDate?: string;
}

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
    saveButton: { fontSize: 16, fontWeight: '600', color: colors.primary },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 20, paddingBottom: 40 },
    photoSection: { alignItems: 'center', gap: 12 },
    photoContainer: { position: 'relative', width: '100%' },
    photo: { width: '100%', height: 180, borderRadius: 12, backgroundColor: colors.separator },
    photoEditBadge: {
      position: 'absolute',
      bottom: 8,
      end: 8,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 14,
      padding: 6,
    },
    photoPlaceholder: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.separator,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      gap: 8,
    },
    photoPlaceholderText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
    galleryButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    galleryButtonText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
    field: { gap: 8 },
    label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, alignSelf: 'flex-start' },
    headerSideClose: { width: 60, justifyContent: 'center', alignItems: 'flex-start' },
    headerSideSave: { width: 60, justifyContent: 'center', alignItems: 'flex-end' },
    inputError: { borderColor: colors.danger },
    errorText: { fontSize: 12, color: colors.danger, alignSelf: 'flex-start' },
    amountRow: {
      flexDirection: 'row',
      direction: 'ltr',
      alignItems: 'center',
      height: 52,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      gap: 6,
    },
    currencySymbol: { fontSize: 18, color: colors.textPrimary, fontWeight: '500' },
    amountInput: { flex: 1, fontSize: 18, color: colors.textPrimary, textAlign: 'left' },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      gap: 10,
    },
    dateButtonText: { flex: 1, fontSize: 16, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
    datePlaceholder: { color: colors.textTertiary },
    datePickerWrapper: { position: 'relative' },
    datePickerConfirm: {
      position: 'absolute',
      top: 10,
      end: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reminderChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    reminderChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.separator,
      backgroundColor: colors.background,
    },
    reminderChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    reminderChipText: { fontSize: 13, color: colors.textSecondary },
    reminderChipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
    noExpiryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    noExpiryLabel: { fontSize: 14, color: colors.textSecondary },
    notesToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    notesInput: {
      minHeight: 80,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingTop: 12,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      textAlignVertical: 'top',
      textAlign: isRTL ? 'right' : 'left',
    },
  });
}

export default function AddCreditScreen() {
  const router = useRouter();
  const { creditId } = useLocalSearchParams<{ creditId?: string }>();
  const isEditing = !!creditId;
  const colors = useAppTheme();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language.startsWith('he');
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);

  const currentUser = useAuthStore((s) => s.currentUser);
  const addCredit = useCreditsStore((s) => s.addCredit);
  const removeCredit = useCreditsStore((s) => s.removeCredit);
  const updateCreditInStore = useCreditsStore((s) => s.updateCredit);
  const existingCredit = useCreditsStore((s) =>
    creditId ? s.credits.find((c) => c.id === creditId) : undefined
  );
  const allCredits = useCreditsStore((s) => s.credits);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cropUri, setCropUri] = useState<string | null>(null); // raw URI pending crop
  const [storeName, setStoreName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY_ID);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [noExpiry, setNoExpiry] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderDays, setReminderDays] = useState(() => useSettingsStore.getState().defaultReminderDays);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const dateFieldY = useRef(0);
  const notesFieldY = useRef(0);
  const notesFocused = useRef(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      if (!notesFocused.current) return;
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
    return () => { show.remove(); };
  }, []);

  // iOS spinner height is ~216px; label ~20px; button ~52px
  const DATE_PICKER_EXPANDED_HEIGHT = 300;

  useEffect(() => {
    if (!showDatePicker) return;
    const timer = setTimeout(() => {
      const bottom = dateFieldY.current + DATE_PICKER_EXPANDED_HEIGHT;
      const screenHeight = Dimensions.get('window').height;
      const targetY = Math.max(0, bottom - screenHeight + 80);
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    }, 200);
    return () => clearTimeout(timer);
  }, [showDatePicker]);


  useEffect(() => {
    if (isEditing && existingCredit) {
      setStoreName(existingCredit.storeName);
      setAmountInput((existingCredit.amount / 100).toFixed(2));
      setCategory(existingCredit.category);
      if (existingCredit.expirationDate) {
        const expDate = existingCredit.expirationDate instanceof Date
          ? existingCredit.expirationDate
          : new Date(existingCredit.expirationDate as unknown as string);
        setExpirationDate(expDate);
      } else {
        setNoExpiry(true);
      }
      setReminderDays(existingCredit.reminderDays);
      if (existingCredit.notes) { setNotes(existingCredit.notes); setShowNotes(true); }
      if (existingCredit.imageUrl) setImageUri(existingCredit.imageUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectStoreSuggestion(selectedName: string) {
    // Find the most recent credit for this store and suggest its category
    const match = [...allCredits]
      .filter((c) => c.storeName.toLowerCase() === selectedName.toLowerCase())
      .sort((a, b) => new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime())[0];
    if (match) {
      setCategory(match.category);
    }
  }

  async function handleCamera() {
    try {
      const picked = await openCamera();
      if (picked) setCropUri(picked.localUri);
    } catch { /* Camera not available (simulator) — silently skip */ }
  }

  async function handleGallery() {
    const picked = await openGallery();
    if (picked) setCropUri(picked.localUri);
  }

  function onDateChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setExpirationDate(date);
      setReminderDays(useSettingsStore.getState().defaultReminderDays);
      setErrors((e) => ({ ...e, expirationDate: undefined }));
    }
  }


  function validate(): boolean {
    const errs: FormErrors = {};
    if (!storeName.trim()) errs.storeName = t('addCredit.validation.storeName');
    const agot = parseAmountToAgot(amountInput);
    if (!amountInput.trim()) errs.amount = t('addCredit.validation.amountRequired');
    else if (isNaN(agot)) errs.amount = t('addCredit.validation.amountInvalid');
    if (!category) errs.category = t('addCredit.validation.categoryRequired');
    if (!noExpiry) {
      if (!expirationDate) errs.expirationDate = t('addCredit.validation.dateRequired');
      else if (expirationDate <= new Date()) errs.expirationDate = t('addCredit.validation.datePast');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    if (!currentUser) return;
    if (useUIStore.getState().offlineMode) {
      Alert.alert(t('offline.title'), isEditing ? t('addCredit.offline.editing') : t('addCredit.offline.adding'), [{ text: t('common.ok') }]);
      return;
    }

    const agot = parseAmountToAgot(amountInput);
    setSaving(true);

    if (isEditing && existingCredit) {
      try {
        const finalExpiry = noExpiry ? null : expirationDate;
        const changes: Partial<Credit> = {
          storeName: storeName.trim(), amount: agot, category,
          expirationDate: finalExpiry ?? undefined, reminderDays,
          notes: notes.trim(), updatedAt: new Date(),
        };
        updateCreditInStore(existingCredit.id, changes);
        const { reminderId, expiryId } = await scheduleReminderNotification(
          { id: existingCredit.id, storeName: storeName.trim(), amount: agot, expirationDate: finalExpiry ?? undefined, reminderDays },
          existingCredit.notificationId,
          existingCredit.expirationNotificationId,
        );
        if (reminderId) { changes.notificationId = reminderId; updateCreditInStore(existingCredit.id, { notificationId: reminderId }); }
        if (expiryId) { changes.expirationNotificationId = expiryId; updateCreditInStore(existingCredit.id, { expirationNotificationId: expiryId }); }
        if (imageUri && imageUri !== existingCredit.imageUrl) {
          const { imageUrl, thumbnailUrl } = await uploadCreditImage(imageUri, existingCredit.id);
          changes.imageUrl = imageUrl; changes.thumbnailUrl = thumbnailUrl;
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

    const tempId = `temp-${Date.now()}`;
    const optimisticCredit: Credit = {
      id: tempId, userId: currentUser.uid, storeName: storeName.trim(),
      amount: agot, category, expirationDate: noExpiry ? undefined : expirationDate ?? undefined, reminderDays: reminderDays,
      notes: notes.trim(), status: CreditStatus.ACTIVE, imageUri: imageUri ?? undefined,
      createdAt: new Date(), updatedAt: new Date(),
    } as unknown as Credit;
    addCredit(optimisticCredit);

    try {
      const finalExpiry = noExpiry ? undefined : expirationDate ?? undefined;
      const newCreditId = await createCredit({
        userId: currentUser.uid, storeName: storeName.trim(), amount: agot, category,
        expirationDate: finalExpiry, reminderDays: reminderDays,
        notes: notes.trim(), status: CreditStatus.ACTIVE,
      });
      const { reminderId, expiryId } = await scheduleReminderNotification({
        id: newCreditId, storeName: storeName.trim(), amount: agot,
        expirationDate: finalExpiry, reminderDays: reminderDays,
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
        } catch { Alert.alert(t('addCredit.error.photo')); }
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


  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {cropUri && (
        <CropModal
          uri={cropUri}
          onCrop={(croppedUri) => { setImageUri(croppedUri); setCropUri(null); }}
          onCancel={() => setCropUri(null)}
        />
      )}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerSideClose}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>{isEditing ? t('addCredit.titleEdit') : t('addCredit.titleAdd')}</Text>
          <View style={styles.headerSideSave}>
            <TouchableOpacity onPress={handleSave} disabled={saving} accessibilityRole="button" accessibilityLabel={t('addCredit.save')}>
              {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.saveButton}>{t('addCredit.save')}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView ref={scrollViewRef} style={styles.scroll} contentContainerStyle={[styles.scrollContent, showDatePicker && { paddingBottom: 320 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.photoSection}>
            {imageUri ? (
              <TouchableOpacity onPress={handleCamera} style={styles.photoContainer}>
                <Image source={{ uri: imageUri }} style={styles.photo} contentFit="cover" placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
                <View style={styles.photoEditBadge}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.photoPlaceholder} onPress={handleCamera}>
                <Ionicons name="camera-outline" size={32} color={colors.primary} />
                <Text style={styles.photoPlaceholderText}>{t('addCredit.takePhoto')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.galleryButton} onPress={handleGallery}>
              <Ionicons name="images-outline" size={16} color={colors.primary} />
              <Text style={styles.galleryButtonText}>{t('addCredit.chooseGallery')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('addCredit.storeName')}</Text>
            <StoreAutocomplete
              value={storeName}
              onChange={(v) => { setStoreName(v); setErrors((e) => ({ ...e, storeName: undefined })); }}
              onSelectSuggestion={handleSelectStoreSuggestion}
              hasError={!!errors.storeName}
            />
            {errors.storeName ? <Text style={styles.errorText}>{errors.storeName}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('addCredit.amount')}</Text>
            <View style={[styles.amountRow, errors.amount ? styles.inputError : null]}>
              <Text style={styles.currencySymbol}>₪</Text>
              <TextInput style={styles.amountInput} placeholder="0.00" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" value={amountInput}
                onChangeText={(v) => { setAmountInput(v); setErrors((e) => ({ ...e, amount: undefined })); }} />
            </View>
            {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('addCredit.category')}</Text>
            <CategoryChipSelector selected={category} onChange={(id) => { setCategory(id); setErrors((e) => ({ ...e, category: undefined })); }} />
            {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
          </View>

          <View
            style={styles.field}
            onLayout={(e) => { dateFieldY.current = e.nativeEvent.layout.y; }}
          >
            <Text style={styles.label}>{t('addCredit.expirationDate')}</Text>
            {!noExpiry && (
              <>
                <TouchableOpacity
                  style={[styles.dateButton, errors.expirationDate ? styles.inputError : null]}
                  onPress={() => setShowDatePicker((v) => !v)}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.dateButtonText, !expirationDate && styles.datePlaceholder]}>
                    {expirationDate ? formatDate(expirationDate) : t('addCredit.datePlaceholder')}
                  </Text>
                </TouchableOpacity>
                {errors.expirationDate ? <Text style={styles.errorText}>{errors.expirationDate}</Text> : null}
                {showDatePicker && (
                  <View style={styles.datePickerWrapper}>
                    <DateTimePicker value={expirationDate ?? new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={new Date()} onChange={onDateChange} locale="en-GB" />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowDatePicker(false)} hitSlop={8}>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
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
                    setErrors((e) => ({ ...e, expirationDate: undefined }));
                  }
                }}
                trackColor={{ false: colors.separator, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {!noExpiry && (
            <View style={styles.field}>
              <Text style={styles.label}>{t('addCredit.reminder')}</Text>
              <View style={styles.reminderChips}>
                {REMINDER_PRESETS.map((preset) => {
                  const isSelected = reminderDays === preset.days;
                  const reminderKey = preset.days === 1 ? 'reminder.1day' : preset.days === 7 ? 'reminder.1week' : preset.days === 30 ? 'reminder.1month' : 'reminder.3months';
                  return (
                    <TouchableOpacity key={preset.days} style={[styles.reminderChip, isSelected && styles.reminderChipSelected]}
                      onPress={() => setReminderDays(preset.days)}>
                      <Text style={[styles.reminderChipText, isSelected && styles.reminderChipTextSelected]}>{t(reminderKey)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.field} onLayout={(e) => { notesFieldY.current = e.nativeEvent.layout.y; }}>
            <TouchableOpacity
              style={styles.notesToggle}
              onPress={() => {
                const opening = !showNotes;
                setShowNotes(opening);
                if (opening) {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 50);
                }
              }}
            >
              <Text style={styles.label}>{t('addCredit.notes')}</Text>
              <Ionicons name={showNotes ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            {showNotes && (
              <TextInput
                style={styles.notesInput}
                placeholder={t('addCredit.notesPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                onFocus={() => { notesFocused.current = true; }}
                onBlur={() => { notesFocused.current = false; }}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
