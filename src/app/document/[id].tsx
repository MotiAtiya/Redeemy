import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  I18nManager,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DetailRow } from '@/components/redeemy/DetailRow';
import { ActionModal } from '@/components/redeemy/ActionModal';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { deleteDocument } from '@/lib/firestoreDocuments';
import { deleteDocumentImages } from '@/lib/imageUpload';
import { formatDate } from '@/lib/formatDate';
import { useAppTheme } from '@/hooks/useAppTheme';
import { type DocumentType } from '@/types/documentTypes';
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
    safe: { flex: 1, backgroundColor: colors.background },
    backButton: { padding: 16 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      backgroundColor: colors.background,
    },
    headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary, alignSelf: 'flex-start' },
    scroll: { flex: 1 },
    scrollContent: { gap: 12, paddingBottom: 32 },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 16,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
    heroOwner: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
    expiryBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
    },
    expiryBadgeText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
    detailsCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', marginHorizontal: 16 },
    photoCard: {
      marginHorizontal: 16,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    photo: { width: '100%', aspectRatio: 4 / 3 },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notFoundText: { fontSize: 16, color: colors.textTertiary },
  });
}

export default function DocumentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const dateFormat = useSettingsStore((s) => s.dateFormat);

  const document = useDocumentsStore((s) => s.documents.find((d) => d.id === id));
  const removeDocument = useDocumentsStore((s) => s.removeDocument);
  const currentUid = useAuthStore((s) => s.currentUser?.uid);
  const familyAdminId = useFamilyStore((s) => s.family?.adminId);
  const canDelete = document
    ? document.userId === currentUid || familyAdminId === currentUid
    : false;

  const [showActionSheet, setShowActionSheet] = useState(false);
  const afterDismissRef = useRef<(() => void) | null>(null);

  if (!document) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('document.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const expirationDate = document.expirationDate instanceof Date
    ? document.expirationDate
    : new Date(document.expirationDate as unknown as string);

  // Expiry badge colors
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expirationDate);
  expiry.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let badgeBg: string;
  let badgeColor: string;
  let badgeLabel: string;

  if (daysUntil < 0) {
    badgeBg = colors.urgencyRedSurface;
    badgeColor = colors.danger;
    badgeLabel = t('documents.expired');
  } else if (daysUntil === 0) {
    badgeBg = colors.urgencyAmberSurface;
    badgeColor = colors.urgencyAmber;
    badgeLabel = t('documents.today');
  } else if (daysUntil <= 30) {
    badgeBg = colors.urgencyAmberSurface;
    badgeColor = colors.urgencyAmber;
    badgeLabel = t('documents.daysUntil', { count: daysUntil });
  } else {
    badgeBg = colors.primarySurface;
    badgeColor = colors.primary;
    badgeLabel = t('documents.daysUntil', { count: daysUntil });
  }

  async function handleDelete() {
    if (useUIStore.getState().offlineMode) {
      setShowActionSheet(false);
      Alert.alert(t('offline.title'), t('document.delete.offlineMessage'));
      return;
    }
    setShowActionSheet(false);
    Alert.alert(
      t('document.delete.title'),
      t('document.delete.message', { name: t(`documents.types.${document!.type}`) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('document.delete.button'),
          style: 'destructive',
          onPress: async () => {
            try {
              removeDocument(document!.id);
              await Promise.all([
                deleteDocument(document!.id),
                deleteDocumentImages(document!.id),
              ]);
              router.back();
            } catch {
              Alert.alert(t('common.error'), t('document.delete.error'));
            }
          },
        },
      ]
    );
  }

  function handleEdit() {
    afterDismissRef.current = () => { router.push(`/add-document?documentId=${document!.id}`); };
    setShowActionSheet(false);
  }

  const typeLabel = t(`documents.types.${document.type}`);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{typeLabel}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowActionSheet(true)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Photo */}
        {!!document.imageUrl && (
          <View style={styles.photoCard}>
            <Image
              source={{ uri: document.imageUrl }}
              style={styles.photo}
              contentFit="cover"
            />
          </View>
        )}

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <Ionicons name={TYPE_ICONS[document.type]} size={34} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{typeLabel}</Text>
          <Text style={styles.heroOwner}>{document.ownerName}</Text>
          <View style={[styles.expiryBadge, { backgroundColor: badgeBg, borderColor: badgeColor }]}>
            <Text style={[styles.expiryBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsCard}>
          <DetailRow
            icon="pricetag-outline"
            label={t('document.detail.type')}
            value={typeLabel}
            showSeparator
          />
          <DetailRow
            icon="person-outline"
            label={t('document.detail.owner')}
            value={document.ownerName}
            showSeparator
          />
          <DetailRow
            icon="calendar-outline"
            label={t('document.detail.expiration')}
            value={formatDate(expirationDate, dateFormat)}
            showSeparator={!!document.notes}
          />
          {!!document.notes && (
            <DetailRow
              icon="document-text-outline"
              label={t('document.detail.notes')}
              value={document.notes}
            />
          )}
        </View>
      </ScrollView>

      <ActionModal
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        cancelLabel={t('common.cancel')}
        onDismiss={() => {
          const action = afterDismissRef.current;
          afterDismissRef.current = null;
          action?.();
        }}
        actions={[
          { icon: 'create-outline', label: t('document.action.edit'), color: colors.textPrimary, onPress: handleEdit },
          canDelete
            ? { icon: 'trash-outline', label: t('document.action.delete'), color: colors.danger, onPress: handleDelete }
            : null,
        ]}
      />
    </SafeAreaView>
  );
}
