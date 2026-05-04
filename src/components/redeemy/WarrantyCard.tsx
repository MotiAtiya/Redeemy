import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BaseCard } from './BaseCard';
import { MemberAvatarOverlay } from './MemberAvatarOverlay';
import { ExpirationBadge } from './ExpirationBadge';
import { formatDate } from '@/lib/formatDate';
import { useSettingsStore } from '@/stores/settingsStore';
import { CATEGORIES } from '@/constants/categories';
import { type Warranty } from '@/types/warrantyTypes';
import { getWarrantyProductLabel } from '@/data/warrantyProductTypes';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';
import { normalizeTimestampOrNow } from "@/lib/dateUtils";

interface Props {
  warranty: Warranty;
  onPress: () => void;
  variant?: 'active' | 'closed' | 'expired';
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    left: { flex: 1, gap: 6, alignItems: 'flex-start' },
    storeName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    productName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
    productNameDimmed: { color: colors.textTertiary },
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

export function WarrantyCard({ warranty, onPress, variant = 'active' }: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, i18n } = useTranslation();
  const dateFormat = useSettingsStore((s) => s.dateFormat);

  const categoryMeta = CATEGORIES.find((c) => c.id === warranty.category);
  const productLabel =
    getWarrantyProductLabel(warranty.productType, i18n.language)
    || warranty.productName
    || '';
  const dimmed = variant === 'closed' || variant === 'expired';

  const badgeDate = (() => {
    if (variant === 'closed' && warranty.closedAt)
      return formatDate(new Date(warranty.closedAt as Date), dateFormat);
    if (variant === 'expired' && warranty.expirationDate)
      return formatDate(new Date(warranty.expirationDate as Date), dateFormat);
    return null;
  })();

  const expirationDate = warranty.expirationDate
    ? (normalizeTimestampOrNow(warranty.expirationDate))
    : undefined;

  return (
    <BaseCard
      onPress={onPress}
      dimmed={dimmed}
      accessibilityLabel={`${warranty.storeName} — ${productLabel}`}
    >
      <MemberAvatarOverlay item={warranty}>
        {(warranty.images?.[0]?.thumbnailUrl ?? warranty.thumbnailUrl) ? (
          <Image
            source={{ uri: warranty.images?.[0]?.thumbnailUrl ?? warranty.thumbnailUrl! }}
            style={[styles.thumbnail, dimmed && styles.thumbnailDimmed]}
            contentFit="cover"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.textTertiary} />
          </View>
        )}
      </MemberAvatarOverlay>

      <View style={styles.left}>
        <Text style={[styles.storeName, dimmed && styles.textDimmed]} numberOfLines={1}>
          {warranty.storeName}
        </Text>

        <Text
          style={[styles.productName, dimmed && styles.productNameDimmed]}
          numberOfLines={1}
        >
          {productLabel}
        </Text>

        {dimmed ? (
          badgeDate ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {variant === 'expired'
                  ? t('warrantyCard.expired', { date: badgeDate })
                  : t('warrantyCard.redeemed', { date: badgeDate })}
              </Text>
            </View>
          ) : null
        ) : (
          <ExpirationBadge expirationDate={warranty.noExpiry ? undefined : expirationDate} />
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
