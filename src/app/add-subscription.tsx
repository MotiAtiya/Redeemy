import { useState, useEffect, useRef, useMemo, useCallback, type ComponentProps } from 'react';
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
import { IntentSelector } from '@/components/redeemy/IntentSelector';
import { StepProgressBar } from '@/components/redeemy/StepProgressBar';
import { createSubscription, updateSubscription } from '@/lib/firestoreSubscriptions';
import { parseAmountToAgot, formatCurrency } from '@/constants/currencies';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  SubscriptionBillingCycle,
  SubscriptionIntent,
  SubscriptionStatus,
  type Subscription,
} from '@/types/subscriptionTypes';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptionCategories';
import { SUBSCRIPTION_INTENTS } from '@/constants/subscriptionIntents';
import { SUBSCRIPTION_REMINDER_PRESETS } from '@/constants/subscriptionReminders';
import { formatDate } from '@/lib/formatDate';
import type { AppColors } from '@/constants/colors';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

// Intent icon/label lookup map (built from constants, avoids repeated array searches)
const SUBSCRIPTION_INTENTS_MAP: Record<SubscriptionIntent, { icon: IoniconsName; labelKey: string }> =
  Object.fromEntries(
    SUBSCRIPTION_INTENTS.map((o) => [o.intent, { icon: o.icon, labelKey: o.labelKey }])
  ) as Record<SubscriptionIntent, { icon: IoniconsName; labelKey: string }>;

// ---------------------------------------------------------------------------
// Day wheel picker
// ---------------------------------------------------------------------------

const DAY_ITEM_H = 52;
const DAY_VISIBLE = 5; // odd — center slot is the selected item

interface DayWheelPickerProps {
  value: number;
  onChange: (day: number) => void;
  colors: AppColors;
}

