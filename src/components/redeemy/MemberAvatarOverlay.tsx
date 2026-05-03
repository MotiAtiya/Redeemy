import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { Avatar } from './Avatar';

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

const BADGE_SIZE = 22;

/**
 * Wraps a card's leading visual (thumbnail, icon, etc.) and overlays a small
 * member-avatar badge in the bottom-end corner — but only for items shared
 * via family that were created by someone other than the current user.
 *
 * The badge shows the member's profile photo when available (looked up by
 * `createdBy` uid in the current family), falling back to colored initials.
 */
export function MemberAvatarOverlay({ item, children, style }: Props) {
  const colors = useAppTheme();
  const currentUid = useAuthStore((s) => s.currentUser?.uid);
  const family = useFamilyStore((s) => s.family);

  const showBadge =
    !!item.familyId &&
    !!item.createdBy &&
    !!item.createdByName &&
    item.createdBy !== currentUid;

  const memberPhotoURL = showBadge
    ? family?.memberList.find((m) => m.userId === item.createdBy)?.photoURL ?? null
    : null;

  return (
    <View style={style}>
      {children}
      {showBadge && (
        <Avatar
          photoURL={memberPhotoURL}
          name={item.createdByName}
          uid={item.createdBy}
          size={BADGE_SIZE}
          fontSize={9}
          style={[styles.badge, { borderColor: colors.surface }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: -4,
    end: -4,
    borderWidth: 1.5,
  },
});
