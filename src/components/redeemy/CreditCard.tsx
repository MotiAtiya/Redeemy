import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ExpirationBadge } from './ExpirationBadge';
import { formatCurrency } from '@/lib/formatCurrency';
import { CATEGORIES } from '@/constants/categories';
import { CreditStatus, type Credit } from '@/types/creditTypes';

interface Props {
  credit: Credit;
  onPress: () => void;
  /** Muted styling for redeemed credits */
  variant?: 'active' | 'redeemed';
}

export function CreditCard({ credit, onPress, variant = 'active' }: Props) {
  const categoryMeta = CATEGORIES.find((c) => c.id === credit.category);
  const dimmed = variant === 'redeemed';

  const redeemedDate =
    dimmed && credit.redeemedAt
      ? new Date(credit.redeemedAt as Date).toLocaleDateString('en-GB')
      : null;

  return (
    <TouchableOpacity
      style={[styles.card, dimmed && styles.cardDimmed]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${credit.storeName} credit, ${formatCurrency(credit.amount)}`}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          {/* Store name */}
          <Text style={[styles.storeName, dimmed && styles.textDimmed]} numberOfLines={1}>
            {credit.storeName}
          </Text>

          {/* Amount — hero number */}
          <Text style={[styles.amount, dimmed && styles.amountDimmed]}>
            {formatCurrency(credit.amount)}
          </Text>

          {/* Category + status row */}
          <View style={styles.meta}>
            {categoryMeta && (
              <View style={styles.categoryBadge}>
                <Ionicons
                  name={categoryMeta.icon}
                  size={12}
                  color={dimmed ? '#BDBDBD' : '#757575'}
                />
                <Text style={[styles.categoryText, dimmed && styles.textDimmed]}>
                  {categoryMeta.label}
                </Text>
              </View>
            )}
            {dimmed ? (
              redeemedDate ? (
                <View style={styles.redeemedBadge}>
                  <Text style={styles.redeemedBadgeText}>Redeemed {redeemedDate}</Text>
                </View>
              ) : null
            ) : (
              <ExpirationBadge expirationDate={credit.expirationDate} />
            )}
          </View>
        </View>

        {/* Thumbnail */}
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
            <Ionicons name="image-outline" size={24} color="#BDBDBD" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
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
  left: { flex: 1, gap: 6 },
  storeName: { fontSize: 15, fontWeight: '700', color: '#212121' },
  amount: { fontSize: 26, fontWeight: '800', color: '#212121', letterSpacing: -0.5 },
  amountDimmed: { color: '#9E9E9E' },
  textDimmed: { color: '#9E9E9E' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryText: { fontSize: 11, color: '#757575' },
  redeemedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  redeemedBadgeText: { fontSize: 11, color: '#9E9E9E', fontWeight: '500' },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  thumbnailDimmed: { opacity: 0.6 },
  thumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
