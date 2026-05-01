import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuthStore } from '@/stores/authStore';
import { getInitials } from '@/lib/initials';
import { getAvatarColor } from '@/lib/avatarColor';

interface Item {
  familyId?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
}

interface Props {
  item: Item;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps a card's leading visual (thumbnail, icon, etc.) and overlays a small
 * member-initials badge in the bottom-end corner — but only for items shared
 * via family that were created by someone other than the current user.
 *
 * Use this anywhere a list/card needs to show "who added this" attribution.
 */
export function MemberAvatarOverlay({ item, children, style }: Props) {
  const colors = useAppTheme();
  const currentUid = useAuthStore((s) => s.currentUser?.uid);

  const showBadge =
    !!item.familyId &&
    !!item.createdBy &&
    !!item.createdByName &&
    item.createdBy !== currentUid;

  const initials = showBadge ? getInitials(item.createdByName) : '';
  const bg = showBadge ? getAvatarColor(item.createdBy) : '';

  return (
    <View style={style}>
      {children}
      {showBadge && (
        <View style={[styles.badge, { backgroundColor: bg, borderColor: colors.surface }]}>
          <Text style={styles.text}>{initials}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
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
