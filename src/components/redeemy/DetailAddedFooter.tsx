import { useMemo } from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import type { Timestamp } from 'firebase/firestore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatDate } from '@/lib/formatDate';
import { normalizeTimestampOrNow } from '@/lib/dateUtils';
import type { AppColors } from '@/constants/colors';

interface Props {
  label: string;
  createdAt: Date | Timestamp | string | number | null | undefined;
  style?: StyleProp<TextStyle>;
}

export function DetailAddedFooter({ label, createdAt, style }: Props) {
  const colors = useAppTheme();
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Text style={[styles.text, style]}>
      {label}: {formatDate(normalizeTimestampOrNow(createdAt), dateFormat)}
    </Text>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    text: { fontSize: 12, color: colors.textTertiary, alignSelf: 'flex-start' },
  });
}
