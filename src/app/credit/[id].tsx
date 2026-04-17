import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ExpirationBadge } from '@/components/redeemy/ExpirationBadge';
import { deleteCredit, updateCredit } from '@/lib/firestoreCredits';
import { cancelNotification } from '@/lib/notifications';
import { formatCurrency } from '@/lib/formatCurrency';
import { useCreditsStore } from '@/stores/creditsStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { CreditStatus } from '@/types/creditTypes';
import { CATEGORIES } from '@/constants/categories';
import type { AppColors } from '@/constants/colors';

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    backButton: { padding: 16 },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notFoundText: { fontSize: 16, color: colors.textTertiary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      backgroundColor: colors.background,
    },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.textPrimary },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
    image: { width: '100%', height: 220, borderRadius: 14, backgroundColor: colors.separator },
    imagePlaceholder: {
      width: '100%',
      height: 220,
      borderRadius: 14,
      backgroundColor: colors.separator,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 8 },
    storeName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
    amount: { fontSize: 36, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1 },
    detailsCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
    detailRowContent: { flex: 1, gap: 2 },
    detailLabel: { fontSize: 12, color: colors.textTertiary, fontWeight: '500' },
    detailValue: { fontSize: 15, color: colors.textPrimary },
    separator: { height: 1, backgroundColor: colors.separator, marginLeft: 44 },
    footer: {
      padding: 16,
      paddingBottom: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
    },
    redeemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: 12,
    },
    buttonDisabled: { opacity: 0.7 },
    redeemButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    actionSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      paddingBottom: 36,
      gap: 4,
    },
    actionSheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.separator,
      alignSelf: 'center',
      marginBottom: 12,
    },
    actionSheetButton: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 10 },
    actionSheetLabel: { fontSize: 16 },
    cancelButton: {
      alignItems: 'center',
      padding: 14,
      marginTop: 8,
      backgroundColor: colors.background,
      borderRadius: 10,
    },
    cancelText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    redeemedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    redeemedBannerText: { fontSize: 15, color: colors.textTertiary, fontWeight: '500' },
    // Full-screen image viewer
    fullscreenModal: { flex: 1, backgroundColor: '#000000' },
    fullscreenClose: {
      position: 'absolute',
      top: 56,
      right: 16,
      zIndex: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 20,
      padding: 8,
    },
    fullscreenScrollView: { flex: 1 },
    fullscreenScrollContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullscreenImage: {
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height,
    },
  });
}

