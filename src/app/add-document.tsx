import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStepAnimation } from '@/hooks/useStepAnimation';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  I18nManager,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { StepFormScreen } from '@/components/redeemy/StepFormScreen';
import { CropModal } from '@/components/redeemy/CropModal';
import { createDocument, updateDocument } from '@/lib/firestoreDocuments';
import { openCamera, openGallery, uploadEntityImage, type DocumentImage } from '@/lib/imageUpload';
import { PhotoPickerStep, type PhotoItem } from '@/components/redeemy/PhotoPickerStep';
import { useAuthStore } from '@/stores/authStore';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatDate } from '@/lib/formatDate';
import { type DocumentType } from '@/types/documentTypes';
import { DOCUMENT_TYPE_OPTIONS } from '@/constants/documentTypeIcons';
import type { AppColors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

type StepId = 'type' | 'owner' | 'expiration' | 'photo' | 'summary';
const STEPS: StepId[] = ['type', 'owner', 'expiration', 'photo', 'summary'];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    stepScroll: { flex: 1 },
    stepContent: { padding: 24, paddingBottom: 16, flexGrow: 1 },
    stepTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
      alignSelf: 'flex-start',
      marginBottom: 16,
    },
    continueBtn: {
      height: 54,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    continueBtnDisabled: { backgroundColor: colors.separator },
    continueBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

    // Choice cards (type step)
    choiceCards: { gap: 12 },
    choiceCard: {
      borderWidth: 2,
      borderRadius: 20,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderColor: colors.separator,
      backgroundColor: colors.surface,
    },
    choiceCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySurface,
    },
    choiceCardIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    choiceCardIconSelected: { backgroundColor: colors.primarySurface },
    choiceCardLabel: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    choiceCardLabelSelected: { color: colors.primary },

    // Owner input
    nameInput: {
      height: 56,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 18,
      fontWeight: '500',
      color: colors.textPrimary,
      backgroundColor: colors.background,
      textAlign: isRTL ? 'right' : 'left',
    },

    summaryPhotoBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    summaryPhotoBadgeText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },

    // Summary
    stepSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      alignSelf: 'flex-start',
      marginBottom: 32,
    },
    summaryPhoto: {
      width: '100%',
      height: 200,
      borderRadius: 16,
      backgroundColor: colors.separator,
      marginBottom: 24,
    },
    summaryCard: {
      borderRadius: 16,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.separator,
      overflow: 'hidden',
      direction: 'ltr',
    },
    summaryRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
      gap: 12,
    },
    summaryRowLast: { borderBottomWidth: 0 },
    summaryLabel: {
      fontSize: 13,
      color: colors.textTertiary,
      fontWeight: '500',
      width: 72,
      textAlign: isRTL ? 'right' : 'left',
    },
    summaryValue: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
      textAlign: 'left',
    },
    notesInput: {
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      textAlign: isRTL ? 'right' : 'left',
      minHeight: 80,
      textAlignVertical: 'top',
      marginTop: 12,
    },
    notesLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textTertiary,
      alignSelf: 'flex-start',
      marginTop: 20,
      marginBottom: 4,
    },
  });
}

