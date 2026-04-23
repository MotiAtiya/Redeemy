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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ServiceAutocomplete } from '@/components/redeemy/ServiceAutocomplete';
import { CurrencyPicker } from '@/components/redeemy/CurrencyPicker';
import { StepProgressBar } from '@/components/redeemy/StepProgressBar';
import { createSubscription, updateSubscription } from '@/lib/firestoreSubscriptions';
import { computeCommitmentEndDate } from '@/lib/subscriptionUtils';
import {
  scheduleSubscriptionNotifications,
  cancelSubscriptionNotifications,
} from '@/lib/subscriptionNotifications';
import { parseAmountToAgot } from '@/constants/currencies';
import { formatCurrency } from '@/lib/formatCurrency';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore, CURRENCY_SYMBOLS, type CurrencyCode } from '@/stores/settingsStore';
import {
  SubscriptionBillingCycle,
  SubscriptionStatus,
  type Subscription,
} from '@/types/subscriptionTypes';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptionCategories';
import { SUBSCRIPTION_REMINDER_PRESETS } from '@/constants/subscriptionReminders';
import { formatDate } from '@/lib/formatDate';
import type { AppColors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Day wheel picker (max 28)
// ---------------------------------------------------------------------------

const DAY_ITEM_H = 52;
const DAY_VISIBLE = 5;

interface DayWheelPickerProps {
  value: number;
  onChange: (day: number) => void;
  colors: AppColors;
}

function DayWheelPicker({ value, onChange, colors }: DayWheelPickerProps) {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const center = Math.floor(DAY_VISIBLE / 2);

  function handleScrollEnd(e: { nativeEvent: { contentOffset: { y: number } } }) {
    const index = Math.round(e.nativeEvent.contentOffset.y / DAY_ITEM_H);
    const clamped = Math.max(0, Math.min(27, index));
    onChange(clamped + 1);
  }

  return (
    <View style={{ height: DAY_ITEM_H * DAY_VISIBLE, overflow: 'hidden', borderRadius: 14, backgroundColor: colors.surface }}>
      <View
        style={{
          position: 'absolute', left: 32, right: 32,
          top: DAY_ITEM_H * center, height: DAY_ITEM_H,
          backgroundColor: colors.primarySurface, borderRadius: 10,
        }}
        pointerEvents="none"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={DAY_ITEM_H}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: (value - 1) * DAY_ITEM_H }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: DAY_ITEM_H * center }}
      >
        {days.map((day) => {
          const sel = day === value;
          return (
            <View key={day} style={{ height: DAY_ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: sel ? 26 : 18, fontWeight: sel ? '700' : '400', color: sel ? colors.primary : colors.textTertiary }}>
                {day}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Month wheel picker
// ---------------------------------------------------------------------------

interface MonthWheelPickerProps {
  value: number;
  onChange: (month: number) => void;
  max?: number;
  colors: AppColors;
  labelFn: (n: number) => string;
}

function MonthWheelPicker({ value, onChange, max = 36, colors, labelFn }: MonthWheelPickerProps) {
  const months = Array.from({ length: max }, (_, i) => i + 1);
  const center = Math.floor(DAY_VISIBLE / 2);

  function handleScrollEnd(e: { nativeEvent: { contentOffset: { y: number } } }) {
    const index = Math.round(e.nativeEvent.contentOffset.y / DAY_ITEM_H);
    const clamped = Math.max(0, Math.min(max - 1, index));
    onChange(clamped + 1);
  }

  return (
    <View style={{ height: DAY_ITEM_H * DAY_VISIBLE, overflow: 'hidden', borderRadius: 14, backgroundColor: colors.surface }}>
      <View
        style={{
          position: 'absolute', left: 32, right: 32,
          top: DAY_ITEM_H * center, height: DAY_ITEM_H,
          backgroundColor: colors.primarySurface, borderRadius: 10,
        }}
        pointerEvents="none"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={DAY_ITEM_H}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: (value - 1) * DAY_ITEM_H }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: DAY_ITEM_H * center }}
      >
        {months.map((m) => {
          const sel = m === value;
          return (
            <View key={m} style={{ height: DAY_ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: sel ? 24 : 17, fontWeight: sel ? '700' : '400', color: sel ? colors.primary : colors.textTertiary }}>
                {labelFn(m)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step types
// ---------------------------------------------------------------------------

type StepId =
  | 'serviceName'
  | 'category'
  | 'accessType'
  | 'freeReminderInterval'
  | 'periodicReminderInterval'
  | 'specialPeriodQuestion'
  | 'specialPeriodDetails'
  | 'regularAmount'
  | 'amount'
  | 'billingCycle'
  | 'monthlyStructure'
  | 'commitmentMonths'
  | 'billingDay'
  | 'annualBillingDate'
  | 'renewalType'
  | 'reminder'
  | 'notesQuestion'
  | 'notesInput'
  | 'summary';

type FlowState = {
  accessType: 'free' | 'paid' | null;
  hasSpecialPeriod: boolean | null;
  billingCycle: SubscriptionBillingCycle | null;
  monthlyStructure: 'fixed' | 'noFixed' | null;
  wantsNotes: boolean | null;
};

function getSteps(state: FlowState): StepId[] {
  const { accessType, hasSpecialPeriod, billingCycle, monthlyStructure, wantsNotes } = state;

  const steps: StepId[] = ['serviceName', 'category', 'accessType'];

  if (accessType === 'free') {
    steps.push('periodicReminderInterval', 'notesQuestion');
    if (wantsNotes === true) steps.push('notesInput');
    steps.push('summary');
    return steps;
  }

  if (accessType !== 'paid') return steps;

  steps.push('specialPeriodQuestion');
  if (hasSpecialPeriod === null) return steps;

  if (hasSpecialPeriod) {
    steps.push('specialPeriodDetails', 'regularAmount');
  } else {
    steps.push('amount');
  }

  steps.push('billingCycle');
  if (billingCycle === null) return steps;

  if (billingCycle === SubscriptionBillingCycle.MONTHLY) {
    steps.push('monthlyStructure');
    if (monthlyStructure === null) return steps;
    if (monthlyStructure === 'fixed') {
      steps.push('commitmentMonths', 'billingDay', 'renewalType', 'reminder');
    } else {
      // No fixed period → periodic review reminder (like free), not a billing countdown
      steps.push('billingDay', 'periodicReminderInterval');
    }
  } else {
    steps.push('annualBillingDate', 'renewalType', 'reminder');
  }

  steps.push('notesQuestion');
  if (wantsNotes === true) steps.push('notesInput');
  steps.push('summary');

  return steps;
}

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
    stepContainer: { flex: 1, width: screenWidth },
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
      marginTop: -8,
      marginBottom: 20,
      lineHeight: 22,
      textAlign: isRTL ? 'right' : 'left',
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

    // Big choice cards (accessType, billingCycle, monthlyStructure, renewalType)
    choiceCards: { gap: 16 },
    choiceCard: {
      borderWidth: 2,
      borderRadius: 20,
      padding: 20,
      backgroundColor: colors.background,
      borderColor: colors.separator,
    },
    choiceCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySurface,
    },
    choiceCardContent: { flex: 1, gap: 6 },
    choiceCardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      alignSelf: 'flex-start',
    },
    choiceCardTitleSelected: { color: colors.primary },
    choiceCardDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      alignSelf: 'flex-start',
    },

    // Yes/No question (specialPeriodQuestion, notesQuestion)
    questionCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      gap: 16,
    },
    questionIcon: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    questionTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    questionSub: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 16,
    },
    questionBtn: {
      width: '100%',
      height: 54,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    questionBtnSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.separator,
    },
    questionBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    questionBtnTextSecondary: { color: colors.textSecondary, fontWeight: '500' },

    // Amount input
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
    monthlyBreakdown: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 6,
      alignSelf: 'flex-start',
    },

    // Special period type chips
    typeChips: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    typeChip: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.separator,
      backgroundColor: colors.background,
      alignItems: 'center',
    },
    typeChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    typeChipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    typeChipTextSelected: { color: '#FFFFFF' },
    subLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      fontWeight: '500',
      alignSelf: 'flex-start',
      textAlign: isRTL ? 'right' : 'left',
    },

    // Billing date step
    dateButton: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      height: 52,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      gap: 10,
    },
    dateButtonText: { flex: 1, fontSize: 16, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
    datePlaceholder: { color: colors.textTertiary },
    dateError: { fontSize: 12, color: colors.danger, marginTop: 6, alignSelf: 'flex-start' },

    // Category step
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
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
    categoryCellInner: { alignItems: 'center', gap: 6 },
    categoryLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 4,
    },
    categoryLabelSelected: { color: colors.primary, fontWeight: '700' },

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
    reminderNote: {
      marginTop: 16,
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.primarySurface,
    },
    reminderNoteText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
      textAlign: isRTL ? 'right' : 'left',
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
      marginTop: 12,
    },
    toggleLabel: { fontSize: 15, color: colors.textPrimary, flex: 1, paddingEnd: 12, textAlign: isRTL ? 'right' : 'left' },

    // Notes input
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
      minHeight: 120,
      textAlignVertical: 'top',
      textAlign: isRTL ? 'right' : 'left',
    },

    // Summary step
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
      width: 90,
      textAlign: isRTL ? 'right' : 'left',
    },
    summaryValue: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
      textAlign: 'left',
    },
    summaryAmountValue: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.primary,
    },

    // Toast
    toast: {
      position: 'absolute',
      bottom: 100,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.78)',
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Given an annual signup date, advance by whole years until the date is in the future. */
function advanceToFuture(signupDate: Date): Date {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const result = new Date(signupDate); result.setHours(0, 0, 0, 0);
  while (result <= today) result.setFullYear(result.getFullYear() + 1);
  return result;
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function AddSubscriptionScreen() {
  const router = useRouter();
  const { subscriptionId } = useLocalSearchParams<{ subscriptionId?: string }>();
  const isEditing = !!subscriptionId;
  const colors = useAppTheme();
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);

  const currentUser = useAuthStore((s) => s.currentUser);
  const familyId = useSettingsStore((s) => s.familyId);
  const subscriptionsStore = useSubscriptionsStore;
  const existingSubscription = useSubscriptionsStore((s) =>
    subscriptionId ? s.subscriptions.find((sub) => sub.id === subscriptionId) : undefined
  );

  const { toastMessage, showToast } = useToast();

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------

  // Access type
  const [accessType, setAccessType] = useState<'free' | 'paid' | null>(null);

  // Service
  const [serviceName, setServiceName] = useState('');
  const [category, setCategory] = useState('other');
  const [currency, setCurrency] = useState<CurrencyCode>(
    () => useSettingsStore.getState().currency
  );

  // Periodic review reminder (free subscriptions + monthly no-fixed)
  const [periodicReminderMonths, setPeriodicReminderMonths] = useState(3);

  // Special period
  const [hasSpecialPeriod, setHasSpecialPeriod] = useState<boolean | null>(null);
  const [specialPeriodType, setSpecialPeriodType] = useState<'trial' | 'discounted' | null>(null);
  const [specialPeriodUnit, setSpecialPeriodUnit] = useState<'days' | 'months'>('months');
  const [specialPeriodMonths, setSpecialPeriodMonths] = useState(1);
  const [specialPeriodDays, setSpecialPeriodDays] = useState(7);
  const [specialAmountInput, setSpecialAmountInput] = useState('');

  // Regular amount (paid)
  const [amountInput, setAmountInput] = useState('');
  const [amountError, setAmountError] = useState('');

  // Billing
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle | null>(null);
  const [monthlyStructure, setMonthlyStructure] = useState<'fixed' | 'noFixed' | null>(null);
  const [commitmentMonths, setCommitmentMonths] = useState(12);
  const [billingDayOfMonth, setBillingDayOfMonth] = useState(1);
  const [nextBillingDate, setNextBillingDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateError, setDateError] = useState('');

  // Renewal
  const [renewalType, setRenewalType] = useState<'auto' | 'manual' | null>(null);

  // Reminder
  const [reminderDays, setReminderDays] = useState(7);
  const [reminderSpecialPeriod, setReminderSpecialPeriod] = useState(true);

  // Notes
  const [wantsNotes, setWantsNotes] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);

  // Step navigation
  const [currentStepId, setCurrentStepId] = useState<StepId>('serviceName');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const keyboardPadding = useRef(new Animated.Value(0)).current;

  const flowState: FlowState = useMemo(() => ({
    accessType,
    hasSpecialPeriod,
    billingCycle,
    monthlyStructure,
    wantsNotes,
  }), [accessType, hasSpecialPeriod, billingCycle, monthlyStructure, wantsNotes]);

  const steps = useMemo(() => getSteps(flowState), [flowState]);
  const currentStepIndex = steps.indexOf(currentStepId);

  // Keyboard tracking
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height,
        duration: (e as unknown as { duration: number }).duration ?? 250,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: 0,
        duration: (e as unknown as { duration: number }).duration ?? 250,
        useNativeDriver: false,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill billing day from trial end date (days-based trial)
  useEffect(() => {
    if (currentStepId !== 'billingDay') return;
    if (specialPeriodUnit === 'days' && specialPeriodDays > 0) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + specialPeriodDays);
      setBillingDayOfMonth(Math.min(trialEnd.getDate(), 28));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepId]);

  // Pre-fill for edit mode
  useEffect(() => {
    if (!isEditing || !existingSubscription) return;
    const s = existingSubscription;

    setServiceName(s.serviceName);
    setCategory(s.category);
    if (s.currency) setCurrency(s.currency);
    setReminderDays(s.reminderDays);
    setReminderSpecialPeriod(s.reminderSpecialPeriodEnabled ?? true);
    if (s.notes) { setNotes(s.notes); setWantsNotes(true); }

    // Access type
    if (s.isFree) {
      setAccessType('free');
      setPeriodicReminderMonths(s.freeReviewReminderMonths ?? 3);
    } else {
      setAccessType('paid');
      setAmountInput((s.amountAgorot / 100).toFixed(2));

      // Special period
      if (s.specialPeriodType === 'discounted') {
        setHasSpecialPeriod(true);
        setSpecialPeriodType('discounted');
        const unit = s.specialPeriodUnit ?? 'months';
        setSpecialPeriodUnit(unit);
        if (unit === 'days') setSpecialPeriodDays(s.specialPeriodDays ?? 7);
        else setSpecialPeriodMonths(s.specialPeriodMonths ?? 1);
        setSpecialAmountInput(((s.specialPeriodPriceAgorot ?? 0) / 100).toFixed(2));
      } else if (s.isFreeTrial || s.specialPeriodType === 'trial') {
        setHasSpecialPeriod(true);
        setSpecialPeriodType('trial');
        const unit = s.specialPeriodUnit ?? 'months';
        setSpecialPeriodUnit(unit);
        if (unit === 'days') setSpecialPeriodDays(s.specialPeriodDays ?? 7);
        else setSpecialPeriodMonths(s.specialPeriodMonths ?? s.freeTrialMonths ?? 1);
        // amountInput is the regular price after trial
        setAmountInput(((s.priceAfterTrialAgorot ?? 0) / 100).toFixed(2));
      } else {
        setHasSpecialPeriod(false);
      }

      // Billing cycle
      setBillingCycle(s.billingCycle);
      if (s.billingCycle === SubscriptionBillingCycle.MONTHLY) {
        if (s.billingDayOfMonth) setBillingDayOfMonth(Math.min(s.billingDayOfMonth, 28));
        if (s.hasFixedPeriod === false) {
          setMonthlyStructure('noFixed');
          setPeriodicReminderMonths(s.freeReviewReminderMonths ?? 3);
        } else if (s.hasFixedPeriod === true || s.commitmentMonths) {
          setMonthlyStructure('fixed');
          if (s.commitmentMonths) setCommitmentMonths(s.commitmentMonths);
        }
      } else {
        if (s.nextBillingDate) setNextBillingDate(s.nextBillingDate instanceof Date ? s.nextBillingDate : new Date(s.nextBillingDate as unknown as string));
      }

      // Renewal type
      setRenewalType(s.renewalType ?? 'auto');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 11 }),
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
  // Auto-advance handlers for tap-to-select steps
  // ---------------------------------------------------------------------------

  function handleSelectAccessType(type: 'free' | 'paid') {
    setAccessType(type);
    // Reset downstream state when switching paths
    setHasSpecialPeriod(null);
    setBillingCycle(null);
    setMonthlyStructure(null);
    setRenewalType(null);
    // Navigate directly — goNext() would use stale steps
    const nextStep: StepId = type === 'free' ? 'periodicReminderInterval' : 'specialPeriodQuestion';
    animateTransition('forward', () => setCurrentStepId(nextStep));
  }

  function handleSelectBillingCycle(cycle: SubscriptionBillingCycle) {
    setBillingCycle(cycle);
    const nextStep: StepId = cycle === SubscriptionBillingCycle.MONTHLY ? 'monthlyStructure' : 'annualBillingDate';
    animateTransition('forward', () => setCurrentStepId(nextStep));
  }

  function handleSelectMonthlyStructure(structure: 'fixed' | 'noFixed') {
    setMonthlyStructure(structure);
    const nextStep: StepId = structure === 'fixed' ? 'commitmentMonths' : 'billingDay';
    animateTransition('forward', () => setCurrentStepId(nextStep));
  }

  function handleSelectRenewalType(type: 'auto' | 'manual') {
    setRenewalType(type);
    animateTransition('forward', () => setCurrentStepId('reminder'));
  }

  // ---------------------------------------------------------------------------
  // canContinue
  // ---------------------------------------------------------------------------

  const canContinue = useMemo(() => {
    switch (currentStepId) {
      case 'serviceName':   return serviceName.trim().length > 0;
      case 'category':      return true;
      case 'freeReminderInterval':
      case 'periodicReminderInterval': return true;
      case 'specialPeriodDetails': {
        if (!specialPeriodType) return false;
        if (specialPeriodType === 'discounted') {
          const a = parseAmountToAgot(specialAmountInput);
          return !isNaN(a) && a > 0;
        }
        return true;
      }
      case 'regularAmount':
      case 'amount': {
        const a = parseAmountToAgot(amountInput);
        return !isNaN(a) && a > 0;
      }
      case 'commitmentMonths': return true;
      case 'billingDay':    return true;
      case 'annualBillingDate': return nextBillingDate !== null;
      case 'reminder':      return true;
      case 'notesInput':    return true;
      default:              return false;
    }
  }, [currentStepId, serviceName, specialPeriodType, specialAmountInput, amountInput, nextBillingDate]);

  // Monthly breakdown for ANNUAL billing
  const monthlyBreakdown = useMemo(() => {
    if (billingCycle !== SubscriptionBillingCycle.ANNUAL) return null;
    const agot = parseAmountToAgot(amountInput);
    if (isNaN(agot) || agot <= 0) return null;
    return formatCurrency(Math.round(agot / 12), CURRENCY_SYMBOLS[currency]);
  }, [billingCycle, amountInput, currency]);

  // ---------------------------------------------------------------------------
  // Date helpers
  // ---------------------------------------------------------------------------

  function isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  function onDateChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) { setNextBillingDate(date); setDateError(''); }
  }

  // ---------------------------------------------------------------------------
  // handleContinue
  // ---------------------------------------------------------------------------

  function handleContinue() {
    if (currentStepId === 'annualBillingDate' && !nextBillingDate) {
      setDateError(t('addSubscription.validation.invalidDate'));
      return;
    }
    setDateError('');
    goNext();
  }

  // ---------------------------------------------------------------------------
  // handleSave
  // ---------------------------------------------------------------------------

  async function handleSave() {
    if (!currentUser) {
      Alert.alert(t('common.error'), 'Not authenticated. Please restart the app.');
      return;
    }
    if (useUIStore.getState().offlineMode) {
      Alert.alert(
        t('offline.title'),
        isEditing ? t('addSubscription.offline.editing') : t('addSubscription.offline.adding'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    const isFree = accessType === 'free';
    const isTrialPeriod = !isFree && hasSpecialPeriod && specialPeriodType === 'trial';
    const isDiscountedPeriod = !isFree && hasSpecialPeriod && specialPeriodType === 'discounted';

    const regularAgorot = isFree ? 0 : parseAmountToAgot(amountInput);
    const specialAgorot = isDiscountedPeriod ? parseAmountToAgot(specialAmountInput) : undefined;

    // amountAgorot: for trial = 0 (free during trial), otherwise regularAgorot
    const amountAgorot = isTrialPeriod ? 0 : regularAgorot;
    const priceAfterTrialAgorot = isTrialPeriod ? regularAgorot : undefined;

    const now = new Date();

    // Compute trial end date based on unit
    let trialEndsDate: Date | undefined;
    if (isTrialPeriod || isDiscountedPeriod) {
      if (specialPeriodUnit === 'days' && specialPeriodDays > 0) {
        trialEndsDate = new Date(now);
        trialEndsDate.setDate(trialEndsDate.getDate() + specialPeriodDays);
      } else if (specialPeriodMonths > 0) {
        trialEndsDate = new Date(now.getFullYear(), now.getMonth() + specialPeriodMonths, now.getDate());
      }
    }

    const specialMonths = hasSpecialPeriod && specialPeriodUnit === 'months' ? specialPeriodMonths : undefined;

    const realNextBillingDate = nextBillingDate ? advanceToFuture(nextBillingDate) : undefined;

    // Compute commitmentEndDate for monthly fixed
    let commitmentEndDate: Date | undefined;
    const resolvedBillingCycle = isFree
      ? SubscriptionBillingCycle.MONTHLY
      : billingCycle ?? SubscriptionBillingCycle.MONTHLY;

    if (resolvedBillingCycle === SubscriptionBillingCycle.MONTHLY && monthlyStructure === 'fixed') {
      const day = billingDayOfMonth;
      const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
      const yr = now.getFullYear(), mo = now.getMonth();
      const thisMonth = new Date(yr, mo, Math.min(day, lastDay(yr, mo)));
      const firstBilling = thisMonth > now
        ? thisMonth
        : (() => {
            const nm = mo + 1 > 11 ? 0 : mo + 1;
            const ny = mo + 1 > 11 ? yr + 1 : yr;
            return new Date(ny, nm, Math.min(day, lastDay(ny, nm)));
          })();
      commitmentEndDate = computeCommitmentEndDate(firstBilling, commitmentMonths);
    }

    const subscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: currentUser.uid,
      serviceName: serviceName.trim(),
      billingCycle: resolvedBillingCycle,
      amountAgorot,
      currency: isFree ? undefined : currency,
      isFree,
      isFreeTrial: isTrialPeriod ?? false,
      specialPeriodType: hasSpecialPeriod ? (specialPeriodType ?? undefined) : undefined,
      specialPeriodUnit: hasSpecialPeriod ? specialPeriodUnit : undefined,
      specialPeriodMonths: specialMonths,
      specialPeriodDays: hasSpecialPeriod && specialPeriodUnit === 'days' ? specialPeriodDays : undefined,
      specialPeriodPriceAgorot: specialAgorot,
      priceAfterTrialAgorot,
      trialEndsDate,
      freeTrialMonths: isTrialPeriod && specialPeriodUnit === 'months' ? specialMonths : undefined,
      billingDayOfMonth:
        resolvedBillingCycle === SubscriptionBillingCycle.MONTHLY
          ? billingDayOfMonth
          : undefined,
      hasFixedPeriod:
        resolvedBillingCycle === SubscriptionBillingCycle.MONTHLY
          ? monthlyStructure === 'fixed'
          : undefined,
      commitmentMonths:
        resolvedBillingCycle === SubscriptionBillingCycle.MONTHLY && monthlyStructure === 'fixed'
          ? commitmentMonths
          : undefined,
      commitmentEndDate,
      nextBillingDate:
        resolvedBillingCycle === SubscriptionBillingCycle.ANNUAL ? realNextBillingDate : undefined,
      renewalType: isFree ? undefined : (monthlyStructure === 'noFixed' ? undefined : (renewalType ?? 'auto')),
      freeReviewReminderMonths:
        isFree || (resolvedBillingCycle === SubscriptionBillingCycle.MONTHLY && monthlyStructure === 'noFixed')
          ? periodicReminderMonths
          : undefined,
      category,
      status: SubscriptionStatus.ACTIVE,
      reminderDays,
      reminderSpecialPeriodEnabled: hasSpecialPeriod ? reminderSpecialPeriod : undefined,
      notificationIds: [],
      notes: notes.trim() || undefined,
      ...(familyId
        ? { familyId, createdBy: currentUser.uid, createdByName: currentUser.displayName ?? '' }
        : {}),
    };

    setSaving(true);

    if (isEditing && existingSubscription) {
      try {
        subscriptionsStore.getState().updateSubscription(existingSubscription.id, subscriptionData);
        await updateSubscription(existingSubscription.id, subscriptionData);
        await cancelSubscriptionNotifications(existingSubscription);
        const scheduled = await scheduleSubscriptionNotifications({
          id: existingSubscription.id,
          ...subscriptionData,
        });
        await updateSubscription(existingSubscription.id, {
          notificationIds: scheduled.notificationIds,
          renewalNotificationId: scheduled.renewalNotificationId,
          specialPeriodNotificationId: scheduled.specialPeriodNotificationId,
        });
        showToast(t('addSubscription.savedToast'));
        setTimeout(() => router.back(), 300);
      } catch (err) {
        console.error('[AddSubscription] updateSubscription failed:', err);
        subscriptionsStore.getState().updateSubscription(existingSubscription.id, existingSubscription);
        setSaving(false);
        const errMsg = err instanceof Error ? err.message : String(err);
        Alert.alert(t('addSubscription.error.save'), errMsg || t('addSubscription.error.saveMessage'));
      }
      return;
    }

    // Create new — optimistic
    const tempId = `temp-${Date.now()}`;
    const optimistic: Subscription = {
      ...subscriptionData,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    } as Subscription;

    subscriptionsStore.getState().addSubscription(optimistic);

    try {
      const newId = await createSubscription(subscriptionData);
      subscriptionsStore.getState().removeSubscription(tempId);
      if (newId) {
        const scheduled = await scheduleSubscriptionNotifications({
          id: newId,
          ...subscriptionData,
        });
        await updateSubscription(newId, {
          notificationIds: scheduled.notificationIds,
          renewalNotificationId: scheduled.renewalNotificationId,
          specialPeriodNotificationId: scheduled.specialPeriodNotificationId,
        });
      }
      showToast(t('addSubscription.savedToast'));
      setTimeout(() => router.back(), 300);
    } catch (err) {
      console.error('[AddSubscription] createSubscription failed:', err);
      subscriptionsStore.getState().removeSubscription(tempId);
      setSaving(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      Alert.alert(t('addSubscription.error.save'), errMsg || t('addSubscription.error.saveMessage'));
    }
  }

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  function renderServiceNameStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.serviceName')}</Text>
        <ServiceAutocomplete
          value={serviceName}
          onChange={setServiceName}
          onSelectSuggestion={(_name, categoryId) => { if (categoryId) setCategory(categoryId); }}
          autoFocus
        />
      </ScrollView>
    );
  }

  function renderCategoryStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.category')}</Text>
        <View style={styles.categoryGrid}>
          {SUBSCRIPTION_CATEGORIES.map((cat) => {
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
                  <Ionicons name={cat.icon} size={26} color={isSelected ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]} numberOfLines={2}>
                    {t('subscriptions.category.' + cat.id)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  function renderAccessTypeStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.accessType')}</Text>
        <View style={styles.choiceCards}>
          <Pressable
            style={[styles.choiceCard, accessType === 'paid' && styles.choiceCardSelected]}
            onPress={() => handleSelectAccessType('paid')}
            accessibilityRole="radio"
            accessibilityState={{ checked: accessType === 'paid' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, accessType === 'paid' && styles.choiceCardTitleSelected]}>
                {t('addSubscription.accessType.paid')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.accessType.paidDesc')}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.choiceCard, accessType === 'free' && styles.choiceCardSelected]}
            onPress={() => handleSelectAccessType('free')}
            accessibilityRole="radio"
            accessibilityState={{ checked: accessType === 'free' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, accessType === 'free' && styles.choiceCardTitleSelected]}>
                {t('addSubscription.accessType.free')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.accessType.freeDesc')}</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderPeriodicReminderIntervalStep() {
    const isFreeCtx = accessType === 'free';
    const showSpecialPeriodToggle = hasSpecialPeriod === true;

    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.periodicReminderInterval')}</Text>
        <Text style={styles.stepSub}>
          {isFreeCtx
            ? t('addSubscription.periodicReminder.subFree')
            : t('addSubscription.periodicReminder.subPaid')}
        </Text>
        <MonthWheelPicker
          value={periodicReminderMonths}
          onChange={setPeriodicReminderMonths}
          max={12}
          colors={colors}
          labelFn={(n) => t('addSubscription.periodicReminder.option', { count: n })}
        />

        {/* Special period end reminder toggle — shown when there's a trial/discounted period */}
        {showSpecialPeriodToggle && (
          <>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('addSubscription.reminder.specialPeriodToggle')}</Text>
              <Switch
                value={reminderSpecialPeriod}
                onValueChange={setReminderSpecialPeriod}
                trackColor={{ false: colors.separator, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            {reminderSpecialPeriod && (
              <View style={styles.reminderNote}>
                <Text style={styles.reminderNoteText}>{t('addSubscription.reminder.specialPeriodNote')}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  }

  function renderSpecialPeriodQuestionStep() {
    return (
      <View style={[styles.stepContent, styles.questionCenter]}>
        <View style={styles.questionIcon}>
          <Ionicons name="gift-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.questionTitle}>{t('addSubscription.specialPeriodQuestion.title')}</Text>
        <Text style={styles.questionSub}>{t('addSubscription.specialPeriodQuestion.sub')}</Text>
        <TouchableOpacity
          style={styles.questionBtn}
          onPress={() => {
            setHasSpecialPeriod(true);
            animateTransition('forward', () => setCurrentStepId('specialPeriodDetails'));
          }}
        >
          <Text style={styles.questionBtnText}>{t('addSubscription.specialPeriodQuestion.yes')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.questionBtn, styles.questionBtnSecondary]}
          onPress={() => {
            setHasSpecialPeriod(false);
            animateTransition('forward', () => setCurrentStepId('amount'));
          }}
        >
          <Text style={[styles.questionBtnText, styles.questionBtnTextSecondary]}>
            {t('addSubscription.specialPeriodQuestion.no')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSpecialPeriodDetailsStep() {
    const sym = CURRENCY_SYMBOLS[currency];
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.specialPeriodDetails')}</Text>

        {/* Type selector */}
        <Text style={styles.subLabel}>{t('addSubscription.specialPeriod.typeTrial')}/{t('addSubscription.specialPeriod.typeDiscounted')}</Text>
        <View style={styles.typeChips}>
          <Pressable
            style={[styles.typeChip, specialPeriodType === 'trial' && styles.typeChipSelected]}
            onPress={() => setSpecialPeriodType('trial')}
          >
            <Text style={[styles.typeChipText, specialPeriodType === 'trial' && styles.typeChipTextSelected]}>
              {t('addSubscription.specialPeriod.typeTrial')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeChip, specialPeriodType === 'discounted' && styles.typeChipSelected]}
            onPress={() => setSpecialPeriodType('discounted')}
          >
            <Text style={[styles.typeChipText, specialPeriodType === 'discounted' && styles.typeChipTextSelected]}>
              {t('addSubscription.specialPeriod.typeDiscounted')}
            </Text>
          </Pressable>
        </View>

        {/* Duration unit selector */}
        <Text style={styles.subLabel}>{t('addSubscription.specialPeriod.durationLabel')}</Text>
        <View style={[styles.typeChips, { marginBottom: 12 }]}>
          <Pressable
            style={[styles.typeChip, specialPeriodUnit === 'months' && styles.typeChipSelected]}
            onPress={() => setSpecialPeriodUnit('months')}
          >
            <Text style={[styles.typeChipText, specialPeriodUnit === 'months' && styles.typeChipTextSelected]}>
              {t('addSubscription.specialPeriod.unitMonths')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeChip, specialPeriodUnit === 'days' && styles.typeChipSelected]}
            onPress={() => setSpecialPeriodUnit('days')}
          >
            <Text style={[styles.typeChipText, specialPeriodUnit === 'days' && styles.typeChipTextSelected]}>
              {t('addSubscription.specialPeriod.unitDays')}
            </Text>
          </Pressable>
        </View>

        {/* Duration picker */}
        {specialPeriodUnit === 'months' ? (
          <MonthWheelPicker
            value={specialPeriodMonths}
            onChange={setSpecialPeriodMonths}
            max={24}
            colors={colors}
            labelFn={(n) => t('addSubscription.commitmentMonths.option', { count: n })}
          />
        ) : (
          <MonthWheelPicker
            value={specialPeriodDays}
            onChange={setSpecialPeriodDays}
            max={90}
            colors={colors}
            labelFn={(n) => t('addSubscription.specialPeriod.daysOption', { count: n })}
          />
        )}

        {/* Price (only if discounted) */}
        {specialPeriodType === 'discounted' && (
          <>
            <Text style={[styles.subLabel, { marginTop: 20 }]}>{t('addSubscription.specialPeriod.priceLabel')}</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.amountSymbol}>{sym}</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={specialAmountInput}
                onChangeText={setSpecialAmountInput}
              />
            </View>
            <CurrencyPicker value={currency} onChange={setCurrency} />
          </>
        )}
      </ScrollView>
    );
  }

  function renderAmountStep(isRegularAmount = false) {
    const sym = CURRENCY_SYMBOLS[currency];
    const titleKey = isRegularAmount ? 'addSubscription.step.regularAmount' : 'addSubscription.step.amount';
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t(titleKey)}</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.amountSymbol}>{sym}</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            value={amountInput}
            onChangeText={(v) => { setAmountInput(v); setAmountError(''); }}
            autoFocus
          />
        </View>
        {!!amountError && <Text style={styles.amountError}>{amountError}</Text>}
        <CurrencyPicker value={currency} onChange={setCurrency} />
        {monthlyBreakdown && (
          <Text style={styles.monthlyBreakdown}>
            {t('addSubscription.amount.monthlyBreakdown', { amount: monthlyBreakdown })}
          </Text>
        )}
      </ScrollView>
    );
  }

  function renderBillingCycleStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.billingCycle')}</Text>
        <View style={styles.choiceCards}>
          <Pressable
            style={[styles.choiceCard, billingCycle === SubscriptionBillingCycle.MONTHLY && styles.choiceCardSelected]}
            onPress={() => handleSelectBillingCycle(SubscriptionBillingCycle.MONTHLY)}
            accessibilityRole="radio"
            accessibilityState={{ checked: billingCycle === SubscriptionBillingCycle.MONTHLY }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, billingCycle === SubscriptionBillingCycle.MONTHLY && styles.choiceCardTitleSelected]}>
                {t('addSubscription.billingCycle.monthly')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.billingCycle.monthlyDesc')}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.choiceCard, billingCycle === SubscriptionBillingCycle.ANNUAL && styles.choiceCardSelected]}
            onPress={() => handleSelectBillingCycle(SubscriptionBillingCycle.ANNUAL)}
            accessibilityRole="radio"
            accessibilityState={{ checked: billingCycle === SubscriptionBillingCycle.ANNUAL }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, billingCycle === SubscriptionBillingCycle.ANNUAL && styles.choiceCardTitleSelected]}>
                {t('addSubscription.billingCycle.annual')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.billingCycle.annualDesc')}</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderMonthlyStructureStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.monthlyStructure')}</Text>
        <View style={styles.choiceCards}>
          <Pressable
            style={[styles.choiceCard, monthlyStructure === 'noFixed' && styles.choiceCardSelected]}
            onPress={() => handleSelectMonthlyStructure('noFixed')}
            accessibilityRole="radio"
            accessibilityState={{ checked: monthlyStructure === 'noFixed' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, monthlyStructure === 'noFixed' && styles.choiceCardTitleSelected]}>
                {t('addSubscription.monthlyStructure.noFixed')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.monthlyStructure.noFixedDesc')}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.choiceCard, monthlyStructure === 'fixed' && styles.choiceCardSelected]}
            onPress={() => handleSelectMonthlyStructure('fixed')}
            accessibilityRole="radio"
            accessibilityState={{ checked: monthlyStructure === 'fixed' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, monthlyStructure === 'fixed' && styles.choiceCardTitleSelected]}>
                {t('addSubscription.monthlyStructure.fixed')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.monthlyStructure.fixedDesc')}</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderCommitmentMonthsStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.commitmentMonths')}</Text>
        <MonthWheelPicker
          value={commitmentMonths}
          onChange={setCommitmentMonths}
          colors={colors}
          labelFn={(n) => t('addSubscription.commitmentMonths.option', { count: n })}
        />
      </ScrollView>
    );
  }

  function renderBillingDayStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.billingDay')}</Text>
        <DayWheelPicker
          value={billingDayOfMonth}
          onChange={setBillingDayOfMonth}
          colors={colors}
        />
      </ScrollView>
    );
  }

  function renderAnnualBillingDateStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={[styles.stepContent, { paddingBottom: showDatePicker ? 320 : 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addSubscription.step.annualBillingDate')}</Text>
        <Text style={styles.stepSub}>{t('addSubscription.annualBillingDate.sub')}</Text>

        {/* Quick "today" option */}
        <TouchableOpacity
          style={[styles.choiceCard, nextBillingDate && isToday(nextBillingDate) && styles.choiceCardSelected, { marginBottom: 16 }]}
          onPress={() => { setNextBillingDate(new Date()); setShowDatePicker(false); setDateError(''); }}
        >
          <View style={styles.choiceCardContent}>
            <Text style={[styles.choiceCardTitle, nextBillingDate && isToday(nextBillingDate) && styles.choiceCardTitleSelected]}>
              {t('addSubscription.annualBillingDate.today')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Manual date picker */}
        <TouchableOpacity
          style={[styles.dateButton, nextBillingDate && !isToday(nextBillingDate) && { borderColor: colors.primary }]}
          onPress={() => setShowDatePicker((v) => !v)}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.dateButtonText, (!nextBillingDate || isToday(nextBillingDate)) && styles.datePlaceholder]}>
            {nextBillingDate && !isToday(nextBillingDate) ? formatDate(nextBillingDate, dateFormat) : t('addSubscription.annualBillingDate.orChooseDate')}
          </Text>
        </TouchableOpacity>

        {!!dateError && <Text style={styles.dateError}>{dateError}</Text>}
        {showDatePicker && (
          <DateTimePicker
            value={nextBillingDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={onDateChange}
            locale="en-GB"
          />
        )}
      </ScrollView>
    );
  }

  function renderRenewalTypeStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.renewalType')}</Text>
        <View style={styles.choiceCards}>
          <Pressable
            style={[styles.choiceCard, renewalType === 'auto' && styles.choiceCardSelected]}
            onPress={() => handleSelectRenewalType('auto')}
            accessibilityRole="radio"
            accessibilityState={{ checked: renewalType === 'auto' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, renewalType === 'auto' && styles.choiceCardTitleSelected]}>
                {t('addSubscription.renewalType.auto')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.renewalType.autoDesc')}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.choiceCard, renewalType === 'manual' && styles.choiceCardSelected]}
            onPress={() => handleSelectRenewalType('manual')}
            accessibilityRole="radio"
            accessibilityState={{ checked: renewalType === 'manual' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, renewalType === 'manual' && styles.choiceCardTitleSelected]}>
                {t('addSubscription.renewalType.manual')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.renewalType.manualDesc')}</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderReminderStep() {
    const showSpecialPeriodToggle = hasSpecialPeriod === true;
    const showManualNote = renewalType === 'manual';

    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.reminder')}</Text>
        <View style={styles.reminderGrid}>
          {SUBSCRIPTION_REMINDER_PRESETS.map((preset) => {
            const isSelected = reminderDays === preset.days;
            return (
              <TouchableOpacity
                key={preset.days}
                style={[styles.reminderChip, isSelected && styles.reminderChipSelected]}
                onPress={() => setReminderDays(preset.days)}
              >
                <Text style={[styles.reminderChipText, isSelected && styles.reminderChipTextSelected]}>
                  {t(preset.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Special period end reminder toggle */}
        {showSpecialPeriodToggle && (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('addSubscription.reminder.specialPeriodToggle')}</Text>
            <Switch
              value={reminderSpecialPeriod}
              onValueChange={setReminderSpecialPeriod}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}

        {showSpecialPeriodToggle && reminderSpecialPeriod && (
          <View style={styles.reminderNote}>
            <Text style={styles.reminderNoteText}>{t('addSubscription.reminder.specialPeriodNote')}</Text>
          </View>
        )}

        {showManualNote && (
          <View style={[styles.reminderNote, { marginTop: showSpecialPeriodToggle ? 8 : 16 }]}>
            <Text style={styles.reminderNoteText}>{t('addSubscription.reminder.manualNote')}</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  function renderNotesQuestionStep() {
    return (
      <View style={[styles.stepContent, styles.questionCenter]}>
        <View style={styles.questionIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.questionTitle}>{t('addSubscription.step.notesQuestion')}</Text>
        <Text style={styles.questionSub}>{t('addSubscription.stepSub.notesQuestion')}</Text>
        <TouchableOpacity
          style={styles.questionBtn}
          onPress={() => {
            setWantsNotes(true);
            animateTransition('forward', () => setCurrentStepId('notesInput'));
          }}
        >
          <Text style={styles.questionBtnText}>{t('addSubscription.notesYes')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.questionBtn, styles.questionBtnSecondary]}
          onPress={() => {
            setWantsNotes(false);
            animateTransition('forward', () => setCurrentStepId('summary'));
          }}
        >
          <Text style={[styles.questionBtnText, styles.questionBtnTextSecondary]}>
            {t('addSubscription.notesNo')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderNotesInputStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.notesInput')}</Text>
        <TextInput
          style={styles.notesInput}
          placeholder={t('addSubscription.notesPlaceholder')}
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
    const sym = CURRENCY_SYMBOLS[currency];
    const isFree = accessType === 'free';
    const isTrialPeriod = !isFree && hasSpecialPeriod && specialPeriodType === 'trial';
    const isDiscountedPeriod = !isFree && hasSpecialPeriod && specialPeriodType === 'discounted';

    const amountDisplay = isFree
      ? t('addSubscription.summary.free')
      : formatCurrency(parseAmountToAgot(amountInput), sym);

    const specialPeriodDisplay = isTrialPeriod
      ? (specialPeriodUnit === 'days'
          ? t('addSubscription.summary.trialDays', { count: specialPeriodDays })
          : t('addSubscription.summary.trial', { months: specialPeriodMonths }))
      : isDiscountedPeriod
      ? (specialPeriodUnit === 'days'
          ? t('addSubscription.summary.discountedDays', {
              count: specialPeriodDays,
              price: formatCurrency(parseAmountToAgot(specialAmountInput), sym),
            })
          : t('addSubscription.summary.discounted', {
              months: specialPeriodMonths,
              price: formatCurrency(parseAmountToAgot(specialAmountInput), sym),
            }))
      : null;

    const billingDisplay = isFree
      ? t('addSubscription.summary.free')
      : billingCycle === SubscriptionBillingCycle.MONTHLY
      ? t('addSubscription.summary.monthly')
      : t('addSubscription.summary.annual');

    const billingDateDisplay = isFree
      ? '—'
      : billingCycle === SubscriptionBillingCycle.MONTHLY
      ? t('addSubscription.summary.dayOfMonth', { day: billingDayOfMonth })
      : nextBillingDate
      ? formatDate(advanceToFuture(nextBillingDate), dateFormat)
      : '—';

    const reminderDisplay = t('addSubscription.summary.reminderDays', { count: reminderDays });

    const isPeriodic = isFree || (billingCycle === SubscriptionBillingCycle.MONTHLY && monthlyStructure === 'noFixed');
    const renewalDisplay = isPeriodic
      ? t('addSubscription.summary.periodicReview', { months: periodicReminderMonths })
      : renewalType === 'manual'
      ? t('addSubscription.summary.renewalManual')
      : t('addSubscription.summary.renewalAuto');

    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>{t('addSubscription.step.summary')}</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addSubscription.summary.service')}</Text>
            <Text style={styles.summaryValue}>{serviceName}</Text>
          </View>

          {!isFree && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('addSubscription.summary.amount')}</Text>
              <Text style={[styles.summaryValue, styles.summaryAmountValue]}>{amountDisplay}</Text>
            </View>
          )}

          {specialPeriodDisplay && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('addSubscription.summary.specialPeriod')}</Text>
              <Text style={styles.summaryValue}>{specialPeriodDisplay}</Text>
            </View>
          )}

          {!isFree && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('addSubscription.summary.billing')}</Text>
              <Text style={styles.summaryValue}>{billingDisplay}</Text>
            </View>
          )}

          {!isFree && billingCycle === SubscriptionBillingCycle.MONTHLY && monthlyStructure === 'fixed' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('addSubscription.summary.commitmentMonths')}</Text>
              <Text style={styles.summaryValue}>
                {t('addSubscription.commitmentMonths.option', { count: commitmentMonths })}
              </Text>
            </View>
          )}

          {!isFree && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {billingCycle === SubscriptionBillingCycle.MONTHLY
                  ? t('addSubscription.summary.billingDay')
                  : t('addSubscription.summary.renewalDate')}
              </Text>
              <Text style={styles.summaryValue}>{billingDateDisplay}</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addSubscription.summary.renewalType')}</Text>
            <Text style={styles.summaryValue}>{renewalDisplay}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addSubscription.summary.category')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              {SUBSCRIPTION_CATEGORIES.find((c) => c.id === category) && (
                <Ionicons name={SUBSCRIPTION_CATEGORIES.find((c) => c.id === category)!.icon} size={16} color={colors.textSecondary} />
              )}
              <Text style={styles.summaryValue}>{t('subscriptions.category.' + category)}</Text>
            </View>
          </View>

          {!isFree && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('addSubscription.summary.reminder')}</Text>
              <Text style={styles.summaryValue}>{reminderDisplay}</Text>
            </View>
          )}

          {notes.trim().length > 0 ? (
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <Text style={styles.summaryLabel}>{t('addSubscription.summary.notes')}</Text>
              <Text style={styles.summaryValue} numberOfLines={3}>{notes}</Text>
            </View>
          ) : (
            <View style={[styles.summaryRow, styles.summaryRowLast]} />
          )}
        </View>
      </ScrollView>
    );
  }

  function renderCurrentStep() {
    switch (currentStepId) {
      case 'serviceName':           return renderServiceNameStep();
      case 'category':              return renderCategoryStep();
      case 'accessType':            return renderAccessTypeStep();
      case 'freeReminderInterval':
      case 'periodicReminderInterval': return renderPeriodicReminderIntervalStep();
      case 'specialPeriodQuestion': return renderSpecialPeriodQuestionStep();
      case 'specialPeriodDetails':  return renderSpecialPeriodDetailsStep();
      case 'regularAmount':         return renderAmountStep(true);
      case 'amount':                return renderAmountStep(false);
      case 'billingCycle':          return renderBillingCycleStep();
      case 'monthlyStructure':      return renderMonthlyStructureStep();
      case 'commitmentMonths':      return renderCommitmentMonthsStep();
      case 'billingDay':            return renderBillingDayStep();
      case 'annualBillingDate':     return renderAnnualBillingDateStep();
      case 'renewalType':           return renderRenewalTypeStep();
      case 'reminder':              return renderReminderStep();
      case 'notesQuestion':         return renderNotesQuestionStep();
      case 'notesInput':            return renderNotesInputStep();
      case 'summary':               return renderSummaryStep();
    }
  }

  // ---------------------------------------------------------------------------
  // Footer button
  // ---------------------------------------------------------------------------

  function renderFooterButton() {
    // Steps that handle their own navigation — no footer button
    if (
      currentStepId === 'accessType' ||
      currentStepId === 'billingCycle' ||
      currentStepId === 'monthlyStructure' ||
      currentStepId === 'renewalType' ||
      currentStepId === 'specialPeriodQuestion' ||
      currentStepId === 'notesQuestion'
    ) return null;

    if (currentStepId === 'summary') {
      return (
        <TouchableOpacity style={styles.continueBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueBtnText}>{t('addSubscription.save')}</Text>
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
  // Render
  // ---------------------------------------------------------------------------

  const headerTitle = isEditing ? t('addSubscription.titleEdit') : t('addSubscription.title');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={goBack} hitSlop={8}>
          <Ionicons
            name={currentStepIndex === 0 ? 'close' : (isRTL ? 'chevron-forward' : 'chevron-back')}
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Keyboard-aware wrapper */}
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

      {/* Toast overlay */}
      {toastMessage ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