export default function CreditDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const credit = useCreditsStore((s) => s.credits.find((c) => c.id === id));
  const removeCredit = useCreditsStore((s) => s.removeCredit);
  const updateCreditInStore = useCreditsStore((s) => s.updateCredit);

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const afterDismissRef = useRef<(() => void) | null>(null);
  const isRedeemed = credit?.status === CreditStatus.REDEEMED;

  const categoryMeta = useMemo(
    () => CATEGORIES.find((c) => c.id === credit?.category),
    [credit?.category]
  );

  if (!credit) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Credit not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  async function handleMarkRedeemed() {
    if (useUIStore.getState().offlineMode) {
      Alert.alert('No Internet Connection', 'Marking credits as redeemed requires an internet connection.');
      return;
    }
    const c = credit!;
    Alert.alert('Mark as Redeemed', 'This credit will move to your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Redeemed',
        onPress: async () => {
          setLoading(true);
          try {
            await cancelNotification(c.notificationId);
            updateCreditInStore(c.id, { status: CreditStatus.REDEEMED, redeemedAt: new Date() });
            await updateCredit(c.id, { status: CreditStatus.REDEEMED, redeemedAt: new Date() });
            router.back();
          } catch {
            updateCreditInStore(c.id, { status: CreditStatus.ACTIVE });
            Alert.alert('Error', 'Could not update credit. Try again.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  async function handleDelete() {
    if (useUIStore.getState().offlineMode) {
      setShowActionSheet(false);
      Alert.alert('No Internet Connection', 'Deleting credits requires an internet connection.');
      return;
    }
    const c = credit!;
    setShowActionSheet(false);
    Alert.alert('Delete Credit', `Delete the ${c.storeName} credit? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await cancelNotification(c.notificationId);
            removeCredit(c.id);
            await deleteCredit(c.id);
            router.back();
          } catch {
            setLoading(false);
            Alert.alert('Error', 'Could not delete credit. Try again.');
          }
        },
      },
    ]);
  }

  function handleEdit() {
    afterDismissRef.current = () => { router.push(`/add-credit?creditId=${credit!.id}`); };
    setShowActionSheet(false);
  }

  const expirationDate = credit.expirationDate instanceof Date
    ? credit.expirationDate
    : new Date(credit.expirationDate as unknown as string);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{credit.storeName}</Text>
        <TouchableOpacity onPress={() => setShowActionSheet(true)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {credit.imageUrl ? (
          <TouchableOpacity onPress={() => setShowFullscreenImage(true)} activeOpacity={0.9}>
            <Image
              source={{ uri: credit.imageUrl }}
              style={styles.image}
              contentFit="cover"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              transition={300}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.storeName}>{credit.storeName}</Text>
          <Text style={styles.amount}>{formatCurrency(credit.amount)}</Text>
          <ExpirationBadge expirationDate={expirationDate} />
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{categoryMeta?.label ?? credit.category}</Text>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>Expires</Text>
              <Text style={styles.detailValue}>{expirationDate.toLocaleDateString('en-GB')}</Text>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.detailRow}>
            <Ionicons name="notifications-outline" size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>Reminder</Text>
              <Text style={styles.detailValue}>{`${credit.reminderDays} day${credit.reminderDays !== 1 ? 's' : ''} before`}</Text>
            </View>
          </View>
          {credit.notes ? (
            <>
              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <Ionicons name="document-text-outline" size={18} color={colors.textTertiary} />
                <View style={styles.detailRowContent}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.detailValue}>{credit.notes}</Text>
                </View>
              </View>
            </>
          ) : null}
          <View style={styles.separator} />
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>Added</Text>
              <Text style={styles.detailValue}>{new Date(credit.createdAt as Date).toLocaleDateString('en-GB')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isRedeemed ? (
          <View style={styles.redeemedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.textTertiary} />
            <Text style={styles.redeemedBannerText}>
              Redeemed{credit.redeemedAt ? ` on ${new Date(credit.redeemedAt as Date).toLocaleDateString('en-GB')}` : ''}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.redeemButton, loading && styles.buttonDisabled]}
            onPress={handleMarkRedeemed}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Mark as Redeemed"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.redeemButtonText}>Mark as Redeemed</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Full-screen image viewer */}
      <Modal
        visible={showFullscreenImage}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setShowFullscreenImage(false)}
        statusBarTranslucent
      >
        <View style={styles.fullscreenModal}>
          <StatusBar hidden />
          <ScrollView
            style={styles.fullscreenScrollView}
            contentContainerStyle={styles.fullscreenScrollContent}
            maximumZoomScale={5}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
            bouncesZoom
          >
            <Image
              source={{ uri: credit.imageUrl! }}
              style={styles.fullscreenImage}
              contentFit="contain"
              transition={200}
            />
          </ScrollView>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setShowFullscreenImage(false)}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
        onDismiss={() => {
          const action = afterDismissRef.current;
          afterDismissRef.current = null;
          action?.();
        }}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowActionSheet(false)} />
        <View style={styles.actionSheet}>
          <View style={styles.actionSheetHandle} />
          <TouchableOpacity style={styles.actionSheetButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.actionSheetLabel, { color: colors.textPrimary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionSheetButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
            <Text style={[styles.actionSheetLabel, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowActionSheet(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
