import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/useToast';
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
  Pressable,
  I18nManager,
  Keyboard,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ServiceAutocomplete } from '@/components/redeemy/ServiceAutocomplete';
import { StepDatePicker } from '@/components/redeemy/StepDatePicker';
import { CategorySelector } from '@/components/redeemy/CategorySelector';
import { CurrencyPicker } from '@/components/redeemy/CurrencyPicker';
import { StepFormScreen } from '@/components/redeemy/StepFormScreen';
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
import { useFormExitConfirmation } from '@/hooks/useFormExitConfirmation';
import { useSettingsStore, CURRENCY_SYMBOLS, type CurrencyCode } from '@/stores/settingsStore';
import {
  SubscriptionBillingCycle,
  SubscriptionStatus,
  type Subscription,
} from '@/types/subscriptionTypes';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptionCategories';
import { formatDate } from '@/lib/formatDate';
import type { AppColors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Month wheel picker
// ---------------------------------------------------------------------------

const DAY_ITEM_H = 52;
const DAY_VISIBLE = 5;

interface MonthWheelPickerProps {
  value: number;
  onChange: (month: number) => void;
  max?: number;
  visibleItems?: number;
  colors: AppColors;
  labelFn: (n: number) => string;
}

function MonthWheelPicker({ value, onChange, max = 36, visibleItems = DAY_VISIBLE, colors, labelFn }: MonthWheelPickerProps) {
  const months = Array.from({ length: max }, (_, i) => i + 1);
  const center = Math.floor(visibleItems / 2);

  function handleScrollEnd(e: { nativeEvent: { contentOffset: { y: number } } }) {
    const index = Math.round(e.nativeEvent.contentOffset.y / DAY_ITEM_H);
    const clamped = Math.max(0, Math.min(max - 1, index));
    onChange(clamped + 1);
  }

  return (
    <View style={{ height: DAY_ITEM_H * visibleItems, overflow: 'hidden', borderRadius: 14, backgroundColor: colors.surface }}>
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
  | 'registrationDate'
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
  | 'renewalType'
  | 'summary';

type FlowState = {
  accessType: 'free' | 'paid' | null;
  hasSpecialPeriod: boolean | null;
  billingCycle: SubscriptionBillingCycle | null;
  monthlyStructure: 'fixed' | 'noFixed' | null;
};

function getSteps(state: FlowState, categoryChosen = false): StepId[] {
  const { accessType, hasSpecialPeriod, billingCycle, monthlyStructure } = state;

  const steps: StepId[] = ['serviceName'];
  if (categoryChosen) steps.push('category');
  steps.push('registrationDate', 'accessType');

  if (accessType === 'free') {
    steps.push('periodicReminderInterval', 'summary');
    return steps;
  }

  if (accessType !== 'paid') return steps;

  steps.push('specialPeriodQuestion');
  if (hasSpecialPeriod === null) return steps;

  if (hasSpecialPeriod) {
    steps.push('specialPeriodDetails');
  }

  // Billing cycle comes before the amount — so the amount title can reflect monthly/annual
  steps.push('billingCycle');
  if (billingCycle === null) return steps;

  // Amount step after billing cycle is selected
  if (hasSpecialPeriod) {
    steps.push('regularAmount');
  } else {
    steps.push('amount');
  }

  if (billingCycle === SubscriptionBillingCycle.MONTHLY) {
    steps.push('monthlyStructure');
    if (monthlyStructure === null) return steps;
    if (monthlyStructure === 'fixed') {
      // Billing day derived from registrationDate — no separate billingDay step
      steps.push('commitmentMonths', 'renewalType');
    } else {
      // No fixed period → periodic review reminder (like free), not a billing countdown
      steps.push('periodicReminderInterval');
    }
  } else {
    // Annual date derived from registrationDate — no separate annualBillingDate step
    steps.push('renewalType');
  }

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
    stepSub: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: -8,
      marginBottom: 20,
      lineHeight: 22,
      alignSelf: 'flex-start',
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
      fontWeight: '600',
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
      width: 110,
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
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      padding: 14,
      backgroundColor: colors.surface,
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

  // Access type (committed = real value; pending = visual highlight only, committed on Continue)
  const [accessType, setAccessType] = useState<'free' | 'paid' | null>(null);
  const [pendingAccessType, setPendingAccessType] = useState<'free' | 'paid' | null>('paid');

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
  const [pendingHasSpecialPeriod, setPendingHasSpecialPeriod] = useState<boolean | null>(true);
  const [specialPeriodType, setSpecialPeriodType] = useState<'trial' | 'discounted' | null>('trial');
  const [specialPeriodUnit, setSpecialPeriodUnit] = useState<'days' | 'months'>('months');
  const [specialPeriodMonths, setSpecialPeriodMonths] = useState(1);
  const [specialPeriodDays, setSpecialPeriodDays] = useState(7);
  const [specialAmountInput, setSpecialAmountInput] = useState('');

  // Regular amount (paid)
  const [amountInput, setAmountInput] = useState('');
  const [amountError, setAmountError] = useState('');

  // Registration date (anchor for billing day, annual renewal, and review reminders)
  const [registrationDate, setRegistrationDate] = useState<Date>(new Date());

  // Billing
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle | null>(null);
  const [pendingBillingCycle, setPendingBillingCycle] = useState<SubscriptionBillingCycle | null>(SubscriptionBillingCycle.MONTHLY);
  const [monthlyStructure, setMonthlyStructure] = useState<'fixed' | 'noFixed' | null>(null);
  const [pendingMonthlyStructure, setPendingMonthlyStructure] = useState<'fixed' | 'noFixed' | null>('noFixed');
  const [commitmentMonths, setCommitmentMonths] = useState(12);

  // Renewal
  const [renewalType, setRenewalType] = useState<'auto' | 'manual' | null>(null);
  const [pendingRenewalType, setPendingRenewalType] = useState<'auto' | 'manual' | null>('auto');

  // Reminder
  const [reminderSpecialPeriod, setReminderSpecialPeriod] = useState(true);

  // Notes
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);

  // Stash: preserve paid-specific state when user temporarily switches to 'free',
  // so we can restore it if they switch back to 'paid'.
  const paidStateStash = useRef<{
    hasSpecialPeriod: boolean | null;
    specialPeriodType: 'trial' | 'discounted' | null;
    specialPeriodUnit: 'days' | 'months';
    specialPeriodMonths: number;
    specialPeriodDays: number;
    specialAmountInput: string;
    billingCycle: SubscriptionBillingCycle | null;
    monthlyStructure: 'fixed' | 'noFixed' | null;
    renewalType: 'auto' | 'manual' | null;
    commitmentMonths: number;
    amountInput: string;
  } | null>(null);

  // Stash: preserve monthly-specific state when user switches to 'annual'.
  const monthlyStateStash = useRef<{
    monthlyStructure: 'fixed' | 'noFixed' | null;
    renewalType: 'auto' | 'manual' | null;
    commitmentMonths: number;
    periodicReminderMonths: number;
  } | null>(null);

  // Step navigation
  const [currentStepId, setCurrentStepId] = useState<StepId>('serviceName');
  const [categoryChosen, setCategoryChosen] = useState(false);
  const { fadeAnim, slideAnim, animateTransition } = useStepAnimation();
  const summaryScrollRef = useRef<ScrollView>(null);

  const flowState: FlowState = useMemo(() => ({
    accessType,
    hasSpecialPeriod,
    billingCycle,
    monthlyStructure,
  }), [accessType, hasSpecialPeriod, billingCycle, monthlyStructure]);

  const steps = useMemo(() => getSteps(flowState, categoryChosen), [flowState, categoryChosen]);
  const currentStepIndex = steps.indexOf(currentStepId);

  useFormExitConfirmation(
    !isEditing && !saving && (serviceName.trim().length > 0 || currentStepIndex > 0),
  );

  // Pre-fill for edit mode
  useEffect(() => {
    if (!isEditing || !existingSubscription) return;
    const s = existingSubscription;

    setServiceName(s.serviceName);
    setCategory(s.category);
    if (s.currency) setCurrency(s.currency);
    setReminderSpecialPeriod(s.reminderSpecialPeriodEnabled ?? true);
    if (s.notes) setNotes(s.notes);

    // Access type
    if (s.isFree) {
      setAccessType('free'); setPendingAccessType('free');
      setPeriodicReminderMonths(s.freeReviewReminderMonths ?? 6);
    } else {
      setAccessType('paid'); setPendingAccessType('paid');
      setAmountInput((s.amountAgorot / 100).toFixed(2));

      // Special period
      if (s.specialPeriodType === 'discounted') {
        setHasSpecialPeriod(true); setPendingHasSpecialPeriod(true);
        setSpecialPeriodType('discounted');
        const unit = s.specialPeriodUnit ?? 'months';
        setSpecialPeriodUnit(unit);
        if (unit === 'days') setSpecialPeriodDays(s.specialPeriodDays ?? 7);
        else setSpecialPeriodMonths(s.specialPeriodMonths ?? 1);
        setSpecialAmountInput(((s.specialPeriodPriceAgorot ?? 0) / 100).toFixed(2));
      } else if (s.isFreeTrial || s.specialPeriodType === 'trial') {
        setHasSpecialPeriod(true); setPendingHasSpecialPeriod(true);
        setSpecialPeriodType('trial');
        const unit = s.specialPeriodUnit ?? 'months';
        setSpecialPeriodUnit(unit);
        if (unit === 'days') setSpecialPeriodDays(s.specialPeriodDays ?? 7);
        else setSpecialPeriodMonths(s.specialPeriodMonths ?? s.freeTrialMonths ?? 1);
        // amountInput is the regular price after trial
        setAmountInput(((s.priceAfterTrialAgorot ?? 0) / 100).toFixed(2));
      } else {
        setHasSpecialPeriod(false); setPendingHasSpecialPeriod(false);
      }

      // Billing cycle
      setBillingCycle(s.billingCycle); setPendingBillingCycle(s.billingCycle);
      if (s.billingCycle === SubscriptionBillingCycle.MONTHLY) {
        if (s.hasFixedPeriod === false) {
          setMonthlyStructure('noFixed'); setPendingMonthlyStructure('noFixed');
          setPeriodicReminderMonths(s.freeReviewReminderMonths ?? 6);
        } else if (s.hasFixedPeriod === true || s.commitmentMonths) {
          setMonthlyStructure('fixed'); setPendingMonthlyStructure('fixed');
          if (s.commitmentMonths) setCommitmentMonths(s.commitmentMonths);
        }
      }

      // Restore registration date
      if (s.registrationDate) {
        setRegistrationDate(s.registrationDate instanceof Date ? s.registrationDate : new Date(s.registrationDate as unknown as string));
      } else if (s.billingCycle === SubscriptionBillingCycle.MONTHLY && s.billingDayOfMonth) {
        // Fallback: reconstruct approximate date from billing day
        const d = new Date();
        d.setDate(Math.min(s.billingDayOfMonth, 28));
        setRegistrationDate(d);
      } else if (s.billingCycle === SubscriptionBillingCycle.ANNUAL && s.nextBillingDate) {
        // Fallback: go back one year from next billing date
        const nb = s.nextBillingDate instanceof Date ? s.nextBillingDate : new Date(s.nextBillingDate as unknown as string);
        const d = new Date(nb);
        d.setFullYear(d.getFullYear() - 1);
        setRegistrationDate(d);
      }

      // Renewal type
      const rt = s.renewalType ?? 'auto';
      setRenewalType(rt); setPendingRenewalType(rt);
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
      if (currentStepId === 'category') setCategoryChosen(false);
      animateTransition('back', () => setCurrentStepId(steps[currentStepIndex - 1]));
    } else {
      router.back();
    }
  }

  function handleTapCategoryRow() {
    animateTransition('forward', () => {
      setCategoryChosen(true);
      setCurrentStepId('category');
    });
  }

  // ---------------------------------------------------------------------------
  // Tap handlers — update pending (visual highlight) only, no commit
  // ---------------------------------------------------------------------------

  function handleSelectAccessType(type: 'free' | 'paid') { setPendingAccessType(type); }
  function handleSelectBillingCycle(cycle: SubscriptionBillingCycle) { setPendingBillingCycle(cycle); }
  function handleSelectMonthlyStructure(structure: 'fixed' | 'noFixed') { setPendingMonthlyStructure(structure); }
  function handleSelectRenewalType(type: 'auto' | 'manual') { setPendingRenewalType(type); }

  // ---------------------------------------------------------------------------
  // Commit functions — called from handleContinue, apply stash/restore logic
  // ---------------------------------------------------------------------------

  function commitAccessType(type: 'free' | 'paid') {
    if (type !== accessType) {
      if (type === 'free') {
        paidStateStash.current = {
          hasSpecialPeriod, specialPeriodType, specialPeriodUnit,
          specialPeriodMonths, specialPeriodDays, specialAmountInput,
          billingCycle, monthlyStructure, renewalType, commitmentMonths, amountInput,
        };
        setHasSpecialPeriod(null); setPendingHasSpecialPeriod(true);
        setBillingCycle(null);     setPendingBillingCycle(SubscriptionBillingCycle.MONTHLY);
        setMonthlyStructure(null); setPendingMonthlyStructure('noFixed');
        setRenewalType(null);      setPendingRenewalType('auto');
        setAmountInput(''); setSpecialAmountInput('');
      } else {
        if (paidStateStash.current) {
          const st = paidStateStash.current;
          setHasSpecialPeriod(st.hasSpecialPeriod); setPendingHasSpecialPeriod(st.hasSpecialPeriod ?? true);
          setSpecialPeriodType(st.specialPeriodType);
          setSpecialPeriodUnit(st.specialPeriodUnit);
          setSpecialPeriodMonths(st.specialPeriodMonths);
          setSpecialPeriodDays(st.specialPeriodDays);
          setSpecialAmountInput(st.specialAmountInput);
          setBillingCycle(st.billingCycle); setPendingBillingCycle(st.billingCycle ?? SubscriptionBillingCycle.MONTHLY);
          setMonthlyStructure(st.monthlyStructure); setPendingMonthlyStructure(st.monthlyStructure ?? 'noFixed');
          setRenewalType(st.renewalType);   setPendingRenewalType(st.renewalType ?? 'auto');
          setCommitmentMonths(st.commitmentMonths);
          setAmountInput(st.amountInput);
          paidStateStash.current = null;
        } else {
          setHasSpecialPeriod(null); setPendingHasSpecialPeriod(true);
          setBillingCycle(null);     setPendingBillingCycle(SubscriptionBillingCycle.MONTHLY);
          setMonthlyStructure(null); setPendingMonthlyStructure('noFixed');
          setRenewalType(null);      setPendingRenewalType('auto');
        }
      }
    }
    setAccessType(type); setPendingAccessType(type);
  }

  function commitBillingCycle(cycle: SubscriptionBillingCycle) {
    if (cycle !== billingCycle) {
      if (cycle === SubscriptionBillingCycle.ANNUAL) {
        monthlyStateStash.current = { monthlyStructure, renewalType, commitmentMonths, periodicReminderMonths };
        setMonthlyStructure(null); setPendingMonthlyStructure('noFixed');
        setRenewalType(null);      setPendingRenewalType('auto');
      } else {
        if (monthlyStateStash.current) {
          const st = monthlyStateStash.current;
          setMonthlyStructure(st.monthlyStructure); setPendingMonthlyStructure(st.monthlyStructure ?? 'noFixed');
          setRenewalType(st.renewalType);           setPendingRenewalType(st.renewalType ?? 'auto');
          setCommitmentMonths(st.commitmentMonths);
          setPeriodicReminderMonths(st.periodicReminderMonths);
          monthlyStateStash.current = null;
        } else {
          setMonthlyStructure(null); setPendingMonthlyStructure('noFixed');
          setRenewalType(null);      setPendingRenewalType('auto');
        }
      }
    }
    setBillingCycle(cycle); setPendingBillingCycle(cycle);
  }

  // ---------------------------------------------------------------------------
  // canContinue
  // ---------------------------------------------------------------------------

  const canContinue = useMemo(() => {
    switch (currentStepId) {
      case 'serviceName':   return serviceName.trim().length > 0;
      case 'category':      return true;
      case 'registrationDate': return true;
      case 'accessType':            return pendingAccessType !== null;
      case 'specialPeriodQuestion': return pendingHasSpecialPeriod !== null;
      case 'billingCycle':          return pendingBillingCycle !== null;
      case 'monthlyStructure':      return pendingMonthlyStructure !== null;
      case 'renewalType':           return pendingRenewalType !== null;
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
      default:              return false;
    }
  }, [currentStepId, serviceName,
      pendingAccessType, pendingHasSpecialPeriod, pendingBillingCycle, pendingMonthlyStructure, pendingRenewalType,
      specialPeriodType, specialAmountInput, amountInput]);

  // Whether the form is complete enough to allow quick-save in edit mode.
  // All required fields for the current configuration must be filled.
  const isFormComplete = useMemo(() => {
    if (!serviceName.trim()) return false;
    if (!accessType) return false;
    if (accessType === 'free') return true; // periodicReminderMonths always has a default
    // paid
    if (hasSpecialPeriod === null) return false;
    if (hasSpecialPeriod) {
      if (!specialPeriodType) return false;
      if (specialPeriodType === 'discounted') {
        const a = parseAmountToAgot(specialAmountInput);
        if (isNaN(a) || a <= 0) return false;
      }
    }
    if (!billingCycle) return false;
    const a = parseAmountToAgot(amountInput);
    if (isNaN(a) || a <= 0) return false;
    if (billingCycle === SubscriptionBillingCycle.MONTHLY) {
      if (!monthlyStructure) return false;
      if (monthlyStructure === 'fixed' && !renewalType) return false;
    } else {
      // Annual also requires renewalType
      if (!renewalType) return false;
    }
    return true;
  }, [serviceName, accessType, hasSpecialPeriod, specialPeriodType, specialAmountInput,
      billingCycle, amountInput, monthlyStructure, renewalType]);

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

  // ---------------------------------------------------------------------------
  // handleContinue
  // ---------------------------------------------------------------------------

  function handleContinue() {
    switch (currentStepId) {
      case 'accessType': {
        commitAccessType(pendingAccessType!);
        const next: StepId = pendingAccessType === 'free' ? 'periodicReminderInterval' : 'specialPeriodQuestion';
        animateTransition('forward', () => setCurrentStepId(next));
        return;
      }
      case 'specialPeriodQuestion': {
        setHasSpecialPeriod(pendingHasSpecialPeriod);
        const next: StepId = pendingHasSpecialPeriod ? 'specialPeriodDetails' : 'billingCycle';
        animateTransition('forward', () => setCurrentStepId(next));
        return;
      }
      case 'billingCycle': {
        commitBillingCycle(pendingBillingCycle!);
        // hasSpecialPeriod is already committed from the specialPeriodQuestion step
        const next: StepId = hasSpecialPeriod ? 'regularAmount' : 'amount';
        animateTransition('forward', () => setCurrentStepId(next));
        return;
      }
      case 'monthlyStructure': {
        setMonthlyStructure(pendingMonthlyStructure);
        const next: StepId = pendingMonthlyStructure === 'fixed' ? 'commitmentMonths' : 'periodicReminderInterval';
        animateTransition('forward', () => setCurrentStepId(next));
        return;
      }
      case 'renewalType': {
        setRenewalType(pendingRenewalType);
        goNext();
        return;
      }
      default:
        goNext();
    }
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

    // Derive billing primitives from registrationDate
    const billingDayOfMonth = registrationDate.getDate();

    // Compute trial end date anchored to registrationDate
    let trialEndsDate: Date | undefined;
    if (isTrialPeriod || isDiscountedPeriod) {
      if (specialPeriodUnit === 'days' && specialPeriodDays > 0) {
        trialEndsDate = new Date(registrationDate);
        trialEndsDate.setDate(trialEndsDate.getDate() + specialPeriodDays);
      } else if (specialPeriodMonths > 0) {
        trialEndsDate = new Date(registrationDate.getFullYear(), registrationDate.getMonth() + specialPeriodMonths, registrationDate.getDate());
      }
    }

    const specialMonths = hasSpecialPeriod && specialPeriodUnit === 'months' ? specialPeriodMonths : undefined;

    const resolvedBillingCycle = isFree
      ? SubscriptionBillingCycle.MONTHLY
      : billingCycle ?? SubscriptionBillingCycle.MONTHLY;

    // For annual: advance registration date by full years until it's in the future
    const realNextBillingDate = resolvedBillingCycle === SubscriptionBillingCycle.ANNUAL
      ? advanceToFuture(registrationDate)
      : undefined;

    // Compute commitmentEndDate for monthly fixed (anchored to registrationDate)
    let commitmentEndDate: Date | undefined;
    if (resolvedBillingCycle === SubscriptionBillingCycle.MONTHLY && monthlyStructure === 'fixed') {
      commitmentEndDate = computeCommitmentEndDate(registrationDate, commitmentMonths);
    }

    const subscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: currentUser.uid,
      serviceName: serviceName.trim(),
      registrationDate,
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
      reminderDays: useSettingsStore.getState().subscriptionReminderDays,
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
        // Post-edit system fixup — already logged item_updated at line 1069.
        await updateSubscription(existingSubscription.id, {
          notificationIds: scheduled.notificationIds,
          renewalNotificationId: scheduled.renewalNotificationId,
          specialPeriodNotificationId: scheduled.specialPeriodNotificationId,
        }, { silent: true });
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
        // Post-create system fixup — already logged item_created from createSubscription.
        await updateSubscription(newId, {
          notificationIds: scheduled.notificationIds,
          renewalNotificationId: scheduled.renewalNotificationId,
          specialPeriodNotificationId: scheduled.specialPeriodNotificationId,
        }, { silent: true });
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
    const categoryObj = SUBSCRIPTION_CATEGORIES.find((c) => c.id === category);
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.serviceName')}</Text>
        <ServiceAutocomplete
          value={serviceName}
          onChange={setServiceName}
          onSelectSuggestion={(_name, categoryId) => { if (categoryId) setCategory(categoryId); }}
          autoFocus
        />
        <TouchableOpacity style={styles.categoryRow} onPress={handleTapCategoryRow}>
          <Text style={styles.categoryRowTitle}>{t('addCredit.category')}</Text>
          <View style={styles.categoryRowContent}>
            {categoryObj && <Ionicons name={categoryObj.icon} size={18} color={colors.textSecondary} />}
            <Text style={styles.categoryRowLabel}>{t('subscriptions.category.' + category)}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderCategoryStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.category')}</Text>
        <CategorySelector
          categories={SUBSCRIPTION_CATEGORIES}
          selected={category}
          onSelect={setCategory}
          labelFor={(id) => t('subscriptions.category.' + id)}
        />
      </ScrollView>
    );
  }

  function renderAccessTypeStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.accessType')}</Text>
        <View style={styles.choiceCards}>
          <Pressable
            style={[styles.choiceCard, pendingAccessType === 'paid' && styles.choiceCardSelected]}
            onPress={() => handleSelectAccessType('paid')}
            accessibilityRole="radio"
            accessibilityState={{ checked: pendingAccessType === 'paid' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, pendingAccessType === 'paid' && styles.choiceCardTitleSelected]}>
                {t('addSubscription.accessType.paid')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.accessType.paidDesc')}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.choiceCard, pendingAccessType === 'free' && styles.choiceCardSelected]}
            onPress={() => handleSelectAccessType('free')}
            accessibilityRole="radio"
            accessibilityState={{ checked: pendingAccessType === 'free' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, pendingAccessType === 'free' && styles.choiceCardTitleSelected]}>
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

    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.periodicReminderInterval')}</Text>
        <Text style={[styles.stepSub, { textAlign: 'left' }]}>
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
      </ScrollView>
    );
  }

  function renderSpecialPeriodQuestionStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={[styles.stepTitle, { textAlign: 'left' }]}>{t('addSubscription.specialPeriodQuestion.title')}</Text>
        <View style={styles.choiceCards}>
          <Pressable
            style={[styles.choiceCard, pendingHasSpecialPeriod === true && styles.choiceCardSelected]}
            onPress={() => setPendingHasSpecialPeriod(true)}
            accessibilityRole="radio"
            accessibilityState={{ checked: pendingHasSpecialPeriod === true }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, pendingHasSpecialPeriod === true && styles.choiceCardTitleSelected]}>
                {t('addSubscription.specialPeriodQuestion.yes')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.specialPeriodQuestion.sub')}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.choiceCard, pendingHasSpecialPeriod === false && styles.choiceCardSelected]}
            onPress={() => setPendingHasSpecialPeriod(false)}
            accessibilityRole="radio"
            accessibilityState={{ checked: pendingHasSpecialPeriod === false }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, pendingHasSpecialPeriod === false && styles.choiceCardTitleSelected]}>
                {t('addSubscription.specialPeriodQuestion.no')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.specialPeriodQuestion.noDesc')}</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
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
            visibleItems={3}
            colors={colors}
            labelFn={(n) => t('addSubscription.commitmentMonths.option', { count: n })}
          />
        ) : (
          <MonthWheelPicker
            value={specialPeriodDays}
            onChange={setSpecialPeriodDays}
            max={90}
            visibleItems={3}
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

        {/* End-of-special-period reminder toggle */}
        <View style={[styles.toggleRow, { marginTop: 24 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' }}>
              {t('addSubscription.reminder.specialPeriodToggle')}
            </Text>
          </View>
          <Switch
            style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
            value={reminderSpecialPeriod}
            onValueChange={setReminderSpecialPeriod}
            trackColor={{ false: colors.separator, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ScrollView>
    );
  }

  function renderAmountStep(isRegularAmount = false) {
    const sym = CURRENCY_SYMBOLS[currency];
    const isMonthly = billingCycle === SubscriptionBillingCycle.MONTHLY;
    const titleKey = isRegularAmount
      ? (isMonthly ? 'addSubscription.step.regularAmountMonthly' : 'addSubscription.step.regularAmountAnnual')
      : (isMonthly ? 'addSubscription.step.amountMonthly' : 'addSubscription.step.amountAnnual');
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
            style={[styles.choiceCard, pendingBillingCycle === SubscriptionBillingCycle.MONTHLY && styles.choiceCardSelected]}
            onPress={() => handleSelectBillingCycle(SubscriptionBillingCycle.MONTHLY)}
            accessibilityRole="radio"
            accessibilityState={{ checked: pendingBillingCycle === SubscriptionBillingCycle.MONTHLY }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, pendingBillingCycle === SubscriptionBillingCycle.MONTHLY && styles.choiceCardTitleSelected]}>
                {t('addSubscription.billingCycle.monthly')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.billingCycle.monthlyDesc')}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.choiceCard, pendingBillingCycle === SubscriptionBillingCycle.ANNUAL && styles.choiceCardSelected]}
            onPress={() => handleSelectBillingCycle(SubscriptionBillingCycle.ANNUAL)}
            accessibilityRole="radio"
            accessibilityState={{ checked: pendingBillingCycle === SubscriptionBillingCycle.ANNUAL }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, pendingBillingCycle === SubscriptionBillingCycle.ANNUAL && styles.choiceCardTitleSelected]}>
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
            style={[styles.choiceCard, pendingMonthlyStructure === 'noFixed' && styles.choiceCardSelected]}
            onPress={() => handleSelectMonthlyStructure('noFixed')}
            accessibilityRole="radio"
            accessibilityState={{ checked: pendingMonthlyStructure === 'noFixed' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, pendingMonthlyStructure === 'noFixed' && styles.choiceCardTitleSelected]}>
                {t('addSubscription.monthlyStructure.noFixed')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.monthlyStructure.noFixedDesc')}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.choiceCard, pendingMonthlyStructure === 'fixed' && styles.choiceCardSelected]}
            onPress={() => handleSelectMonthlyStructure('fixed')}
            accessibilityRole="radio"
            accessibilityState={{ checked: pendingMonthlyStructure === 'fixed' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, pendingMonthlyStructure === 'fixed' && styles.choiceCardTitleSelected]}>
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

  function renderRegistrationDateStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addSubscription.step.registrationDate')}</Text>
        <Text style={styles.stepSub}>{t('addSubscription.registrationDate.sub')}</Text>

        <StepDatePicker
          value={registrationDate}
          onChange={setRegistrationDate}
          isActive={currentStepId === 'registrationDate'}
          maximumDate={new Date()}
        />
      </ScrollView>
    );
  }

  function renderRenewalTypeStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addSubscription.step.renewalType')}</Text>
        <View style={styles.choiceCards}>
          <Pressable
            style={[styles.choiceCard, pendingRenewalType === 'auto' && styles.choiceCardSelected]}
            onPress={() => handleSelectRenewalType('auto')}
            accessibilityRole="radio"
            accessibilityState={{ checked: pendingRenewalType === 'auto' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, pendingRenewalType === 'auto' && styles.choiceCardTitleSelected]}>
                {t('addSubscription.renewalType.auto')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.renewalType.autoDesc')}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.choiceCard, pendingRenewalType === 'manual' && styles.choiceCardSelected]}
            onPress={() => handleSelectRenewalType('manual')}
            accessibilityRole="radio"
            accessibilityState={{ checked: pendingRenewalType === 'manual' }}
          >
            <View style={styles.choiceCardContent}>
              <Text style={[styles.choiceCardTitle, pendingRenewalType === 'manual' && styles.choiceCardTitleSelected]}>
                {t('addSubscription.renewalType.manual')}
              </Text>
              <Text style={styles.choiceCardDesc}>{t('addSubscription.renewalType.manualDesc')}</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderSummaryStep() {
    const sym = CURRENCY_SYMBOLS[currency];
    const isFree = accessType === 'free';
    const isTrialPeriod = !isFree && hasSpecialPeriod && specialPeriodType === 'trial';
    const isDiscountedPeriod = !isFree && hasSpecialPeriod && specialPeriodType === 'discounted';

    // Amount label embeds billing cycle (and trial context) — no separate "חיוב" row needed
    const amountLabel = !isFree
      ? isTrialPeriod
        ? t('addSubscription.summary.amountAfterTrial')
        : (billingCycle === SubscriptionBillingCycle.MONTHLY
            ? t('addSubscription.summary.amountMonthly')
            : t('addSubscription.summary.amountAnnual'))
      : t('addSubscription.summary.amount');

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

    const billingDateDisplay = billingCycle === SubscriptionBillingCycle.MONTHLY
      ? t('addSubscription.summary.dayOfMonth', { day: registrationDate.getDate() })
      : formatDate(advanceToFuture(registrationDate), dateFormat);

    const isPeriodic = isFree || (billingCycle === SubscriptionBillingCycle.MONTHLY && monthlyStructure === 'noFixed');

    // Label differs: periodic review vs. fixed renewal
    const renewalLabel = isPeriodic
      ? t('addSubscription.summary.reviewReminderLabel')
      : t('addSubscription.summary.renewalType');

    const renewalDisplay = isPeriodic
      ? t('addSubscription.summary.periodicReview', { months: periodicReminderMonths })
      : renewalType === 'manual'
      ? t('addSubscription.summary.renewalManual')
      : t('addSubscription.summary.renewalAuto');

    return (
      <ScrollView ref={summaryScrollRef} style={styles.stepScroll} contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>{t('addSubscription.step.summary')}</Text>
        <View style={styles.summaryCard}>
          {/* שירות */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addSubscription.summary.service')}</Text>
            <Text style={styles.summaryValue}>{serviceName}</Text>
          </View>

          {/* סכום חודשי / סכום שנתי — billing cycle embedded in label */}
          {!isFree && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{amountLabel}</Text>
              <Text style={[styles.summaryValue, styles.summaryAmountValue]}>{amountDisplay}</Text>
            </View>
          )}

          {/* תקופה מיוחדת + תזכורת לסיומה */}
          {specialPeriodDisplay && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('addSubscription.summary.specialPeriod')}</Text>
              <Text style={styles.summaryValue}>{specialPeriodDisplay}</Text>
            </View>
          )}
          {hasSpecialPeriod && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('addSubscription.summary.specialPeriodReminderLabel')}</Text>
              <Text style={styles.summaryValue}>
                {reminderSpecialPeriod ? t('common.on') : t('common.off')}
              </Text>
            </View>
          )}

          {/* יום חיוב (monthly) / תאריך חידוש (annual) — hidden for free */}
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

          {/* תקופה (commitment) — monthly fixed only */}
          {!isFree && billingCycle === SubscriptionBillingCycle.MONTHLY && monthlyStructure === 'fixed' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('addSubscription.summary.commitmentMonths')}</Text>
              <Text style={styles.summaryValue}>
                {t('addSubscription.commitmentMonths.option', { count: commitmentMonths })}
              </Text>
            </View>
          )}

          {/* תזכורת ביקורת / חידוש */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{renewalLabel}</Text>
            <Text style={styles.summaryValue}>{renewalDisplay}</Text>
          </View>

          {/* קטגוריה */}
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>{t('addSubscription.summary.category')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              {SUBSCRIPTION_CATEGORIES.find((c) => c.id === category) && (
                <Ionicons name={SUBSCRIPTION_CATEGORIES.find((c) => c.id === category)!.icon} size={16} color={colors.textSecondary} />
              )}
              <Text style={styles.summaryValue}>{t('subscriptions.category.' + category)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.notesLabel}>{t('addSubscription.summary.notes')}</Text>
        <TextInput
          style={styles.notesInput}
          placeholder={t('addSubscription.notesPlaceholder')}
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
      case 'serviceName':           return renderServiceNameStep();
      case 'category':              return renderCategoryStep();
      case 'registrationDate':      return renderRegistrationDateStep();
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
      case 'renewalType':           return renderRenewalTypeStep();
      case 'summary':               return renderSummaryStep();
    }
  }

  // ---------------------------------------------------------------------------
  // Footer button
  // ---------------------------------------------------------------------------

  function renderFooterButton() {
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
    <StepFormScreen
      title={headerTitle}
      onBack={goBack}
      isFirstStep={currentStepIndex === 0}
      totalSteps={steps.length}
      currentStepIndex={currentStepIndex}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      footerButton={renderFooterButton()}
      onSave={isEditing && isFormComplete ? handleSave : undefined}
      isSaving={saving}
      toast={toastMessage ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : undefined}
    >
      {renderCurrentStep()}
    </StepFormScreen>
  );
}
