import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGroupStore } from '@/stores/groupStore';
import type { Group } from '@/types/groupTypes';
import { SAGE_TEAL } from '@/components/ui/theme';

export default function GroupsScreen() {
  const router = useRouter();
  const groups = useGroupStore((s) => s.groups);
  const isLoading = useGroupStore((s) => s.isLoading);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.title}>Family Groups</Text>
        <TouchableOpacity onPress={() => router.push('/group/create')} hitSlop={8}>
          <Ionicons name="add" size={26} color={SAGE_TEAL} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={SAGE_TEAL} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GroupRow group={item} onPress={() => router.push(`/group/${item.id}`)} />
          )}
          ListEmptyComponent={<EmptyState onPress={() => router.push('/group/create')} />}
          contentContainerStyle={[
            styles.listContent,
            groups.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GroupRow({ group, onPress }: { group: Group; onPress: () => void }) {
  const memberCount = group.members?.length ?? 0;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <Ionicons name="people" size={22} color={SAGE_TEAL} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{group.groupName}</Text>
        <Text style={styles.rowMeta}>
          {memberCount} member{memberCount !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
    </TouchableOpacity>
  );
}

function EmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={56} color="#BDBDBD" />
      <Text style={styles.emptyTitle}>No Family Groups</Text>
      <Text style={styles.emptySubtitle}>
        Create a group to share credits with your family
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={onPress}>
        <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
        <Text style={styles.createButtonText}>Create a Group</Text>
      </TouchableOpacity>
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
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '600', color: '#212121' },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  listContentEmpty: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF5F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#212121' },
  rowMeta: { fontSize: 13, color: '#9E9E9E', marginTop: 2 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#424242', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#9E9E9E', textAlign: 'center', lineHeight: 20 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: SAGE_TEAL,
    borderRadius: 12,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
