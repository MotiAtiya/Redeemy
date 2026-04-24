import type { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StepProgressBar } from '@/components/redeemy/StepProgressBar';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useKeyboardPadding } from '@/hooks/useKeyboardPadding';

interface Props {
  title: string;
  onBack: () => void;
  /** When true, back button shows 'close'; otherwise shows chevron-back/forward */
  isFirstStep?: boolean;
  totalSteps: number;
  currentStepIndex: number;
  /** Animation values returned by useStepAnimation */
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  /** The footer button (or null for steps with self-contained navigation) */
  footerButton?: ReactNode;
  /** The current step content */
  children: ReactNode;
  /** Extra nodes rendered before the main layout (e.g. CropModal) */
  extras?: ReactNode;
  /** Toast overlay rendered over everything */
  toast?: ReactNode;
  /** When provided, shows a save icon in the header (edit mode quick-save) */
  onSave?: () => void;
  isSaving?: boolean;
}

/**
 * Shared shell for add-credit, add-warranty, add-subscription multi-step forms.
 * Handles: SafeAreaView, header, animated step area, keyboard-aware footer.
 */
export function StepFormScreen({
  title,
  onBack,
  isFirstStep = false,
  totalSteps,
  currentStepIndex,
  fadeAnim,
  slideAnim,
  footerButton,
  children,
  extras,
  toast,
  onSave,
  isSaving = false,
}: Props) {
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const keyboardPadding = useKeyboardPadding();
  const { width: screenWidth } = Dimensions.get('window');

  const backIcon = isFirstStep
    ? 'close'
    : isRTL ? 'chevron-forward' : 'chevron-back';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]} edges={['top']}>
      {extras}

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity style={styles.headerBack} onPress={onBack} hitSlop={8}>
          <Ionicons
            name={backIcon}
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {onSave ? (
          <TouchableOpacity style={styles.headerRight} onPress={onSave} disabled={isSaving} hitSlop={8}>
            {isSaving
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="checkmark" size={26} color={colors.primary} />
            }
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {/* Keyboard-aware wrapper */}
      <Animated.View style={[styles.flex, { paddingBottom: keyboardPadding }]}>
        {/* Animated step content */}
        <Animated.View
          style={[
            { flex: 1, width: screenWidth },
            { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {children}
        </Animated.View>

        {/* Footer: progress bar + optional button */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.separator }]}>
          <StepProgressBar totalSteps={totalSteps} currentStep={currentStepIndex} />
          {footerButton}
        </View>
      </Animated.View>

      {toast}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: { width: 40, justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: { width: 40 },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
