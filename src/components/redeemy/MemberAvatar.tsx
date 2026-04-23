import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  familyId?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
}

/**
 * Small avatar bubble showing initials of a family member who owns the item.
 * Renders nothing when the current user is the creator, or when item isn't shared.
 */
export function MemberAvatar({ familyId, createdBy, createdByName }: Props) {
  const colors = useAppTheme();
  const currentUid = useAuthStore((s) => s.currentUser?.uid);

  if (!familyId || !createdBy || !createdByName || createdBy === currentUid) return null;

  const initials = createdByName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
      <Text style={styles.text}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    position: 'absolute',
    bottom: -4,
    end: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  text: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
});
