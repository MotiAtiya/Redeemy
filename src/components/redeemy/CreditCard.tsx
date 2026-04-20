import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ExpirationBadge } from './ExpirationBadge';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDate } from '@/lib/formatDate';
import { useSettingsStore, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { CATEGORIES } from '@/constants/categories';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

interface Props {
  credit: Credit;
  onPress: () => void;
  /** Muted styling for redeemed/expired credits */
  variant?: 'active' | 'redeemed' | 'expired';
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      marginHorizontal: 16,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    cardDimmed: { opacity: 0.75 },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    left: { flex: 1, gap: 6, alignItems: 'flex-start' },
    storeName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    amount: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
    amountDimmed: { color: colors.textTertiary },
    textDimmed: { color: colors.textTertiary },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    categoryText: { fontSize: 11, color: colors.textSecondary },
    redeemedBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.separator,
      backgroundColor: colors.background,
    },
    redeemedBadgeText: { fontSize: 11, color: colors.textTertiary, fontWeight: '500' },
    thumbnail: {
      width: 72,
      height: 72,
      borderRadius: 10,
      backgroundColor: colors.separator,
    },
    thumbnailDimmed: { opacity: 0.6 },
    thumbnailPlaceholder: {
      width: 72,
      height: 72,
      borderRadius: 10,
      backgroundColor: colors.separator,
      justifyContent: 'center',
      alignItems: 'center',
    },
    memberAvatar: {
      position: 'absolute',
      bottom: -4,
      end: -4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    memberAvatarText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}

export function CreditCard({ credit, onPress, variant = 'active' }: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const currencySymbol = CURRENCY_SYMBOLS[useSettingsStore((s) => s.currency)];
  const currentUid = useAuthStore((s) => s.currentUser?.uid);

  const categoryMeta = CATEGORIES.find((c) => c.id === credit.category);
  const dimmed = variant === 'redeemed' || variant === 'expired';

  const showMemberAvatar =
    credit.familyId &&
    credit.createdBy &&
    credit.createdByName &&
    credit.createdBy !== currentUid;
  const memberInitials = showMemberAvatar
    ? credit.createdByName!
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : null;

  const badgeDate = (() => {
    if (variant === 'redeemed' && credit.redeemedAt)
      return formatDate(new Date(credit.redeemedAt as Date), dateFormat);
    if (variant === 'expired' && credit.expiredAt)
      return formatDate(new Date(credit.expiredAt as Date), dateFormat);
    return null;
  })();

  return (
    <TouchableOpacity
      style={[styles.card, dimmed && styles.cardDimmed]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${credit.storeName} credit, ${formatCurrency(credit.amount, currencySymbol)}`}
    >
      <View style={styles.content}>
        <View>
          {credit.thumbnailUrl ? (
            <Image
              source={{ uri: credit.thumbnailUrl }}
              style={[styles.thumbnail, dimmed && styles.thumbnailDimmed]}
              contentFit="cover"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              transition={200}
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
            </View>
          )}
          {showMemberAvatar && (
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{memberInitials}</Text>
            </View>
          )}
        </View>

        <View style={styles.left}>
          <Text style={[styles.storeName, dimmed && styles.textDimmed]} numberOfLines={1}>
            {credit.storeName}
          </Text>

          <Text style={[styles.amount, dimmed && styles.amountDimmed]}>
            {formatCurrency(credit.amount, currencySymbol)}
          </Text>

          <View style={styles.meta}>
            {categoryMeta && (
              <View style={styles.categoryBadge}>
                <Ionicons
                  name={categoryMeta.icon}
                  size={12}
                  color={dimmed ? colors.textTertiary : colors.textSecondary}
                />
                <Text style={[styles.categoryText, dimmed && styles.textDimmed]}>
                  {t('category.' + categoryMeta.id)}
                </Text>
              </View>
            )}
            {dimmed ? (
              badgeDate ? (
                <View style={styles.redeemedBadge}>
                  <Text style={styles.redeemedBadgeText}>
                    {variant === 'expired'
                      ? t('creditCard.expired', { date: badgeDate })
                      : t('creditCard.redeemed', { date: badgeDate })}
                  </Text>
                </View>
              ) : null
            ) : (
              <ExpirationBadge expirationDate={credit.expirationDate} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
