import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SUBSCRIPTION_INTENTS } from '@/constants/subscriptionIntents';
import { SubscriptionIntent } from '@/types/subscriptionTypes';
import type { AppColors } from '@/constants/colors';

interface Props {
  selected: SubscriptionIntent | null;
  onSelect: (intent: SubscriptionIntent) => void;
}

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    container: { gap: 12 },
    card: {
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.background,
      borderColor: colors.separator,
    },
    cardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySurface,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textContainer: { flex: 1, gap: 3 },
    label: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: isRTL ? 'right' : 'left',
    },
    labelSelected: { color: colors.primary },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      textAlign: isRTL ? 'right' : 'left',
    },
  });
}

export function IntentSelector({ selected, onSelect }: Props) {
  const { t } = useTranslation();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);

  return (
    <View style={styles.container}>
      {SUBSCRIPTION_INTENTS.map((option) => {
        const isSelected = selected === option.intent;
        return (
          <TouchableOpacity
            key={option.intent}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(option.intent)}
            activeOpacity={0.75}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={option.icon}
                size={28}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {t(option.labelKey)}
              </Text>
              <Text style={styles.description}>{t(option.descriptionKey)}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
