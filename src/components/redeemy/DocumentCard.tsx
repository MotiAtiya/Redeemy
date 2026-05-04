import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BaseCard } from './BaseCard';
import { ExpirationBadge } from './ExpirationBadge';
import { MemberAvatarOverlay } from './MemberAvatarOverlay';
import { useAppTheme } from '@/hooks/useAppTheme';
import { type Document } from '@/types/documentTypes';
import { DOCUMENT_TYPE_ICONS } from '@/constants/documentTypeIcons';
import type { AppColors } from '@/constants/colors';
import { normalizeTimestampOrNow } from "@/lib/dateUtils";

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
    title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
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

  const expirationDate = normalizeTimestampOrNow(document.expirationDate);

  const baseTypeLabel = document.type === 'other' && document.customTypeName
    ? document.customTypeName
    : t(`documents.types.${document.type}`);
  const typeLabel = document.typeDetail
    ? `${baseTypeLabel} (${document.typeDetail})`
    : baseTypeLabel;

  return (
    <BaseCard onPress={onPress} accessibilityLabel={`${typeLabel} — ${document.ownerName}`}>
      <MemberAvatarOverlay item={document}>
        {(document.images?.[0]?.thumbnailUrl ?? document.thumbnailUrl) ? (
          <Image
            source={{ uri: document.images?.[0]?.thumbnailUrl ?? document.thumbnailUrl! }}
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
      </MemberAvatarOverlay>

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>{typeLabel}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{document.ownerName}</Text>
        <ExpirationBadge expirationDate={expirationDate} />
      </View>

      <View style={styles.iconCircle}>
        <Ionicons name={DOCUMENT_TYPE_ICONS[document.type]} size={20} color={colors.primary} />
      </View>
    </BaseCard>
  );
}
