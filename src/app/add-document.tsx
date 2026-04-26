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
import { uploadDocumentImage, openCamera, openGallery } from '@/lib/imageUpload';
import { useAuthStore } from '@/stores/authStore';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatDate } from '@/lib/formatDate';
import { type DocumentType } from '@/types/documentTypes';
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

    // Photo step — same as add-credit
    photoStepCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 24,
    },
    photoPlaceholderIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoPlaceholderLabel: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    photoButtons: { gap: 12, width: '100%', paddingHorizontal: 24 },
    photoBtn: {
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
    },
    photoBtnSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    photoBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    photoBtnTextSecondary: { color: colors.primary },
    photoPreview: {
      width: '100%',
      height: 240,
      borderRadius: 16,
      backgroundColor: colors.separator,
    },
    retakeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    retakeBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },

    // Summary
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
    summaryPhotoThumb: {
      width: 48,
      height: 36,
      borderRadius: 6,
      overflow: 'hidden',
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

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_OPTIONS: { type: DocumentType; icon: IoniconsName }[] = [
  { type: 'id_card',   icon: 'person-circle-outline' },
  { type: 'license',   icon: 'car-outline' },
  { type: 'passport',  icon: 'airplane-outline' },
  { type: 'insurance', icon: 'shield-checkmark-outline' },
  { type: 'other',     icon: 'document-outline' },
];

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

  // Form state
  const [docType, setDocType] = useState<DocumentType>('id_card');
  const [ownerName, setOwnerName] = useState('');
  const [expirationDate, setExpirationDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
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
    if (existingDocument.imageUrl) setPhotoUri(existingDocument.imageUrl);
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
      case 'photo': return !!photoUri;
      default: return false;
    }
  }, [currentStepId, ownerName, photoUri]);

  // ---------------------------------------------------------------------------
  // Photo actions
  // ---------------------------------------------------------------------------

  async function handleCamera() {
    try {
      const picked = await openCamera();
      if (picked) setCropUri(picked.localUri);
    } catch {
      /* Camera not available — silently skip */
    }
  }

  async function handleGallery() {
    const picked = await openGallery();
    if (picked) setCropUri(picked.localUri);
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
    if (!photoUri && !isEditing) {
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

        // Upload new photo if changed (not a remote URL)
        if (photoUri && !photoUri.startsWith('http')) {
          const { imageUrl, thumbnailUrl } = await uploadDocumentImage(photoUri, documentId);
          updateDocumentInStore(documentId, { imageUrl, thumbnailUrl });
          await updateDocument(documentId, { imageUrl, thumbnailUrl });
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

      if (photoUri) {
        const { imageUrl, thumbnailUrl } = await uploadDocumentImage(photoUri, docId);
        await updateDocument(docId, { imageUrl, thumbnailUrl });
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
          {TYPE_OPTIONS.map(({ type, icon }) => {
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
                {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} style={{ marginStart: 'auto' }} />}
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
      <View style={[styles.stepContent, styles.photoStepCenter]}>
        {photoUri ? (
          <>
            <Image
              source={{ uri: photoUri }}
              style={styles.photoPreview}
              contentFit="cover"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            />
            <TouchableOpacity style={styles.retakeBtn} onPress={handleCamera}>
              <Ionicons name="camera-outline" size={16} color={colors.primary} />
              <Text style={styles.retakeBtnText}>{t('addDocument.retakePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retakeBtn} onPress={handleGallery}>
              <Ionicons name="images-outline" size={16} color={colors.primary} />
              <Text style={styles.retakeBtnText}>{t('addDocument.chooseGallery')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.photoPlaceholderIcon}>
              <Ionicons name="camera-outline" size={44} color={colors.primary} />
            </View>
            <Text style={styles.photoPlaceholderLabel}>{t('addDocument.photoHint')}</Text>
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleCamera}>
                <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                <Text style={styles.photoBtnText}>{t('addDocument.takePhoto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoBtn, styles.photoBtnSecondary]} onPress={handleGallery}>
                <Ionicons name="images-outline" size={20} color={colors.primary} />
                <Text style={[styles.photoBtnText, styles.photoBtnTextSecondary]}>
                  {t('addDocument.chooseGallery')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }

  function renderSummaryStep() {
    const typeLabel = t(`documents.types.${docType}`);
    return (
      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{t('addDocument.step.summary')}</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addDocument.summary.type')}</Text>
            <Text style={styles.summaryValue}>{typeLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addDocument.summary.owner')}</Text>
            <Text style={styles.summaryValue}>{ownerName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('addDocument.summary.expiration')}</Text>
            <Text style={styles.summaryValue}>{formatDate(expirationDate, dateFormat)}</Text>
          </View>
          {!!photoUri && (
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <Text style={styles.summaryLabel}>{t('addDocument.summary.photo')}</Text>
              <View style={styles.summaryPhotoThumb}>
                <Image source={{ uri: photoUri }} style={{ flex: 1 }} contentFit="cover" />
              </View>
            </View>
          )}
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
      style={[styles.continueBtn, saving && styles.continueBtnDisabled]}
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
          onCrop={(uri) => { setPhotoUri(uri); setCropUri(null); }}
          onCancel={() => setCropUri(null)}
        />
      ) : undefined}
    >
      {renderStep()}
    </StepFormScreen>
  );
}
