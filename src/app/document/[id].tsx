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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DetailRow } from '@/components/redeemy/DetailRow';
import { computeExpiryBadge } from '@/components/redeemy/ExpirationBadge';
import { HeroCard } from '@/components/redeemy/HeroCard';
import { HeroBadge } from '@/components/redeemy/HeroBadge';
import { ImageCarousel } from '@/components/redeemy/ImageCarousel';
import { DetailScreenHeader } from '@/components/redeemy/DetailScreenHeader';
import { ActionModal } from '@/components/redeemy/ActionModal';
import { DocumentRenewalPrompt, documentNeedsRenewal } from '@/components/redeemy/DocumentRenewalPrompt';
import { FullscreenImageViewer } from '@/components/redeemy/FullscreenImageViewer';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { showToast } from '@/stores/toastStore';
import { deleteDocument } from '@/lib/firestoreDocuments';
import { formatDate } from '@/lib/formatDate';
import { useAppTheme } from '@/hooks/useAppTheme';
import { type DocumentType } from '@/types/documentTypes';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import type { AppColors } from '@/constants/colors';


function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { gap: 12, paddingBottom: 32 },
    heroTitle: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    heroOwner: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
    detailsCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', marginHorizontal: 16 },
    addedFooterText: { fontSize: 12, color: colors.textTertiary, alignSelf: 'flex-start', marginHorizontal: 16 },
    photoCard: {
      marginHorizontal: 16,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    backButton: { padding: 16 },
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
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const afterDismissRef = useRef<(() => void) | null>(null);

  const images = document?.images ?? [];

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
            // Navigate away FIRST so the screen doesn't flash "not found"
            // while the firestore write resolves.
            router.back();
            showToast(t('toasts.deleted.document'));
            try {
              removeDocument(document!.id);
              await deleteDocument(document!.id);
            } catch {
              Alert.alert(t('common.error'), t('document.delete.error'));
            }
          },
        },
      ]
    );
  }

  async function handleDownloadImage() {
    const imageUrl = images[fullscreenIndex]?.url;
    if (!imageUrl) return;
    setDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('document.image.permissionDenied'));
        return;
      }
      const filename = `redeemy-doc-${Date.now()}.jpg`;
      const localUri = FileSystem.cacheDirectory + filename;
      const { uri } = await FileSystem.downloadAsync(imageUrl, localUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t('document.image.savedTitle'), t('document.image.savedMessage'));
    } catch (e) {
      console.error('Download error:', e);
      Alert.alert(t('common.error'), t('document.image.saveError'));
    } finally {
      setDownloading(false);
    }
  }

  function handleEdit() {
    afterDismissRef.current = () => { router.push(`/add-document?documentId=${document!.id}`); };
    setShowActionSheet(false);
  }

  const typeLabel = document.type === 'other' && document.customTypeName
    ? document.customTypeName
    : t(`documents.types.${document.type}`);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <DetailScreenHeader
        title={typeLabel}
        onBack={() => router.back()}
        onMenu={() => setShowActionSheet(true)}
        colors={colors}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Photo carousel */}
        {images.length > 0 && (
          <View style={{ marginHorizontal: 16 }}>
            <ImageCarousel
              images={images}
              onImagePress={(index) => { setFullscreenIndex(index); setShowFullscreenImage(true); }}
              colors={colors}
            />
          </View>
        )}

        {/* Main card */}
        <HeroCard style={{ marginHorizontal: 16 }}>
          <Text style={styles.heroTitle}>{typeLabel}</Text>
          <Text style={styles.heroOwner}>{document.ownerName}</Text>
          {(() => {
            const badge = computeExpiryBadge(expirationDate, t, colors);
            return <HeroBadge text={badge.text} color={badge.color} bgColor={badge.bgColor} />;
          })()}
        </HeroCard>

        {documentNeedsRenewal(document) && (
          <DocumentRenewalPrompt document={document} onResolved={() => router.back()} />
        )}

        {/* Details */}
        <View style={styles.detailsCard}>
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
              multiline
            />
          )}
        </View>

        <Text style={styles.addedFooterText}>
          {t('document.detail.added')}: {formatDate(new Date(document.createdAt as Date), dateFormat)}
        </Text>
      </ScrollView>

      <FullscreenImageViewer
        visible={showFullscreenImage}
        image={images[fullscreenIndex] ?? null}
        downloading={downloading}
        onClose={() => setShowFullscreenImage(false)}
        onDownload={handleDownloadImage}
      />

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
