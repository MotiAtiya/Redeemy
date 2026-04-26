import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BaseCard } from './BaseCard';
import { MemberAvatar } from './MemberAvatar';
import { ExpirationBadge } from './ExpirationBadge';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDate } from '@/lib/formatDate';
import { useSettingsStore, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { CATEGORIES } from '@/constants/categories';
import { type Credit } from '@/types/creditTypes';
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
    left: { flex: 1, gap: 6, alignItems: 'flex-start' },
    storeName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    amount: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
    amountCents: { fontSize: 15, fontWeight: '600', letterSpacing: 0 },
    amountDimmed: { color: colors.textTertiary },
    textDimmed: { color: colors.textTertiary },
    categoryIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryIconCircleDimmed: { backgroundColor: colors.background },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.separator,
      backgroundColor: colors.background,
    },
    badgeText: { fontSize: 11, color: colors.textTertiary, fontWeight: '500' },
    thumbnail: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.separator },
    thumbnailDimmed: { opacity: 0.6 },
    thumbnailPlaceholder: {
      width: 72,
      height: 72,
      borderRadius: 10,
      backgroundColor: colors.separator,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

export function CreditCard({ credit, onPress, variant = 'active' }: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const currencySymbol = CURRENCY_SYMBOLS[credit.currency ?? 'ILS'];

  const categoryMeta = CATEGORIES.find((c) => c.id === credit.category);
  const dimmed = variant === 'redeemed' || variant === 'expired';

  const badgeDate = (() => {
    if (variant === 'redeemed' && credit.redeemedAt)
      return formatDate(new Date(credit.redeemedAt as Date), dateFormat);
    if (variant === 'expired' && credit.expiredAt)
      return formatDate(new Date(credit.expiredAt as Date), dateFormat);
    return null;
  })();

  return (
    <BaseCard
      onPress={onPress}
      dimmed={dimmed}
      accessibilityLabel={`${credit.storeName} credit, ${formatCurrency(credit.amount, currencySymbol)}`}
    >
      <View>
        {(credit.images?.[0]?.thumbnailUrl ?? credit.thumbnailUrl) ? (
          <Image
            source={{ uri: credit.images?.[0]?.thumbnailUrl ?? credit.thumbnailUrl! }}
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
        <MemberAvatar
          familyId={credit.familyId}
          createdBy={credit.createdBy}
          createdByName={credit.createdByName}
        />
      </View>

      <View style={styles.left}>
        <Text style={[styles.storeName, dimmed && styles.textDimmed]} numberOfLines={1}>
          {credit.storeName}
        </Text>

        <Text style={[styles.amount, dimmed && styles.amountDimmed]}>
          {(() => {
            const [whole, cents] = formatCurrency(credit.amount, currencySymbol).split('.');
            return (
              <>
                {whole}
                <Text style={styles.amountCents}>.{cents}</Text>
              </>
            );
          })()}
        </Text>

        {dimmed ? (
          badgeDate ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
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

      {categoryMeta && (
        <View style={[styles.categoryIconCircle, dimmed && styles.categoryIconCircleDimmed]}>
          <Ionicons
            name={categoryMeta.icon}
            size={20}
            color={dimmed ? colors.textTertiary : colors.primary}
          />
        </View>
      )}
    </BaseCard>
  );
}
