import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useStepAnimation } from '@/hooks/useStepAnimation';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  Pressable,
  I18nManager,
  Keyboard,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StepFormScreen } from '@/components/redeemy/StepFormScreen';
import { StepDatePicker } from '@/components/redeemy/StepDatePicker';
import { createOccasion, updateOccasion } from '@/lib/firestoreOccasions';
import { scheduleOccasionNotifications, cancelOccasionNotifications } from '@/lib/occasionNotifications';
import { toHebrewDate, formatHebrewDate } from '@/lib/hebrewDate';
import { useAuthStore } from '@/stores/authStore';
import { useOccasionsStore } from '@/stores/occasionsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { showToast } from '@/stores/toastStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFormExitConfirmation } from '@/hooks/useFormExitConfirmation';
import { formatDate } from '@/lib/formatDate';
import { type Occasion, type OccasionType } from '@/types/occasionTypes';
import type { AppColors } from '@/constants/colors';
import { normalizeTimestampOrNow } from "@/lib/dateUtils";

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

type StepId = 'type' | 'name' | 'label' | 'date' | 'summary';

function getSteps(type: OccasionType): StepId[] {
  if (type === 'other') return ['type', 'label', 'name', 'date', 'summary'];
  return ['type', 'name', 'date', 'summary'];
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
    stepSub: {
      fontSize: 15,
      color: colors.textSecondary,
      alignSelf: 'flex-start',
      marginBottom: 2,
    },
    hebrewPreview: {
      fontSize: 13,
      color: colors.textTertiary,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    calendarChips: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    calendarChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.separator,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    calendarChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySurface,
    },
    calendarChipText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
    calendarChipTextActive: { color: colors.primary },
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

    // Choice cards (type step)
    choiceCards: { gap: 12 },
    choiceCard: {
      borderWidth: 2,
      borderRadius: 20,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderColor: colors.separator,
      backgroundColor: colors.surface,
    },
    choiceCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySurface,
    },
    choiceCardIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    choiceCardIconSelected: { backgroundColor: colors.primarySurface },
    choiceCardLabel: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    choiceCardLabelSelected: { color: colors.primary },

    // Name step
    nameInput: {
      height: 56,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 18,
      fontWeight: '500',
      color: colors.textPrimary,
      backgroundColor: colors.background,
      textAlign: isRTL ? 'right' : 'left',
      marginBottom: 12,
    },

    nameNoteLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textTertiary,
      alignSelf: 'flex-start',
      marginBottom: 6,
      marginTop: 8,
    },
    nameNoteInput: {
      height: 48,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      textAlign: isRTL ? 'right' : 'left',
    },

    // Hebrew date step
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 12,
    },
    hebrewDateBadge: {
      marginTop: 12,
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.primarySurface,
      borderWidth: 1,
      borderColor: colors.primary,
      gap: 4,
    },
    hebrewDateLabel: { fontSize: 13, color: colors.primary, fontWeight: '500', alignSelf: 'flex-start' },
    hebrewDateValue: { fontSize: 20, fontWeight: '700', color: colors.primary, alignSelf: 'flex-start' },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.separator,
      marginVertical: 4,
    },

    // Summary
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

