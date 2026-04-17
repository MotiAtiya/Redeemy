import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGroupWithMembers, createInviteToken, removeMember, deleteGroup } from '@/lib/firestoreGroups';
import { useAuthStore } from '@/stores/authStore';
import { useGroupStore } from '@/stores/groupStore';
import { GroupRole, type Group, type GroupMember } from '@/types/groupTypes';
import { SAGE_TEAL } from '@/components/ui/theme';

export default function GroupDetailScreen() {
  const router = useRouter();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.currentUser);
  const groups = useGroupStore((s) => s.groups);
  const removeGroup = useGroupStore((s) => s.removeGroup);

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  // Try to get from store first, then fetch
  const storeGroup = groups.find((g) => g.id === groupId);
  const isAdmin = storeGroup?.members?.find((m) => m.userId === currentUser?.uid)?.role === GroupRole.ADMIN;

  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      const loaded = await getGroupWithMembers(groupId);
      setGroup(loaded);
    } catch {
      Alert.alert('Error', 'Could not load group details.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (storeGroup) {
      setGroup(storeGroup);
      setLoading(false);
    } else {
      loadGroup();
    }
  }, [storeGroup, loadGroup]);

  async function handleInvite() {
    if (!currentUser || !groupId) return;
    setInviting(true);
    try {
      const { link } = await createInviteToken(groupId, currentUser.uid);
      await Share.share({
        message: `Join my family group on Redeemy! Tap to join: ${link}`,
        title: `Join ${group?.groupName ?? 'Family Group'} on Redeemy`,
      });
    } catch {
      // User cancelled share — no error needed
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(member: GroupMember) {
    if (!groupId) return;
    Alert.alert(
      'Remove Member',
      `Remove ${member.displayName ?? 'this member'} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(groupId, member.userId);
              // Refresh member list
              const updated = await getGroupWithMembers(groupId);
              setGroup(updated);
            } catch {
              Alert.alert('Error', 'Could not remove member.');
            }
          },
        },
      ]
    );
  }

  async function handleLeaveOrDelete() {
    if (!currentUser || !groupId) return;

    if (isAdmin) {
      Alert.alert(
        'Delete Group',
        'This will permanently delete the group and remove all members. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Group',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteGroup(groupId);
                removeGroup(groupId);
                router.back();
              } catch {
                Alert.alert('Error', 'Could not delete group.');
              }
            },
          },
        ]
      );
    } else {
      Alert.alert('Leave Group', 'Leave this family group?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(groupId, currentUser.uid);
              removeGroup(groupId);
              router.back();
            } catch {
              Alert.alert('Error', 'Could not leave group.');
            }
          },
        },
      ]);
    }
  }

  // ---- render ---------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={SAGE_TEAL} />
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayMembers = group.members ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group.groupName}</Text>
        <TouchableOpacity onPress={handleLeaveOrDelete} hitSlop={8}>
          <Ionicons
            name={isAdmin ? 'trash-outline' : 'exit-outline'}
            size={22}
            color={isAdmin ? '#D32F2F' : '#9E9E9E'}
          />
        </TouchableOpacity>
      </View>

      {/* Group icon + name */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="people" size={36} color={SAGE_TEAL} />
        </View>
        <Text style={styles.heroName}>{group.groupName}</Text>
        <Text style={styles.heroMeta}>
          {displayMembers.length} member{displayMembers.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Invite CTA */}
      <TouchableOpacity
        style={[styles.inviteButton, inviting && styles.buttonDisabled]}
        onPress={handleInvite}
        disabled={inviting}
      >
        {inviting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
            <Text style={styles.inviteButtonText}>Invite Members</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Members list */}
      <Text style={styles.sectionLabel}>MEMBERS</Text>
      <FlatList
        data={displayMembers}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            isCurrentUser={item.userId === currentUser?.uid}
            canRemove={isAdmin && item.userId !== currentUser?.uid}
            onRemove={() => handleRemoveMember(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MemberRow({
  member,
  isCurrentUser,
  canRemove,
  onRemove,
}: {
  member: GroupMember;
  isCurrentUser: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const initial = (member.displayName ?? member.userId)[0]?.toUpperCase() ?? '?';

  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>{initial}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {member.displayName ?? 'Member'}
          {isCurrentUser ? ' (You)' : ''}
        </Text>
        <Text style={styles.memberRole}>
          {member.role === GroupRole.ADMIN ? 'Admin' : 'Member'}
        </Text>
      </View>
      {canRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Ionicons name="close-circle-outline" size={22} color="#9E9E9E" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#212121', marginHorizontal: 12 },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, color: '#9E9E9E' },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF5F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroName: { fontSize: 22, fontWeight: '700', color: '#212121' },
  heroMeta: { fontSize: 14, color: '#9E9E9E' },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: SAGE_TEAL,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  inviteButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9E9E9E',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    paddingBottom: 32,
  },
  separator: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 60 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SAGE_TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#212121' },
  memberRole: { fontSize: 12, color: '#9E9E9E', marginTop: 1 },
});