// ---------------------------------------------------------------------------
// Document type options
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function AddDocumentScreen() {
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId?: string }>();
  const isEditing = !!documentId;
  const colors = useAppTheme();
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);

  const currentUser = useAuthStore((s) => s.currentUser);
  const familyId = useSettingsStore((s) => s.familyId);
  const addDocumentToStore = useDocumentsStore((s) => s.addDocument);
  const removeDocumentFromStore = useDocumentsStore((s) => s.removeDocument);
  const updateDocumentInStore = useDocumentsStore((s) => s.updateDocument);
  const existingDocument = useDocumentsStore((s) =>
    documentId ? s.documents.find((d) => d.id === documentId) : undefined
  );

  const MAX_PHOTOS = 3;

  // Form state
  const [docType, setDocType] = useState<DocumentType>('id_card');
  const [ownerName, setOwnerName] = useState('');
  const [expirationDate, setExpirationDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  });
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Step state
  const [currentStepId, setCurrentStepId] = useState<StepId>('type');
  const currentStepIndex = STEPS.indexOf(currentStepId);
  const { fadeAnim, slideAnim, animateTransition } = useStepAnimation();

  // Pre-fill for edit mode
  useEffect(() => {
    if (!isEditing || !existingDocument) return;
    setDocType(existingDocument.type);
    setOwnerName(existingDocument.ownerName);
    const d = existingDocument.expirationDate instanceof Date
      ? existingDocument.expirationDate
      : new Date(existingDocument.expirationDate as unknown as string);
    setExpirationDate(d);
    if (existingDocument.notes) setNotes(existingDocument.notes);
    const existingImages = existingDocument.images ?? (existingDocument.imageUrl ? [{ url: existingDocument.imageUrl, thumbnailUrl: existingDocument.thumbnailUrl ?? existingDocument.imageUrl }] : []);
    if (existingImages.length > 0) {
      setPhotoItems(existingImages.map((img) => ({ type: 'existing' as const, image: img })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      animateTransition('forward', () => setCurrentStepId(STEPS[nextIndex]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex]);

  function goBack() {
    if (currentStepIndex > 0) {
      animateTransition('back', () => setCurrentStepId(STEPS[currentStepIndex - 1]));
    } else {
      router.back();
    }
  }

  // ---------------------------------------------------------------------------
  // Can continue
  // ---------------------------------------------------------------------------

  const canContinue = useMemo(() => {
    switch (currentStepId) {
      case 'type': return true;
      case 'owner': return ownerName.trim().length > 0;
      case 'expiration': return true;
      case 'photo': return photoItems.length > 0;
      default: return false;
    }
  }, [currentStepId, ownerName, photoItems]);

  // ---------------------------------------------------------------------------
  // Photo actions
  // ---------------------------------------------------------------------------

  async function handleCamera() {
    if (photoItems.length >= MAX_PHOTOS) return;
    try {
      const picked = await openCamera();
      if (picked) setCropUri(picked.localUri);
    } catch {
      /* Camera not available — silently skip */
    }
  }

  async function handleGallery() {
    if (photoItems.length >= MAX_PHOTOS) return;
    const picked = await openGallery();
    if (picked) setCropUri(picked.localUri);
  }

  function handleRemovePhoto(index: number) {
    setPhotoItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddPhoto() {
    if (photoItems.length >= MAX_PHOTOS) return;
    Alert.alert(
      t('common.choosePhotoSource'),
      undefined,
      [
        { text: t('addDocument.takePhoto'), onPress: handleCamera },
        { text: t('addDocument.chooseGallery'), onPress: handleGallery },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function handleSave() {
    if (!currentUser) return;
    if (useUIStore.getState().offlineMode) {
      Alert.alert(t('offline.title'), t('addDocument.offline'));
      return;
    }
    if (photoItems.length === 0 && !isEditing) {
      Alert.alert(t('common.error'), t('addDocument.error.photoRequired'));
      return;
    }

    setSaving(true);

    const data = {
      userId: currentUser.uid,
      ...(familyId ? { familyId } : {}),
      type: docType,
      ownerName: ownerName.trim(),
      expirationDate,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    if (isEditing && documentId) {
      try {
        updateDocumentInStore(documentId, data);
        await updateDocument(documentId, data);

        const hasLocalPhotos = photoItems.some((item) => item.type === 'local');
        const existingImgCount = existingDocument?.images?.length ?? (existingDocument?.imageUrl ? 1 : 0);
        if (hasLocalPhotos || photoItems.length !== existingImgCount) {
          const uploadedImages = await Promise.all(
            photoItems.map((item, i) =>
              item.type === 'existing'
                ? Promise.resolve(item.image)
                : uploadEntityImage(item.uri, 'documents', documentId, i)
            )
          );
          updateDocumentInStore(documentId, { images: uploadedImages });
          await updateDocument(documentId, { images: uploadedImages });
        }

        router.back();
      } catch {
        setSaving(false);
        Alert.alert(t('common.error'), t('addDocument.error.save'));
      }
      return;
    }

    // Create new — use a temp ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    addDocumentToStore({
      id: tempId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      const docId = await createDocument(data);

      if (photoItems.length > 0) {
        const uploadedImages = await Promise.all(
          photoItems.map((item, i) =>
            item.type === 'existing'
              ? Promise.resolve(item.image)
              : uploadEntityImage(item.uri, 'documents', docId, i)
          )
        );
        await updateDocument(docId, { images: uploadedImages });
      }

      removeDocumentFromStore(tempId);
      router.back();
    } catch {
      removeDocumentFromStore(tempId);
      setSaving(false);
      Alert.alert(t('common.error'), t('addDocument.error.save'));
    }
  }

  // ---------------------------------------------------------------------------
  // Render steps
  // ---------------------------------------------------------------------------

  function renderTypeStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addDocument.step.type')}</Text>
        <View style={styles.choiceCards}>
          {DOCUMENT_TYPE_OPTIONS.map(({ type, icon }) => {
            const selected = docType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.choiceCard, selected && styles.choiceCardSelected]}
                onPress={() => setDocType(type)}
                activeOpacity={0.7}
              >
                <View style={[styles.choiceCardIcon, selected && styles.choiceCardIconSelected]}>
                  <Ionicons name={icon} size={26} color={selected ? colors.primary : colors.textSecondary} />
                </View>
                <Text style={[styles.choiceCardLabel, selected && styles.choiceCardLabelSelected]}>
                  {t(`documents.types.${type}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  function renderOwnerStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addDocument.step.owner')}</Text>
        <TextInput
          style={styles.nameInput}
          placeholder={t('addDocument.ownerPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          value={ownerName}
          onChangeText={setOwnerName}
          autoFocus
          returnKeyType="next"
          onSubmitEditing={ownerName.trim() ? goNext : undefined}
        />
      </ScrollView>
    );
  }

  function renderExpirationStep() {
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addDocument.step.expiration')}</Text>
        <DateTimePicker
          value={expirationDate}
          mode="date"
          display="spinner"
          onChange={(_: DateTimePickerEvent, date?: Date) => { if (date) setExpirationDate(date); }}
          textColor={colors.textPrimary}
          style={{ width: '100%' }}
          minimumDate={new Date()}
        />
      </ScrollView>
    );
  }

  function renderPhotoStep() {
    return (
      <PhotoPickerStep
        title={t('addDocument.step.photo')}
        photosHint={t('addDocument.photosHint')}
        photoItems={photoItems}
        onAddPhoto={handleAddPhoto}
        onRemovePhoto={handleRemovePhoto}
      />
    );
  }

  function renderSummaryStep() {
    const typeLabel = t(`documents.types.${docType}`);
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addDocument.step.summary')}</Text>
        <Text style={styles.stepSubtitle}>{t('addDocument.step.summarySub')}</Text>

        {photoItems.length > 0 && (() => {
          const first = photoItems[0];
          const uri = first.type === 'local' ? first.uri : first.image.url;
          return (
            <View style={{ marginBottom: 24 }}>
              <Image source={{ uri }} style={styles.summaryPhoto} contentFit="cover" placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
              {photoItems.length > 1 && (
                <View style={styles.summaryPhotoBadge}>
                  <Ionicons name="images-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.summaryPhotoBadgeText}>{photoItems.length}</Text>
                </View>
              )}
            </View>
          );
        })()}

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addDocument.summary.type')}</Text>
            <Text style={styles.summaryValue}>{typeLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addDocument.summary.owner')}</Text>
            <Text style={styles.summaryValue}>{ownerName}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>{t('addDocument.summary.expiration')}</Text>
            <Text style={styles.summaryValue}>{formatDate(expirationDate, dateFormat)}</Text>
          </View>
        </View>

        <Text style={styles.notesLabel}>{t('addDocument.summary.notes')}</Text>
        <TextInput
          style={styles.notesInput}
          placeholder={t('addDocument.notesPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          returnKeyType="done"
        />
      </ScrollView>
    );
  }

  function renderStep() {
    switch (currentStepId) {
      case 'type':       return renderTypeStep();
      case 'owner':      return renderOwnerStep();
      case 'expiration': return renderExpirationStep();
      case 'photo':      return renderPhotoStep();
      case 'summary':    return renderSummaryStep();
    }
  }

  const isSummary = currentStepId === 'summary';

  const footerButton = isSummary ? (
    <TouchableOpacity
      style={styles.continueBtn}
      onPress={handleSave}
      disabled={saving}
    >
      {saving
        ? <ActivityIndicator color="#FFFFFF" />
        : <Text style={styles.continueBtnText}>{isEditing ? t('common.save') : t('addDocument.saveButton')}</Text>
      }
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
      onPress={goNext}
      disabled={!canContinue}
    >
      <Text style={styles.continueBtnText}>{t('common.continue')}</Text>
    </TouchableOpacity>
  );

  return (
    <StepFormScreen
      title={isEditing ? t('addDocument.titleEdit') : t('addDocument.title')}
      onBack={goBack}
      isFirstStep={currentStepIndex === 0}
      totalSteps={STEPS.length}
      currentStepIndex={currentStepIndex}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      footerButton={footerButton}
      extras={cropUri ? (
        <CropModal
          uri={cropUri}
          onCrop={(uri) => {
            setPhotoItems((prev) => prev.length < MAX_PHOTOS ? [...prev, { type: 'local', uri }] : prev);
            setCropUri(null);
          }}
          onCancel={() => setCropUri(null)}
        />
      ) : undefined}
    >
      {renderStep()}
    </StepFormScreen>
  );
}