export default function AddOccasionScreen() {
  const router = useRouter();
  const { occasionId } = useLocalSearchParams<{ occasionId?: string }>();
  const isEditing = !!occasionId;
  const colors = useAppTheme();
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);

  const currentUser = useAuthStore((s) => s.currentUser);
  const familyId = useSettingsStore((s) => s.familyId);
  const addOccasionToStore = useOccasionsStore((s) => s.addOccasion);
  const removeOccasionFromStore = useOccasionsStore((s) => s.removeOccasion);
  const updateOccasionInStore = useOccasionsStore((s) => s.updateOccasion);
  const existingOccasion = useOccasionsStore((s) =>
    occasionId ? s.occasions.find((o) => o.id === occasionId) : undefined
  );

  // Form state
  const [occasionType, setOccasionType] = useState<OccasionType>('birthday');
  const [name, setName] = useState('');
  const [nameNote, setNameNote] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [eventDate, setEventDate] = useState(new Date(new Date().getFullYear() - 1, 0, 1));
  const [afterSunset, setAfterSunset] = useState(false);
  const [useHebrewDate, setUseHebrewDate] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Step state
  const steps = useMemo(() => getSteps(occasionType), [occasionType]);
  const [currentStepId, setCurrentStepId] = useState<StepId>('type');
  const currentStepIndex = steps.indexOf(currentStepId);
  const { fadeAnim, slideAnim, animateTransition } = useStepAnimation();
  const summaryScrollRef = useRef<ScrollView>(null);

  useFormExitConfirmation(
    !isEditing && !saving && (name.trim().length > 0 || currentStepIndex > 0),
  );

  // Pre-fill for edit mode
  useEffect(() => {
    if (!isEditing || !existingOccasion) return;
    setOccasionType(existingOccasion.type);
    setName(existingOccasion.name);
    if (existingOccasion.nameNote) setNameNote(existingOccasion.nameNote);
    if (existingOccasion.customLabel) setCustomLabel(existingOccasion.customLabel);
    const d = normalizeTimestampOrNow(existingOccasion.eventDate);
    setEventDate(d);
    setAfterSunset(existingOccasion.afterSunset);
    setUseHebrewDate(existingOccasion.useHebrewDate);
    if (existingOccasion.notes) setNotes(existingOccasion.notes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Computed Hebrew date (for saving/summary — respects useHebrewDate + afterSunset)
  const hebrewDate = useMemo(() => {
    if (!useHebrewDate) return null;
    try { return toHebrewDate(eventDate, afterSunset); } catch { return null; }
  }, [eventDate, afterSunset, useHebrewDate]);

  const hebrewDateDisplay = useMemo(() => {
    if (!hebrewDate) return null;
    try { return formatHebrewDate(hebrewDate); } catch { return null; }
  }, [hebrewDate]);

  // Always-on Hebrew date for the date picker step (no sunset shift — just for reference)
  const hebrewDatePreview = useMemo(() => {
    try { return formatHebrewDate(toHebrewDate(eventDate, false)); } catch { return null; }
  }, [eventDate]);

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

  function handleContinue() { goNext(); }

  // ---------------------------------------------------------------------------
  // Can continue
  // ---------------------------------------------------------------------------

  const canContinue = useMemo(() => {
    switch (currentStepId) {
      case 'type':
        return true;
      case 'name':
        return name.trim().length > 0;
      case 'label':
        return customLabel.trim().length > 0;
      case 'date':
        return true;
      default:
        return false;
    }
  }, [currentStepId, name, customLabel, occasionType]);

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function handleSave() {
    if (!currentUser) return;
    if (useUIStore.getState().offlineMode) {
      Alert.alert(t('offline.title'), t('offline.cannotSave'));
      return;
    }
    setSaving(true);

    const displayName = currentUser.displayName ?? currentUser.email?.split('@')[0] ?? 'Member';
    const data: Omit<Occasion, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: currentUser.uid,
      type: occasionType,
      name: name.trim(),
      eventDate,
      afterSunset,
      useHebrewDate,
      ...(occasionType === 'other' && customLabel.trim() ? { customLabel: customLabel.trim() } : {}),
      ...(nameNote.trim() ? { nameNote: nameNote.trim() } : {}),
      ...(hebrewDateDisplay ? { hebrewDateStr: hebrewDateDisplay } : {}),
      ...(hebrewDate ? { hebrewDay: hebrewDate.getDate(), hebrewMonth: hebrewDate.getMonth() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(familyId ? { familyId, createdBy: currentUser.uid, createdByName: displayName } : {}),
    };

    if (isEditing && existingOccasion) {
      try {
        updateOccasionInStore(existingOccasion.id, data);
        await cancelOccasionNotifications(existingOccasion.notificationIds);
        const ids = await scheduleOccasionNotifications({ ...data, id: existingOccasion.id, createdAt: existingOccasion.createdAt, updatedAt: new Date() });
        updateOccasionInStore(existingOccasion.id, { notificationIds: ids });
        await updateOccasion(existingOccasion.id, { ...data, notificationIds: ids });
        showToast(t('toasts.updated.occasion'));
        router.back();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        updateOccasionInStore(existingOccasion.id, existingOccasion as Partial<Occasion>);
        setSaving(false);
        Alert.alert(t('addOccasion.error.save'), errMsg || t('addOccasion.error.saveMessage'));
      }
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: Occasion = {
      ...data,
      id: tempId,
      notificationIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addOccasionToStore(optimistic);

    try {
      const newId = await createOccasion(data);
      const fullOccasion: Occasion = { ...data, id: newId, notificationIds: [], createdAt: new Date(), updatedAt: new Date() };
      const ids = await scheduleOccasionNotifications(fullOccasion);
      // Post-create system fixup — already logged item_created from createOccasion.
      if (ids.length) await updateOccasion(newId, { notificationIds: ids }, { silent: true });
      removeOccasionFromStore(tempId);
      showToast(t('toasts.created.occasion'));
      router.back();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      removeOccasionFromStore(tempId);
      setSaving(false);
      Alert.alert(t('addOccasion.error.save'), errMsg || t('addOccasion.error.saveMessage'));
    }
  }

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  type OccasionChoice = {
    type: OccasionType;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
  };

  function renderTypeStep() {
    const choices: OccasionChoice[] = [
      { type: 'birthday', icon: 'gift-outline', label: t('occasions.types.birthday') },
      { type: 'anniversary', icon: 'heart-outline', label: t('occasions.types.anniversary') },
      { type: 'yahrzeit', icon: 'flame-outline', label: t('occasions.types.yahrzeit') },
      { type: 'other', icon: 'star-outline', label: t('occasions.types.other') },
    ];

    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>{t('addOccasion.step.type')}</Text>
        <View style={styles.choiceCards}>
          {choices.map((c) => {
            const selected = occasionType === c.type;
            return (
              <Pressable
                key={c.type}
                style={[styles.choiceCard, selected && styles.choiceCardSelected]}
                onPress={() => setOccasionType(c.type)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <View style={[styles.choiceCardIcon, selected && styles.choiceCardIconSelected]}>
                  <Ionicons name={c.icon} size={24} color={selected ? colors.primary : colors.textSecondary} />
                </View>
                <Text style={[styles.choiceCardLabel, selected && styles.choiceCardLabelSelected]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  function renderNameStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addOccasion.step.name')}</Text>
        <TextInput
          style={styles.nameInput}
          placeholder={t('addOccasion.namePlaceholder')}
          placeholderTextColor={colors.textTertiary}
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="words"
          returnKeyType="next"
        />
        <Text style={styles.nameNoteLabel}>{`${t('addOccasion.nameNote.label')} (${t('addOccasion.nameNote.optional')})`}</Text>
        <TextInput
          style={styles.nameNoteInput}
          placeholder={t('addOccasion.nameNote.placeholder')}
          placeholderTextColor={colors.textTertiary}
          value={nameNote}
          onChangeText={setNameNote}
          autoCapitalize="sentences"
          returnKeyType="done"
        />
      </ScrollView>
    );
  }

  function renderLabelStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addOccasion.step.label')}</Text>
        <TextInput
          style={styles.nameInput}
          placeholder={t('addOccasion.customLabelPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          value={customLabel}
          onChangeText={setCustomLabel}
          autoFocus
          autoCapitalize="sentences"
          returnKeyType="done"
        />
      </ScrollView>
    );
  }

  function renderDateStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addOccasion.step.date')}</Text>
        <Text style={styles.stepSub}>{formatDate(eventDate, dateFormat)}</Text>

        <StepDatePicker
          value={eventDate}
          onChange={setEventDate}
          isActive={currentStepId === 'date'}
          maximumDate={new Date()}
        />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' }}>
              {t('addOccasion.useHebrewDate')}
            </Text>
          </View>
          <Switch
            style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
            value={useHebrewDate}
            onValueChange={setUseHebrewDate}
            trackColor={{ false: colors.separator, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {useHebrewDate && (
          <>
            <View style={styles.separator} />
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' }}>
                  {t('addOccasion.afterSunset')}
                </Text>
              </View>
              <Switch
                style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
                value={afterSunset}
                onValueChange={setAfterSunset}
                trackColor={{ false: colors.separator, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {hebrewDateDisplay && (
              <View style={styles.hebrewDateBadge}>
                <Text style={styles.hebrewDateLabel}>{t('addOccasion.hebrewDateConfirm')}</Text>
                <Text style={styles.hebrewDateValue}>{hebrewDateDisplay}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  }

  function renderSummaryStep() {
    const typeLabel = t(`occasions.types.${occasionType}`);
    return (
      <ScrollView ref={summaryScrollRef} style={styles.stepScroll} contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>{t('addOccasion.step.summary')}</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addOccasion.summary.type')}</Text>
            <Text style={styles.summaryValue}>{typeLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addOccasion.summary.name')}</Text>
            <Text style={styles.summaryValue}>
              {name}{nameNote ? ` (${nameNote})` : ''}{occasionType === 'other' && customLabel ? ` — ${customLabel}` : ''}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addOccasion.summary.date')}</Text>
            <Text style={styles.summaryValue}>{formatDate(eventDate, dateFormat)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>{t('addOccasion.summary.reminder')}</Text>
            <Text style={styles.summaryValue}>
              {useHebrewDate && hebrewDateDisplay
                ? t('addOccasion.summary.hebrewReminder', { date: hebrewDateDisplay })
                : t('addOccasion.summary.gregorianReminder')}
            </Text>
          </View>
        </View>

        <Text style={styles.notesLabel}>{t('addOccasion.summary.notes')}</Text>
        <TextInput
          style={styles.notesInput}
          placeholder={t('addOccasion.notesPlaceholder')}
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
      case 'type': return renderTypeStep();
      case 'name': return renderNameStep();
      case 'label': return renderLabelStep();
      case 'date': return renderDateStep();
      case 'summary': return renderSummaryStep();
    }
  }

  // ---------------------------------------------------------------------------
  // Footer button
  // ---------------------------------------------------------------------------

  function renderFooterButton() {

    if (currentStepId === 'summary') {
      return (
        <TouchableOpacity style={styles.continueBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.continueBtnText}>{t('addOccasion.save')}</Text>}
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
        <Text style={styles.continueBtnText}>{t('addOccasion.continue')}</Text>
      </TouchableOpacity>
    );
  }

  const headerTitle = isEditing ? t('addOccasion.titleEdit') : t('addOccasion.title');

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
    >
      {renderCurrentStep()}
    </StepFormScreen>
  );
}
