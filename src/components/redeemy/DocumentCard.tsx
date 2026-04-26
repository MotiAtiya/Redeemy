import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BaseCard } from './BaseCard';
import { ExpirationBadge } from './ExpirationBadge';
import { useAppTheme } from '@/hooks/useAppTheme';
import { type Document, type DocumentType } from '@/types/documentTypes';
import type { AppColors } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_ICONS: Record<DocumentType, IoniconsName> = {
  id_card: 'person-circle-outline',
  license: 'car-outline',
  passport: 'airplane-outline',
  insurance: 'shield-checkmark-outline',
  other: 'document-outline',
};

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    thumbnail: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.separator },
    thumbnailPlaceholder: {
      width: 72,
      height: 72,
      borderRadius: 10,
      backgroundColor: colors.separator,
      justifyContent: 'center',
      alignItems: 'center',
    },
    center: { flex: 1, gap: 4, alignItems: 'flex-start' },
    title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    subtitle: { fontSize: 13, color: colors.textSecondary },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

interface Props {
  document: Document;
  onPress: () => void;
}

export function DocumentCard({ document, onPress }: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  const expirationDate = document.expirationDate instanceof Date
    ? document.expirationDate
    : new Date(document.expirationDate as unknown as string);

  const typeLabel = t(`documents.types.${document.type}`);

  return (
    <BaseCard onPress={onPress} accessibilityLabel={`${typeLabel} — ${document.ownerName}`}>
      {document.thumbnailUrl ? (
        <Image
          source={{ uri: document.thumbnailUrl }}
          style={styles.thumbnail}
          contentFit="cover"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          transition={200}
        />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
        </View>
      )}

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>{typeLabel}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{document.ownerName}</Text>
        <ExpirationBadge expirationDate={expirationDate} />
      </View>

      <View style={styles.iconCircle}>
        <Ionicons name={TYPE_ICONS[document.type]} size={20} color={colors.primary} />
      </View>
    </BaseCard>
  );
}
