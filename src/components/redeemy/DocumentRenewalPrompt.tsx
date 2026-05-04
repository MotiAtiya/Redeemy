import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { confirmDocumentRenewal, deleteDocument } from '@/lib/firestoreDocuments';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatDate } from '@/lib/formatDate';
import { useSettingsStore } from '@/stores/settingsStore';
import type { Document } from '@/types/documentTypes';

interface Props {
  document: Document;
  /** Caller usually navigates back after a successful action. */
  onResolved?: () => void;
}

/**
 * Returns the document's expirationDate as a Date (it may arrive as a Firestore
 * Timestamp during initial load).
 */
function getExpirationDate(doc: Document): Date {
  return doc.expirationDate instanceof Date
    ? doc.expirationDate
    : new Date(doc.expirationDate as unknown as string);
}

/** True when this document's expirationDate is in the past. */
export function documentNeedsRenewal(doc: Document): boolean {
  return getExpirationDate(doc).getTime() < Date.now();
}

/**
 * Banner rendered on the document detail screen when the document has expired.
 * Asks the user whether they renewed (→ pick a new expiration date) or whether
 * the document is no longer relevant (→ delete entirely). (Story 19.6)
 */
export function DocumentRenewalPrompt({ document, onResolved }: Props) {
  const { t } = useTranslation();
  const colors = useAppTheme();
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const updateDocInStore = useDocumentsStore((s) => s.updateDocument);
  const removeDocFromStore = useDocumentsStore((s) => s.removeDocument);

  const [busy, setBusy] = useState<'renew' | 'discard' | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  // Default the picker to one year from today as a sensible starting point —
  // most documents (license, passport) renew for at least a year.
  const [pickedDate, setPickedDate] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  });

  function handleRenewPress() {
    setShowPicker(true);
  }

  function handlePickerChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (date) {
        void writeRenewal(date);
      }
    } else if (date) {
      setPickedDate(date);
    }
  }

  async function writeRenewal(newDate: Date) {
    setBusy('renew');
    try {
      updateDocInStore(document.id, { expirationDate: newDate });
      await confirmDocumentRenewal(document.id, newDate);
      onResolved?.();
    } catch (err) {
      updateDocInStore(document.id, document);
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert(t('document.renewalPrompt.errorTitle'), message);
    } finally {
      setBusy(null);
    }
  }

  function handleDiscardPress() {
    Alert.alert(
      t('document.renewalPrompt.confirmDiscardTitle'),
      t('document.renewalPrompt.confirmDiscardMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('document.renewalPrompt.discardConfirm'),
          style: 'destructive',
          onPress: async () => {
            setBusy('discard');
            try {
              removeDocFromStore(document.id);
              await deleteDocument(document.id);
              onResolved?.();
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              Alert.alert(t('document.renewalPrompt.errorTitle'), message);
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.urgencyAmberSurface }]}>
        <View style={styles.headerRow}>
          <Ionicons name="alert-circle" size={20} color={colors.urgencyAmber} />
          <Text style={[styles.title, { color: colors.urgencyAmber }]}>
            {t('document.renewalPrompt.title')}
          </Text>
        </View>
        <Text style={[styles.body, { color: colors.textPrimary }]}>
          {t('document.renewalPrompt.body')}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.primary }]}
            onPress={handleRenewPress}
            disabled={busy !== null}
            accessibilityRole="button"
          >
            {busy === 'renew' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonPrimaryText}>{t('document.renewalPrompt.renew')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, { borderColor: colors.urgencyAmber }]}
            onPress={handleDiscardPress}
            disabled={busy !== null}
            accessibilityRole="button"
          >
            {busy === 'discard' ? (
              <ActivityIndicator color={colors.urgencyAmber} size="small" />
            ) : (
              <Text style={[styles.buttonSecondaryText, { color: colors.urgencyAmber }]}>
                {t('document.renewalPrompt.discard')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* iOS: inline spinner + confirm/cancel modal. Android: handled inline above. */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('document.renewalPrompt.pickDateTitle')}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {formatDate(pickedDate, dateFormat)}
            </Text>
            <DateTimePicker
              value={pickedDate}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              onChange={handlePickerChange}
              textColor={colors.textPrimary}
              locale="en-GB"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { borderColor: colors.separator }]}
                onPress={() => setShowPicker(false)}
              >
                <Text style={[styles.buttonSecondaryText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowPicker(false);
                  void writeRenewal(pickedDate);
                }}
              >
                <Text style={styles.buttonPrimaryText}>
                  {t('document.renewalPrompt.confirmDate')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={pickedDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handlePickerChange}
          locale="en-GB"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: '700', alignSelf: 'flex-start' },
  body: { fontSize: 14, lineHeight: 20, alignSelf: 'flex-start' },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonPrimary: {},
  buttonPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  buttonSecondaryText: { fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', alignSelf: 'flex-start' },
  modalSubtitle: { fontSize: 14, alignSelf: 'flex-start' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
