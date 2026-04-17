import { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { CategoryChipSelector } from '@/components/redeemy/CategoryChipSelector';
import { StoreAutocomplete } from '@/components/redeemy/StoreAutocomplete';
import { openCamera, openGallery, uploadCreditImage } from '@/lib/imageUpload';
import { createCredit, updateCredit } from '@/lib/firestoreCredits';
import { scheduleReminderNotification } from '@/lib/notifications';
import { parseAmountToAgot } from '@/lib/formatCurrency';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useUIStore } from '@/stores/uiStore';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import { DEFAULT_CATEGORY_ID } from '@/constants/categories';
import { REMINDER_PRESETS, DEFAULT_REMINDER_DAYS } from '@/constants/reminders';
import { SAGE_TEAL } from '@/components/ui/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormErrors {
  storeName?: string;
  amount?: string;
  category?: string;
  expirationDate?: string;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AddCreditScreen() {
  const router = useRouter();
  const { creditId } = useLocalSearchParams<{ creditId?: string }>();
  const isEditing = !!creditId;

  const currentUser = useAuthStore((s) => s.currentUser);
  const addCredit = useCreditsStore((s) => s.addCredit);
  const removeCredit = useCreditsStore((s) => s.removeCredit);
  const updateCreditInStore = useCreditsStore((s) => s.updateCredit);
  const existingCredit = useCreditsStore((s) =>
    creditId ? s.credits.find((c) => c.id === creditId) : undefined
  );

  // ---- form state ----------------------------------------------------------
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY_ID);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderDays, setReminderDays] = useState(DEFAULT_REMINDER_DAYS);
  const [customReminder, setCustomReminder] = useState('');
  const [showCustomReminder, setShowCustomReminder] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // ---- pre-fill form when editing ------------------------------------------
  useEffect(() => {
    if (isEditing && existingCredit) {
      setStoreName(existingCredit.storeName);
      setAmountInput((existingCredit.amount / 100).toFixed(2));
      setCategory(existingCredit.category);
      const expDate = existingCredit.expirationDate instanceof Date
        ? existingCredit.expirationDate
        : new Date(existingCredit.expirationDate as unknown as string);
      setExpirationDate(expDate);
      setReminderDays(existingCredit.reminderDays);
      if (existingCredit.notes) {
        setNotes(existingCredit.notes);
        setShowNotes(true);
      }
      if (existingCredit.imageUrl) {
        setImageUri(existingCredit.imageUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- open camera on mount only when adding (not editing) -----------------
  useEffect(() => {
    if (!isEditing) {
      handleCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCamera() {
    try {
      const picked = await openCamera();
      if (picked) {
        setImageUri(picked.localUri);
      }
    } catch {
      // Camera not available (simulator) — silently skip auto-open
    }
  }

  async function handleGallery() {
    const picked = await openGallery();
    if (picked) {
      setImageUri(picked.localUri);
    }
  }

  // ---- date picker ---------------------------------------------------------

  function onDateChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setExpirationDate(date);
      // Auto-apply default reminder when date is first set
      setReminderDays(DEFAULT_REMINDER_DAYS);
      setErrors((e) => ({ ...e, expirationDate: undefined }));
    }
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
  }

  // ---- validation ----------------------------------------------------------

  function validate(): boolean {
    const errs: FormErrors = {};

    if (!storeName.trim()) errs.storeName = 'Store name is required';

    const agot = parseAmountToAgot(amountInput);
    if (!amountInput.trim()) {
      errs.amount = 'Amount is required';
    } else if (isNaN(agot)) {
      errs.amount = 'Enter a valid positive amount';
    }

    if (!category) errs.category = 'Category is required';

    if (!expirationDate) {
      errs.expirationDate = 'Expiration date is required';
    } else if (expirationDate <= new Date()) {
      errs.expirationDate = 'Expiration date must be in the future';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ---- save ----------------------------------------------------------------

  async function handleSave() {
    if (!validate()) return;
    if (!currentUser) return;

    if (useUIStore.getState().offlineMode) {
      Alert.alert(
        'No Internet Connection',
        `${isEditing ? 'Editing' : 'Adding'} credits requires an internet connection.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const agot = parseAmountToAgot(amountInput);
    const resolvedReminderDays = showCustomReminder
      ? parseInt(customReminder) || DEFAULT_REMINDER_DAYS
      : reminderDays;

    setSaving(true);

    // ---- EDIT path ----------------------------------------------------------
    if (isEditing && existingCredit) {
      try {
        const changes: Partial<Credit> = {
          storeName: storeName.trim(),
          amount: agot,
          category,
          expirationDate: expirationDate!,
          reminderDays: resolvedReminderDays,
          notes: notes.trim(),
          updatedAt: new Date(),
        };

        // Optimistic store update
        updateCreditInStore(existingCredit.id, changes);

        // Reschedule notification if date/reminder changed
        const notificationId = await scheduleReminderNotification(
          {
            id: existingCredit.id,
            storeName: storeName.trim(),
            amount: agot,
            expirationDate: expirationDate!,
            reminderDays: resolvedReminderDays,
          },
          existingCredit.notificationId
        );

        if (notificationId) {
          changes.notificationId = notificationId;
          updateCreditInStore(existingCredit.id, { notificationId });
        }

        // Upload new image if changed (imageUri is local path, imageUrl is remote)
        if (imageUri && imageUri !== existingCredit.imageUrl) {
          const { imageUrl, thumbnailUrl } = await uploadCreditImage(
            imageUri,
            existingCredit.id
          );
          changes.imageUrl = imageUrl;
          changes.thumbnailUrl = thumbnailUrl;
          updateCreditInStore(existingCredit.id, { imageUrl, thumbnailUrl });
        }

        await updateCredit(existingCredit.id, changes);
        router.back();
      } catch {
        // Revert optimistic update
        updateCreditInStore(existingCredit.id, existingCredit as Partial<Credit>);
        setSaving(false);
        Alert.alert("Couldn't save", 'Check your connection and try again.');
      }
      return;
    }

    // ---- ADD path -----------------------------------------------------------
    const tempId = `temp-${Date.now()}`;
    const optimisticCredit: Credit = {
      id: tempId,
      userId: currentUser.uid,
      storeName: storeName.trim(),
      amount: agot,
      category,
      expirationDate: expirationDate!,
      reminderDays: resolvedReminderDays,
      notes: notes.trim(),
      status: CreditStatus.ACTIVE,
      imageUri: imageUri ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Credit;

    addCredit(optimisticCredit);

    try {
      const newCreditId = await createCredit({
        userId: currentUser.uid,
        storeName: storeName.trim(),
        amount: agot,
        category,
        expirationDate: expirationDate!,
        reminderDays: resolvedReminderDays,
        notes: notes.trim(),
        status: CreditStatus.ACTIVE,
      });

      const notificationId = await scheduleReminderNotification({
        id: newCreditId,
        storeName: storeName.trim(),
        amount: agot,
        expirationDate: expirationDate!,
        reminderDays: resolvedReminderDays,
      });

      if (notificationId) {
        await updateCredit(newCreditId, { notificationId });
      }

      if (imageUri) {
        try {
          const { imageUrl, thumbnailUrl } = await uploadCreditImage(imageUri, newCreditId);
          await updateCredit(newCreditId, { imageUrl, thumbnailUrl });
        } catch {
          Alert.alert('Photo upload failed — credit saved without image.');
        }
      }

      removeCredit(tempId);
      router.back();
    } catch {
      removeCredit(tempId);
      setSaving(false);
      Alert.alert("Couldn't save", 'Check your connection and try again.');
    }
  }

  // ---- render --------------------------------------------------------------

  const activeReminderDays = showCustomReminder
    ? parseInt(customReminder) || 0
    : reminderDays;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color="#212121" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Credit' : 'Add Credit'}</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save credit"
          >
            {saving ? (
              <ActivityIndicator size="small" color={SAGE_TEAL} />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo section */}
          <View style={styles.photoSection}>
            {imageUri ? (
              <TouchableOpacity onPress={handleCamera} style={styles.photoContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.photo}
                  contentFit="cover"
                  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                />
                <View style={styles.photoEditBadge}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.photoPlaceholder} onPress={handleCamera}>
                <Ionicons name="camera-outline" size={32} color={SAGE_TEAL} />
                <Text style={styles.photoPlaceholderText}>Take Photo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.galleryButton} onPress={handleGallery}>
              <Ionicons name="images-outline" size={16} color={SAGE_TEAL} />
              <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Store Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Store Name</Text>
            <StoreAutocomplete
              value={storeName}
              onChange={(v) => {
                setStoreName(v);
                setErrors((e) => ({ ...e, storeName: undefined }));
              }}
              hasError={!!errors.storeName}
            />
            {errors.storeName ? (
              <Text style={styles.errorText}>{errors.storeName}</Text>
            ) : null}
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Amount</Text>
            <View style={[styles.amountRow, errors.amount ? styles.inputError : null]}>
              <Text style={styles.currencySymbol}>₪</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#9E9E9E"
                keyboardType="decimal-pad"
                value={amountInput}
                onChangeText={(v) => {
                  setAmountInput(v);
                  setErrors((e) => ({ ...e, amount: undefined }));
                }}
              />
            </View>
            {errors.amount ? (
              <Text style={styles.errorText}>{errors.amount}</Text>
            ) : null}
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <CategoryChipSelector
              selected={category}
              onChange={(id) => {
                setCategory(id);
                setErrors((e) => ({ ...e, category: undefined }));
              }}
            />
            {errors.category ? (
              <Text style={styles.errorText}>{errors.category}</Text>
            ) : null}
          </View>

          {/* Expiration Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Expiration Date</Text>
            <TouchableOpacity
              style={[styles.dateButton, errors.expirationDate ? styles.inputError : null]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#616161" />
              <Text
                style={[
                  styles.dateButtonText,
                  !expirationDate && styles.datePlaceholder,
                ]}
              >
                {expirationDate ? formatDate(expirationDate) : 'DD/MM/YYYY'}
              </Text>
            </TouchableOpacity>
            {errors.expirationDate ? (
              <Text style={styles.errorText}>{errors.expirationDate}</Text>
            ) : null}
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
            {Platform.OS === 'ios' && showDatePicker && (
              <TouchableOpacity
                style={styles.datePickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Reminder */}
          <View style={styles.field}>
            <Text style={styles.label}>Reminder</Text>
            <View style={styles.reminderChips}>
              {REMINDER_PRESETS.map((preset) => {
                const isSelected =
                  !showCustomReminder && activeReminderDays === preset.days;
                return (
                  <TouchableOpacity
                    key={preset.days}
                    style={[styles.reminderChip, isSelected && styles.reminderChipSelected]}
                    onPress={() => {
                      setReminderDays(preset.days);
                      setShowCustomReminder(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.reminderChipText,
                        isSelected && styles.reminderChipTextSelected,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.reminderChip, showCustomReminder && styles.reminderChipSelected]}
                onPress={() => setShowCustomReminder(true)}
              >
                <Text
                  style={[
                    styles.reminderChipText,
                    showCustomReminder && styles.reminderChipTextSelected,
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
            {showCustomReminder && (
              <View style={styles.customReminderRow}>
                <TextInput
                  style={styles.customReminderInput}
                  placeholder="Days before"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="number-pad"
                  value={customReminder}
                  onChangeText={setCustomReminder}
                />
                <Text style={styles.customReminderLabel}>days before expiry</Text>
              </View>
            )}
          </View>

          {/* Notes — collapsed by default */}
          <View style={styles.field}>
            <TouchableOpacity
              style={styles.notesToggle}
              onPress={() => setShowNotes((s) => !s)}
            >
              <Text style={styles.label}>Notes</Text>
              <Ionicons
                name={showNotes ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#9E9E9E"
              />
            </TouchableOpacity>
            {showNotes && (
              <TextInput
                style={styles.notesInput}
                placeholder="Optional — any extra info about this credit"
                placeholderTextColor="#9E9E9E"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#212121' },
  saveButton: { fontSize: 16, fontWeight: '600', color: SAGE_TEAL },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 20, paddingBottom: 40 },

  // Photo
  photoSection: { alignItems: 'center', gap: 12 },
  photoContainer: { position: 'relative' },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    padding: 6,
  },
  photoPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    gap: 8,
  },
  photoPlaceholderText: { fontSize: 14, color: SAGE_TEAL, fontWeight: '500' },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  galleryButtonText: { fontSize: 14, color: SAGE_TEAL, fontWeight: '500' },

  // Fields
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#424242' },
  inputError: { borderColor: '#D32F2F' },
  errorText: { fontSize: 12, color: '#D32F2F' },

  // Amount
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    gap: 6,
  },
  currencySymbol: { fontSize: 18, color: '#424242', fontWeight: '500' },
  amountInput: { flex: 1, fontSize: 18, color: '#212121' },

  // Date
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    gap: 10,
  },
  dateButtonText: { fontSize: 16, color: '#212121' },
  datePlaceholder: { color: '#9E9E9E' },
  datePickerDone: { alignItems: 'flex-end', paddingVertical: 8 },
  datePickerDoneText: { fontSize: 16, color: SAGE_TEAL, fontWeight: '600' },

  // Reminder chips
  reminderChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reminderChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  reminderChipSelected: { backgroundColor: SAGE_TEAL, borderColor: SAGE_TEAL },
  reminderChipText: { fontSize: 13, color: '#616161' },
  reminderChipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  customReminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  customReminderInput: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#212121',
    backgroundColor: '#FAFAFA',
    textAlign: 'center',
  },
  customReminderLabel: { fontSize: 14, color: '#757575' },

  // Notes
  notesToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notesInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 15,
    color: '#212121',
    backgroundColor: '#FAFAFA',
    textAlignVertical: 'top',
  },
});
