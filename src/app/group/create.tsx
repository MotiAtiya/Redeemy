import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createGroup } from '@/lib/firestoreGroups';
import { useAuthStore } from '@/stores/authStore';
import { useGroupStore } from '@/stores/groupStore';
import { GroupRole } from '@/types/groupTypes';
import { SAGE_TEAL } from '@/components/ui/theme';

export default function CreateGroupScreen() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const addGroup = useGroupStore((s) => s.addGroup);

  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const trimmed = groupName.trim();
    if (!trimmed) {
      Alert.alert('Group Name Required', 'Please enter a name for your family group.');
      return;
    }
    if (!currentUser) return;

    setLoading(true);
    try {
      const groupId = await createGroup(
        currentUser.uid,
        trimmed,
        currentUser.displayName ?? undefined
      );

      // Optimistic update — add to groupStore immediately
      addGroup({
        id: groupId,
        groupName: trimmed,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        members: [
          {
            userId: currentUser.uid,
            role: GroupRole.ADMIN,
            joinedAt: new Date(),
            displayName: currentUser.displayName ?? undefined,
          },
        ],
      });

      // Navigate to the new group screen
      router.replace(`/group/${groupId}`);
    } catch {
      Alert.alert('Error', 'Could not create the group. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#212121" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Family Group</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={48} color={SAGE_TEAL} />
          </View>

          <Text style={styles.description}>
            Create a shared space where your family can track and redeem store credits together.
          </Text>

          {/* Group name input */}
          <Text style={styles.label}>GROUP NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. The Smith Family"
            placeholderTextColor="#9E9E9E"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          {/* Create button */}
          <TouchableOpacity
            style={[styles.createButton, (!groupName.trim() || loading) && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={!groupName.trim() || loading}
            accessibilityRole="button"
            accessibilityLabel="Create Group"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Group</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#212121' },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 16,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EFF5F4',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#616161',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9E9E9E',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: SAGE_TEAL,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
