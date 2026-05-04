import { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet, I18nManager, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { DaysPickerSheet, type DaysOption } from './DaysPickerSheet';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  /** Master "notifications enabled" — when false the section dims and rows are tap-disabled. */
  enabled: boolean;
  /** UPPERCASE category label rendered above the rows (e.g. "CREDITS"). */
  typeLabel: string;
  // Reminder-days row + sheet
  reminderIcon: IoniconsName;
  reminderLabel: string;
  reminderSheetTitle: string;
  reminderOptions: DaysOption[];
  reminderValue: number;
  onReminderChange: (days: number) => void;
  // Day-of switch row
  switchIcon: IoniconsName;
  switchLabel: string;
  switchValue: boolean;
  onSwitchChange: (value: boolean) => void;
}

/**
 * One feature card section for the notification-settings screen — the
 * three-row block of [type label] / [reminder-days row + sheet] /
 * [on-day switch row]. Used five times (credits, warranties, subscriptions,
 * occasions, documents) with feature-specific copy/icons.
 */
export function ReminderSection({
  enabled,
  typeLabel,
  reminderIcon,
  reminderLabel,
  reminderSheetTitle,
  reminderOptions,
  reminderValue,
  onReminderChange,
  switchIcon,
  switchLabel,
  switchValue,
  onSwitchChange,
}: Props) {
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const [sheetVisible, setSheetVisible] = useState(false);

  const dimmedTextStyle = !enabled ? { color: colors.textTertiary } : undefined;
  const currentLabel = reminderOptions.find((o) => o.days === reminderValue)?.label ?? '';

  return (
    <>
      <Text style={[styles.typeLabel, { color: colors.textTertiary }]}>{typeLabel}</Text>

      <TouchableOpacity
        style={styles.row}
        onPress={() => enabled && setSheetVisible(true)}
        accessibilityRole="button"
      >
        <Ionicons name={reminderIcon} size={20} color={colors.textSecondary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }, dimmedTextStyle]}>
            {reminderLabel}
          </Text>
        </View>
        <Text style={[styles.rowValue, { color: colors.textTertiary }]}>{currentLabel}</Text>
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={16}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      <View style={[styles.separator, { backgroundColor: colors.separator }]} />

      <View style={styles.row}>
        <Ionicons name={switchIcon} size={20} color={colors.textSecondary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }, dimmedTextStyle]}>
            {switchLabel}
          </Text>
        </View>
        <Switch
          style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
          value={switchValue}
          onValueChange={onSwitchChange}
          disabled={!enabled}
          trackColor={{ false: colors.separator, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      <DaysPickerSheet
        visible={sheetVisible}
        title={reminderSheetTitle}
        options={reminderOptions}
        selected={reminderValue}
        onSelect={onReminderChange}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  rowLabel: { fontSize: 15, alignSelf: 'flex-start' },
  rowValue: { fontSize: 13, marginEnd: 4 },
  separator: { height: 1, marginStart: 16 },
});
