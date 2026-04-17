import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ExpirationBadge } from '@/components/redeemy/ExpirationBadge';
import { deleteCredit, updateCredit } from '@/lib/firestoreCredits';
import { transferCredit } from '@/lib/firestoreGroups';
import { cancelNotification } from '@/lib/notifications';
import { formatCurrency } from '@/lib/formatCurrency';
import { useCreditsStore } from '@/stores/creditsStore';
import { useGroupStore } from '@/stores/groupStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { CreditStatus } from '@/types/creditTypes';
import type { GroupMember } from '@/types/groupTypes';
import { CATEGORIES } from '@/constants/categories';
import { SAGE_TEAL } from '@/components/ui/theme';

export default function CreditDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const credit = useCreditsStore((s) => s.credits.find((c) => c.id === id));
  const removeCredit = useCreditsStore((s) => s.removeCredit);
  const updateCreditInStore = useCreditsStore((s) => s.updateCredit);
  const currentUser = useAuthStore((s) => s.currentUser);
  const groups = useGroupStore((s) => s.groups);

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [loading, setLoading] = useState(false);

  // All members across all groups (excluding self) for transfer
  const allGroupMembers = useMemo<GroupMember[]>(() => {
    const seen = new Set<string>();
    const members: GroupMember[] = [];
    for (const group of groups) {
      for (const m of group.members ?? []) {
        if (m.userId !== currentUser?.uid && !seen.has(m.userId)) {
          seen.add(m.userId);
          members.push(m);
        }
      }
    }
    return members;
  }, [groups, currentUser]);

  const isRedeemed = credit?.status === CreditStatus.REDEEMED;

  const categoryMeta = useMemo(
    () => CATEGORIES.find((c) => c.id === credit?.category),
    [credit?.category]
  );

  if (!credit) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Credit not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- actions -------------------------------------------------------------

  async function handleMarkRedeemed() {
    if (useUIStore.getState().offlineMode) {
      Alert.alert('No Internet Connection', 'Marking credits as redeemed requires an internet connection.');
      return;
    }
    const c = credit!;
    Alert.alert(
      'Mark as Redeemed',
      'This credit will move to your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Redeemed',
          onPress: async () => {
            setLoading(true);
            try {
              // Cancel scheduled notification immediately
              await cancelNotification(c.notificationId);
              updateCreditInStore(c.id, {
                status: CreditStatus.REDEEMED,
                redeemedAt: new Date(),
              });
              await updateCredit(c.id, {
                status: CreditStatus.REDEEMED,
                redeemedAt: new Date(),
              });
              router.back();
            } catch {
              updateCreditInStore(c.id, { status: CreditStatus.ACTIVE });
              Alert.alert('Error', 'Could not update credit. Try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleDelete() {
    if (useUIStore.getState().offlineMode) {
      setShowActionSheet(false);
      Alert.alert('No Internet Connection', 'Deleting credits requires an internet connection.');
      return;
    }
    const c = credit!;
    setShowActionSheet(false);
    Alert.alert(
      'Delete Credit',
      `Delete the ${c.storeName} credit? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await cancelNotification(c.notificationId);
              removeCredit(c.id); // Optimistic
              await deleteCredit(c.id);
              router.back();
            } catch {
              setLoading(false);
              Alert.alert('Error', 'Could not delete credit. Try again.');
            }
          },
        },
      ]
    );
  }

  async function handleShare() {
    setShowActionSheet(false);
    if (allGroupMembers.length > 0) {
      // Show transfer sheet with family + native share options
      setShowTransferSheet(true);
    } else {
      const c = credit!;
      await Share.share({
        message: `I have a ${formatCurrency(c.amount)} gift credit at ${c.storeName} — using Redeemy to track it!`,
      });
    }
  }

  async function handleTransfer(toMember: GroupMember) {
    const c = credit!;
    setShowTransferSheet(false);
    Alert.alert(
      'Transfer Credit',
      `Transfer the ${formatCurrency(c.amount)} ${c.storeName} credit to ${toMember.displayName ?? 'this member'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: async () => {
            setLoading(true);
            try {
              await cancelNotification(c.notificationId);
              await transferCredit(c.id, toMember.userId);
              removeCredit(c.id); // Remove from sender's view
              router.back();
            } catch {
              Alert.alert('Error', 'Could not transfer credit. Try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleNativeShare() {
    const c = credit!;
    setShowTransferSheet(false);
    await Share.share({
      message: `I have a ${formatCurrency(c.amount)} gift credit at ${c.storeName} — using Redeemy to track it!`,
    });
  }

  function handleEdit() {
    setShowActionSheet(false);
    // Edit screen is the add-credit screen pre-filled — implemented in a later story
    Alert.alert('Coming soon', 'Edit will be available shortly.');
  }

  // ---- render --------------------------------------------------------------

  const expirationDate = credit.expirationDate instanceof Date
    ? credit.expirationDate
    : new Date(credit.expirationDate as unknown as string);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {credit.storeName}
        </Text>
        <TouchableOpacity
          onPress={() => setShowActionSheet(true)}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#212121" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Credit image */}
        {credit.imageUrl ? (
          <Image
            source={{ uri: credit.imageUrl }}
            style={styles.image}
            contentFit="cover"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={300}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={40} color="#BDBDBD" />
          </View>
        )}

        {/* Core info card */}
        <View style={styles.card}>
          <Text style={styles.storeName}>{credit.storeName}</Text>
          <Text style={styles.amount}>{formatCurrency(credit.amount)}</Text>
          <ExpirationBadge expirationDate={expirationDate} />
        </View>

        {/* Details */}
        <View style={styles.detailsCard}>
          <DetailRow
            icon="pricetag-outline"
            label="Category"
            value={categoryMeta?.label ?? credit.category}
          />
          <Separator />
          <DetailRow
            icon="calendar-outline"
            label="Expires"
            value={expirationDate.toLocaleDateString('en-GB')}
          />
          <Separator />
          <DetailRow
            icon="notifications-outline"
            label="Reminder"
            value={`${credit.reminderDays} day${credit.reminderDays !== 1 ? 's' : ''} before`}
          />
          {credit.notes ? (
            <>
              <Separator />
              <DetailRow
                icon="document-text-outline"
                label="Notes"
                value={credit.notes}
              />
            </>
          ) : null}
          <Separator />
          <DetailRow
            icon="time-outline"
            label="Added"
            value={new Date(credit.createdAt as Date).toLocaleDateString('en-GB')}
          />
        </View>
      </ScrollView>

      {/* Primary action / redeemed banner */}
      <View style={styles.footer}>
        {isRedeemed ? (
          <View style={styles.redeemedBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#9E9E9E" />
            <Text style={styles.redeemedBannerText}>
              Redeemed
              {credit.redeemedAt
                ? ` on ${new Date(credit.redeemedAt as Date).toLocaleDateString('en-GB')}`
                : ''}
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

      {/* Transfer sheet modal */}
      <Modal
        visible={showTransferSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransferSheet(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowTransferSheet(false)}
        />
        <View style={styles.actionSheet}>
          <View style={styles.actionSheetHandle} />
          <Text style={styles.transferTitle}>Share Credit</Text>

          {allGroupMembers.length > 0 && (
            <>
              <Text style={styles.transferSectionLabel}>TRANSFER TO FAMILY MEMBER</Text>
              <FlatList
                data={allGroupMembers}
                keyExtractor={(m) => m.userId}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.transferMemberRow}
                    onPress={() => handleTransfer(item)}
                  >
                    <View style={styles.transferAvatar}>
                      <Text style={styles.transferInitial}>
                        {(item.displayName ?? item.userId)[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <Text style={styles.transferMemberName}>
                      {item.displayName ?? 'Member'}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#9E9E9E" />
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          <ActionSheetButton
            icon="share-outline"
            label="Send via…"
            onPress={handleNativeShare}
          />
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowTransferSheet(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Action sheet modal */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        />
        <View style={styles.actionSheet}>
          <View style={styles.actionSheetHandle} />

          <ActionSheetButton
            icon="create-outline"
            label="Edit"
            onPress={handleEdit}
          />
          <ActionSheetButton
            icon="share-outline"
            label="Share"
            onPress={handleShare}
          />
          <ActionSheetButton
            icon="trash-outline"
            label="Delete"
            color="#D32F2F"
            onPress={handleDelete}
          />

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowActionSheet(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color="#9E9E9E" />
      <View style={styles.detailRowContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function ActionSheetButton({
  icon,
  label,
  color = '#212121',
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionSheetButton} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.actionSheetLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  backButton: { padding: 16 },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, color: '#9E9E9E' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#212121',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
  },
  imagePlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  storeName: { fontSize: 22, fontWeight: '700', color: '#212121' },
  amount: { fontSize: 36, fontWeight: '800', color: '#212121', letterSpacing: -1 },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  detailRowContent: { flex: 1, gap: 2 },
  detailLabel: { fontSize: 12, color: '#9E9E9E', fontWeight: '500' },
  detailValue: { fontSize: 15, color: '#212121' },
  separator: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 44 },
  footer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: SAGE_TEAL,
    borderRadius: 12,
  },
  buttonDisabled: { opacity: 0.7 },
  redeemButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  // Action sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  actionSheet: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 10,
  },
  actionSheetLabel: { fontSize: 16 },
  cancelButton: {
    alignItems: 'center',
    padding: 14,
    marginTop: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  cancelText: { fontSize: 16, fontWeight: '600', color: '#424242' },
  redeemedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  redeemedBannerText: { fontSize: 15, color: '#9E9E9E', fontWeight: '500' },
  transferTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  transferSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9E9E9E',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  transferMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    marginBottom: 6,
  },
  transferAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SAGE_TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transferInitial: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  transferMemberName: { flex: 1, fontSize: 15, color: '#212121' },
});
