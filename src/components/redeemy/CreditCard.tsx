import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ExpirationBadge } from './ExpirationBadge';
import { formatCurrency } from '@/lib/formatCurrency';
import { CATEGORIES } from '@/constants/categories';
import type { Credit } from '@/types/creditTypes';

interface Props {
  credit: Credit;
  onPress: () => void;
}

export function CreditCard({ credit, onPress }: Props) {
  const categoryMeta = CATEGORIES.find((c) => c.id === credit.category);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${credit.storeName} credit, ${formatCurrency(credit.amount)}`}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          {/* Store name */}
          <Text style={styles.storeName} numberOfLines={1}>
            {credit.storeName}
          </Text>

          {/* Amount — hero number */}
          <Text style={styles.amount}>{formatCurrency(credit.amount)}</Text>

          {/* Category + expiration row */}
          <View style={styles.meta}>
            {categoryMeta && (
              <View style={styles.categoryBadge}>
                <Ionicons name={categoryMeta.icon} size={12} color="#757575" />
                <Text style={styles.categoryText}>{categoryMeta.label}</Text>
              </View>
            )}
            <ExpirationBadge expirationDate={credit.expirationDate} />
          </View>
        </View>

        {/* Thumbnail */}
        {credit.thumbnailUrl ? (
          <Image
            source={{ uri: credit.thumbnailUrl }}
            style={styles.thumbnail}
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  left: { flex: 1, gap: 6 },
  storeName: { fontSize: 15, fontWeight: '700', color: '#212121' },
  amount: { fontSize: 26, fontWeight: '800', color: '#212121', letterSpacing: -0.5 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryText: { fontSize: 11, color: '#757575' },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  thumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
