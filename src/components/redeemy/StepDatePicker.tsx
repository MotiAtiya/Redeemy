import { useEffect, useState } from 'react';
import { I18nManager, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatDate } from '@/lib/formatDate';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  // True when the parent step is currently visible. Used on Android to auto-open
  // the system date dialog once on entry, preserving the original UX without
  // the reopen-loop bug caused by always-mounted pickers.
  isActive: boolean;
  // When false, do not auto-open the dialog on Android entry — the user must tap
  // the date field. Useful when the same step also offers an opt-out (e.g. a
  // "no expiry" toggle) and a popup would be intrusive.
  autoOpenOnAndroid?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function StepDatePicker({
  value,
  onChange,
  isActive,
  autoOpenOnAndroid = true,
  minimumDate,
  maximumDate,
}: Props) {
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && isActive && autoOpenOnAndroid) {
      setShowPicker(true);
    }
  }, [isActive, autoOpenOnAndroid]);

  function handleChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) onChange(date);
  }

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="spinner"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={handleChange}
        textColor={colors.textPrimary}
        locale="en-GB"
      />
    );
  }

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.button,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            borderColor: colors.separator,
            backgroundColor: colors.background,
          },
        ]}
        onPress={() => setShowPicker(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
        <Text
          style={[
            styles.buttonText,
            { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {formatDate(value, dateFormat)}
        </Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
          locale="en-GB"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  buttonText: { flex: 1, fontSize: 16 },
});