function DayWheelPicker({ value, onChange, colors }: DayWheelPickerProps) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const center = Math.floor(DAY_VISIBLE / 2); // index 2

  function handleScrollEnd(e: { nativeEvent: { contentOffset: { y: number } } }) {
    const index = Math.round(e.nativeEvent.contentOffset.y / DAY_ITEM_H);
    const clamped = Math.max(0, Math.min(30, index));
    onChange(clamped + 1);
  }

  return (
    <View style={{ height: DAY_ITEM_H * DAY_VISIBLE, overflow: 'hidden', borderRadius: 14, backgroundColor: colors.surface }}>
      {/* Fixed selection strip behind the centre row */}
      <View
        style={{
          position: 'absolute',
          left: 32,
          right: 32,
          top: DAY_ITEM_H * center,
          height: DAY_ITEM_H,
          backgroundColor: colors.primarySurface,
          borderRadius: 10,
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
              <Text style={{
                fontSize: sel ? 26 : 18,
                fontWeight: sel ? '700' : '400',
                color: sel ? colors.primary : colors.textTertiary,
              }}>
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
// Step types
// ---------------------------------------------------------------------------

type StepId =
  | 'billingType'
  | 'serviceName'
  | 'amount'
  | 'billingDate'
  | 'category'
  | 'intent'
  | 'reminder'
  | 'website'
  | 'summary';

function getSteps(): StepId[] {
  return [
    'serviceName',
    'billingType',
    'amount',
    'billingDate',
    'category',
    'intent',
    'reminder',
    'website',
    'summary',
  ];
}

// ---------------------------------------------------------------------------
// Toast helper (copied from src/app/family/[id].tsx)
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
// URL validation helper
// ---------------------------------------------------------------------------

function isValidUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
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

    // Billing type step
    billingTypeCards: { gap: 16 },
    billingTypeCard: {
      borderWidth: 2,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.background,
      borderColor: colors.separator,
    },
    billingTypeCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySurface,
    },
    billingTypeLabel: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    billingTypeLabelSelected: { color: colors.primary },

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
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
      marginTop: 12,
    },
    toggleLabel: { fontSize: 15, color: colors.textPrimary },
    monthlyBreakdown: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 6,
    },
    subInputLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 16,
      marginBottom: 6,
    },
    numberInput: {
      height: 48,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 18,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      textAlign: 'left',
      direction: 'ltr',
    },

    // Billing date step
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
    // Category step
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
    customReminderBtn: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.separator,
      backgroundColor: colors.background,
      minWidth: '45%',
      alignItems: 'center',
    },
    customReminderBtnActive: {
      borderColor: colors.primary,
    },
    customReminderText: { fontSize: 15, fontWeight: '500', color: colors.textSecondary },
    customReminderTextActive: { color: colors.primary },
    cancelModifyNote: {
      marginTop: 16,
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.primarySurface,
    },
    cancelModifyNoteText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },

    // Website step
    urlInput: {
      height: 52,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      textAlign: 'left',
      direction: 'ltr',
    },
    skipLink: {
      alignSelf: 'center',
      marginTop: 16,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    skipLinkText: { fontSize: 15, color: colors.primary, fontWeight: '500' },

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
      width: 80,
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

  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [isFreeTrial, setIsFreeTrial] = useState(false);
  const [freeTrialMonths, setFreeTrialMonths] = useState('');
  const [priceAfterTrialInput, setPriceAfterTrialInput] = useState('');
  const [billingDayOfMonth, setBillingDayOfMonth] = useState(() => String(new Date().getDate()));
  const [nextBillingDate, setNextBillingDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState('other');
  const [intent, setIntent] = useState<SubscriptionIntent | null>(null);
  const [reminderDays, setReminderDays] = useState(7);
  const [customReminderInput, setCustomReminderInput] = useState('');
  const [showCustomReminder, setShowCustomReminder] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState('');
  const [amountError, setAmountError] = useState('');

  // Step navigation
  const [currentStepId, setCurrentStepId] = useState<StepId>('serviceName');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const keyboardPadding = useRef(new Animated.Value(0)).current;

  const steps = useMemo(() => getSteps(), []);
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

  // Pre-fill for edit mode
  useEffect(() => {
    if (!isEditing || !existingSubscription) return;
    setBillingCycle(existingSubscription.billingCycle);
    setServiceName(existingSubscription.serviceName);
    if (existingSubscription.isFree) {
      setIsFree(true);
    } else {
      setAmountInput((existingSubscription.amountAgorot / 100).toFixed(2));
    }
    setIsFreeTrial(existingSubscription.isFreeTrial);
    if (existingSubscription.freeTrialMonths) {
      setFreeTrialMonths(String(existingSubscription.freeTrialMonths));
    }
    if (existingSubscription.priceAfterTrialAgorot) {
      setPriceAfterTrialInput((existingSubscription.priceAfterTrialAgorot / 100).toFixed(2));
    }
    if (existingSubscription.billingDayOfMonth) {
      setBillingDayOfMonth(String(existingSubscription.billingDayOfMonth));
    }
    if (existingSubscription.nextBillingDate) {
      setNextBillingDate(existingSubscription.nextBillingDate);
    }
    setCategory(existingSubscription.category);
    setIntent(existingSubscription.intent);
    setReminderDays(existingSubscription.reminderDays);
    setWebsiteUrl(existingSubscription.websiteUrl ?? '');
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
  // Billing type auto-advance
  // ---------------------------------------------------------------------------

  function handleSelectBillingType(type: SubscriptionBillingCycle) {
    setBillingCycle(type);
    if (type === SubscriptionBillingCycle.ANNUAL) setIsFreeTrial(false);
    goNext();
  }

  // ---------------------------------------------------------------------------
  // canContinue
  // ---------------------------------------------------------------------------

  const canContinue = useMemo(() => {
    switch (currentStepId) {
      case 'billingType':  return billingCycle !== null;
      case 'serviceName':  return serviceName.trim().length > 0;
      case 'amount': {
        if (isFree) return true;
        if (isFreeTrial && billingCycle === SubscriptionBillingCycle.MONTHLY) {
          const months = parseInt(freeTrialMonths, 10);
          const price = parseAmountToAgot(priceAfterTrialInput);
          return months >= 1 && months <= 24 && !isNaN(price) && price > 0;
        }
        const agot = parseAmountToAgot(amountInput);
        return amountInput.trim().length > 0 && !isNaN(agot) && agot > 0;
      }
      case 'billingDate': {
        if (billingCycle === SubscriptionBillingCycle.MONTHLY) return true; // picker always valid
        return nextBillingDate !== null;
      }
      case 'category':  return true;
      case 'intent':    return intent !== null;
      case 'reminder':  return true;
      case 'website':   return websiteUrl.trim() === '' || isValidUrl(websiteUrl);
      case 'summary':   return false;
      default:          return false;
    }
  }, [
    currentStepId, billingCycle, serviceName, isFree, isFreeTrial, amountInput,
    freeTrialMonths, priceAfterTrialInput, billingDayOfMonth, nextBillingDate,
    category, intent, reminderDays, websiteUrl,
  ]);

  // Monthly breakdown for ANNUAL billing
  const monthlyBreakdown = useMemo(() => {
    if (billingCycle !== SubscriptionBillingCycle.ANNUAL || isFree) return null;
    const agot = parseAmountToAgot(amountInput);
    if (isNaN(agot) || agot <= 0) return null;
    return formatCurrency(Math.round(agot / 12));
  }, [billingCycle, amountInput, isFree]);

  // ---------------------------------------------------------------------------
  // Date picker handler (ANNUAL)
  // ---------------------------------------------------------------------------

  function onDateChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setNextBillingDate(date);
      setDateError('');
    }
  }

  // ---------------------------------------------------------------------------
  // handleContinue
  // ---------------------------------------------------------------------------

  function handleContinue() {
    // ANNUAL billing date requires a date to be selected
    if (currentStepId === 'billingDate' && billingCycle !== SubscriptionBillingCycle.MONTHLY) {
      if (!nextBillingDate) {
        setDateError(t('addSubscription.validation.invalidDate'));
        return;
      }
      setDateError('');
    }
    // MONTHLY: picker always yields a valid day (1–31), no validation needed
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

    const amountAgorot = isFree ? 0 : parseAmountToAgot(amountInput);
    const priceAfterAgorot = isFreeTrial ? parseAmountToAgot(priceAfterTrialInput) : undefined;
    const freeMonths = isFreeTrial ? parseInt(freeTrialMonths, 10) : undefined;

    const now = new Date();
    const trialEndsDate =
      isFreeTrial && freeMonths
        ? new Date(now.getFullYear(), now.getMonth() + freeMonths, now.getDate())
        : undefined;

    const subscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: currentUser.uid,
      serviceName: serviceName.trim(),
      billingCycle: billingCycle!,
      amountAgorot,
      isFree,
      isFreeTrial,
      billingDayOfMonth:
        billingCycle === SubscriptionBillingCycle.MONTHLY
          ? parseInt(billingDayOfMonth, 10)
          : undefined,
      nextBillingDate:
        billingCycle === SubscriptionBillingCycle.ANNUAL ? nextBillingDate! : undefined,
      freeTrialMonths: freeMonths,
      priceAfterTrialAgorot: priceAfterAgorot,
      trialEndsDate,
      category,
      intent: intent!,
      status: SubscriptionStatus.ACTIVE,
      reminderDays,
      notificationIds: [],
      websiteUrl: websiteUrl.trim() || undefined,
      notes: '',
      ...(familyId
        ? {
            familyId,
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName ?? '',
          }
        : {}),
    };

    setSaving(true);

    if (isEditing && existingSubscription) {
      try {
        subscriptionsStore.getState().updateSubscription(existingSubscription.id, subscriptionData);
        await updateSubscription(existingSubscription.id, subscriptionData);
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

    // Create new subscription — optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimistic: Subscription = {
      ...subscriptionData,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    } as Subscription;

    subscriptionsStore.getState().addSubscription(optimistic);

    try {
      await createSubscription(subscriptionData);
      subscriptionsStore.getState().removeSubscription(tempId);
      // onSnapshot listener will re-add the real document
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

  function renderBillingTypeStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addSubscription.step.billingType')}</Text>
        <View style={styles.billingTypeCards}>
          <Pressable
            style={[
              styles.billingTypeCard,
              billingCycle === SubscriptionBillingCycle.MONTHLY && styles.billingTypeCardSelected,
            ]}
            onPress={() => handleSelectBillingType(SubscriptionBillingCycle.MONTHLY)}
            accessibilityRole="radio"
            accessibilityState={{ checked: billingCycle === SubscriptionBillingCycle.MONTHLY }}
          >
            <Ionicons
              name="repeat-outline"
              size={40}
              color={billingCycle === SubscriptionBillingCycle.MONTHLY ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.billingTypeLabel,
                billingCycle === SubscriptionBillingCycle.MONTHLY && styles.billingTypeLabelSelected,
              ]}
            >
              {t('addSubscription.billingType.monthly')}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.billingTypeCard,
              billingCycle === SubscriptionBillingCycle.ANNUAL && styles.billingTypeCardSelected,
            ]}
            onPress={() => handleSelectBillingType(SubscriptionBillingCycle.ANNUAL)}
            accessibilityRole="radio"
            accessibilityState={{ checked: billingCycle === SubscriptionBillingCycle.ANNUAL }}
          >
            <Ionicons
              name="calendar-outline"
              size={40}
              color={billingCycle === SubscriptionBillingCycle.ANNUAL ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.billingTypeLabel,
                billingCycle === SubscriptionBillingCycle.ANNUAL && styles.billingTypeLabelSelected,
              ]}
            >
              {t('addSubscription.billingType.annual')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderServiceNameStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addSubscription.step.serviceName')}</Text>
        <ServiceAutocomplete value={serviceName} onChange={setServiceName} autoFocus />
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
        <Text style={styles.stepTitle}>{t('addSubscription.step.amount')}</Text>

        {!isFree && (
          <>
            <View style={styles.amountInputContainer}>
              <Text style={styles.amountSymbol}>₪</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={amountInput}
                onChangeText={(v) => { setAmountInput(v); setAmountError(''); }}
                autoFocus={!isFree}
              />
            </View>
            {!!amountError && <Text style={styles.amountError}>{amountError}</Text>}

            {/* Monthly breakdown for ANNUAL */}
            {monthlyBreakdown && (
              <Text style={styles.monthlyBreakdown}>
                {t('addSubscription.amount.monthlyBreakdown', { amount: monthlyBreakdown })}
              </Text>
            )}

            {/* Free trial toggle — MONTHLY only */}
            {billingCycle === SubscriptionBillingCycle.MONTHLY && (
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{t('addSubscription.amount.freeTrialToggle')}</Text>
                <Switch
                  value={isFreeTrial}
                  onValueChange={setIsFreeTrial}
                  trackColor={{ false: colors.separator, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}

            {/* Free trial sub-fields */}
            {isFreeTrial && billingCycle === SubscriptionBillingCycle.MONTHLY && (
              <>
                <Text style={styles.subInputLabel}>{t('addSubscription.amount.freeTrialMonths')}</Text>
                <TextInput
                  style={styles.numberInput}
                  keyboardType="number-pad"
                  placeholder="3"
                  placeholderTextColor={colors.textTertiary}
                  value={freeTrialMonths}
                  onChangeText={setFreeTrialMonths}
                />
                <Text style={styles.subInputLabel}>{t('addSubscription.amount.priceAfterTrial')}</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.amountSymbol}>₪</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={priceAfterTrialInput}
                    onChangeText={setPriceAfterTrialInput}
                  />
                </View>
              </>
            )}
          </>
        )}

        {/* Free subscription toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('addSubscription.amount.freeToggle')}</Text>
          <Switch
            value={isFree}
            onValueChange={(v) => {
              setIsFree(v);
              if (v) { setIsFreeTrial(false); setAmountError(''); }
            }}
            trackColor={{ false: colors.separator, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ScrollView>
    );
  }

  function renderBillingDateStep() {
    if (billingCycle === SubscriptionBillingCycle.MONTHLY) {
      const dayValue = parseInt(billingDayOfMonth, 10) || 15;
      return (
        <ScrollView
          style={styles.stepScroll}
          contentContainerStyle={styles.stepContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepTitle}>{t('addSubscription.step.billingDateMonthly')}</Text>
          <DayWheelPicker
            value={dayValue}
            onChange={(d) => setBillingDayOfMonth(String(d))}
            colors={colors}
          />
        </ScrollView>
      );
    }

    // ANNUAL: date picker
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={[
          styles.stepContent,
          { paddingBottom: showDatePicker ? 320 : 16 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addSubscription.step.billingDateAnnual')}</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker((v) => !v)}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
          <Text
            style={[styles.dateButtonText, !nextBillingDate && styles.datePlaceholder]}
          >
            {nextBillingDate ? formatDate(nextBillingDate, dateFormat) : dateFormat}
          </Text>
        </TouchableOpacity>
        {!!dateError && <Text style={styles.dateError}>{dateError}</Text>}

        {showDatePicker && (
          <DateTimePicker
            value={nextBillingDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={onDateChange}
            locale="en-GB"
          />
        )}
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
                  <Ionicons
                    name={cat.icon}
                    size={26}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}
                    numberOfLines={2}
                  >
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

  function renderIntentStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addSubscription.step.intent')}</Text>
        <IntentSelector selected={intent} onSelect={setIntent} />
      </ScrollView>
    );
  }

  function renderReminderStep() {
    const showCancelModifyNote =
      intent === SubscriptionIntent.CANCEL || intent === SubscriptionIntent.MODIFY;

    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addSubscription.step.reminder')}</Text>
        <View style={styles.reminderGrid}>
          {SUBSCRIPTION_REMINDER_PRESETS.map((preset) => {
            const isSelected = !showCustomReminder && reminderDays === preset.days;
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
                  {t(preset.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Custom option */}
          <TouchableOpacity
            style={[styles.customReminderBtn, showCustomReminder && styles.customReminderBtnActive]}
            onPress={() => setShowCustomReminder(true)}
          >
            <Text
              style={[
                styles.customReminderText,
                showCustomReminder && styles.customReminderTextActive,
              ]}
            >
              {t('addSubscription.reminder.custom')}
            </Text>
          </TouchableOpacity>
        </View>

        {showCustomReminder && (
          <>
            <Text style={styles.subInputLabel}>{t('addSubscription.reminder.customPlaceholder')}</Text>
            <TextInput
              style={styles.numberInput}
              keyboardType="number-pad"
              value={customReminderInput}
              onChangeText={(v) => {
                setCustomReminderInput(v);
                const parsed = parseInt(v, 10);
                if (!isNaN(parsed) && parsed > 0) setReminderDays(parsed);
              }}
              autoFocus
            />
          </>
        )}

        {showCancelModifyNote && (
          <View style={styles.cancelModifyNote}>
            <Text style={styles.cancelModifyNoteText}>
              {t('addSubscription.reminder.cancelModifyNote')}
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }

  function renderWebsiteStep() {
    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('addSubscription.step.website')}</Text>
        <TextInput
          style={styles.urlInput}
          placeholder={t('addSubscription.website.placeholder')}
          placeholderTextColor={colors.textTertiary}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          autoFocus
        />
        <TouchableOpacity style={styles.skipLink} onPress={goNext}>
          <Text style={styles.skipLinkText}>{t('addSubscription.website.skip')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderSummaryStep() {
    const categoryObj = SUBSCRIPTION_CATEGORIES.find((c) => c.id === category);
    const intentObj = SUBSCRIPTION_INTENTS_MAP[intent ?? SubscriptionIntent.RENEW];
    const amountDisplay = isFree
      ? t('addSubscription.summary.free')
      : isFreeTrial && billingCycle === SubscriptionBillingCycle.MONTHLY
      ? t('addSubscription.summary.freeTrial', {
          months: freeTrialMonths,
          price: formatCurrency(parseAmountToAgot(priceAfterTrialInput)),
        })
      : formatCurrency(parseAmountToAgot(amountInput));

    const billingDisplay =
      billingCycle === SubscriptionBillingCycle.MONTHLY
        ? t('addSubscription.summary.monthly')
        : t('addSubscription.summary.annual');

    const billingDateDisplay =
      billingCycle === SubscriptionBillingCycle.MONTHLY
        ? t('addSubscription.summary.dayOfMonth', { day: billingDayOfMonth })
        : nextBillingDate
        ? formatDate(nextBillingDate, dateFormat)
        : '—';

    const reminderDisplay = t('addSubscription.summary.reminderDays', {
      count: reminderDays,
    });

    return (
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
      >
        <Text style={styles.stepTitle}>{t('addSubscription.step.summary')}</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addSubscription.summary.service')}</Text>
            <Text style={styles.summaryValue}>{serviceName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addSubscription.summary.billing')}</Text>
            <Text style={styles.summaryValue}>{billingDisplay}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addSubscription.summary.amount')}</Text>
            <Text style={[styles.summaryValue, styles.summaryAmountValue]}>{amountDisplay}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {billingCycle === SubscriptionBillingCycle.MONTHLY
                ? t('addSubscription.summary.billingDay')
                : t('addSubscription.summary.renewalDate')}
            </Text>
            <Text style={styles.summaryValue}>{billingDateDisplay}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addSubscription.summary.category')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              {categoryObj && (
                <Ionicons name={categoryObj.icon} size={16} color={colors.textSecondary} />
              )}
              <Text style={styles.summaryValue}>
                {t('subscriptions.category.' + category)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addSubscription.summary.intent')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              {intentObj && (
                <Ionicons name={intentObj.icon} size={16} color={colors.textSecondary} />
              )}
              <Text style={styles.summaryValue}>{intentObj ? t(intentObj.labelKey) : '—'}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addSubscription.summary.reminder')}</Text>
            <Text style={styles.summaryValue}>{reminderDisplay}</Text>
          </View>

          {websiteUrl.trim().length > 0 && (
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <Text style={styles.summaryLabel}>{t('addSubscription.summary.website')}</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>{websiteUrl}</Text>
            </View>
          )}

          {!websiteUrl.trim() && (
            <View style={[styles.summaryRow, styles.summaryRowLast]} />
          )}
        </View>
      </ScrollView>
    );
  }

  function renderCurrentStep() {
    switch (currentStepId) {
      case 'billingType': return renderBillingTypeStep();
      case 'serviceName': return renderServiceNameStep();
      case 'amount':      return renderAmountStep();
      case 'billingDate': return renderBillingDateStep();
      case 'category':    return renderCategoryStep();
      case 'intent':      return renderIntentStep();
      case 'reminder':    return renderReminderStep();
      case 'website':     return renderWebsiteStep();
      case 'summary':     return renderSummaryStep();
    }
  }

  // ---------------------------------------------------------------------------
  // Footer button
  // ---------------------------------------------------------------------------

  function renderFooterButton() {
    // billingType auto-advances — no continue button
    if (currentStepId === 'billingType') return null;

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
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

