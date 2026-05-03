import { View, Text, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';
import { getInitials } from '@/lib/initials';
import { getAvatarColor } from '@/lib/avatarColor';

interface AvatarProps {
  /** Profile photo URL (Google Sign-In, Apple, etc). When set, an Image is rendered. */
  photoURL?: string | null;
  /**
   * Used for initials when no photoURL is available. Pass any string —
   * displayName preferred; email also works (getInitials returns the first
   * letter for email-like input).
   */
  name?: string | null;
  /** Stable identifier used to derive a deterministic background color. */
  uid?: string | null;
  /** Pixel size of the (square) avatar. */
  size: number;
  /** Initials font size; defaults to ~40% of size. */
  fontSize?: number;
  /** Initials font weight; defaults to '700'. */
  fontWeight?: TextStyle['fontWeight'];
  /** Extra style applied to whichever element is rendered (e.g. border, position). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Single source of truth for user avatars across the app.
 *
 * - When `photoURL` is provided, renders an `expo-image` (cached, smooth).
 * - Otherwise, renders a colored circle with the user's initials. The
 *   background color is deterministic per `uid`.
 *
 * Use this for the current user (with `currentUser.photoURL` etc.), for
 * family members (via `member.photoURL` / `member.userId`), and for the
 * small overlay badge on shared cards.
 */
export function Avatar({
  photoURL,
  name,
  uid,
  size,
  fontSize,
  fontWeight = '700',
  style,
}: AvatarProps) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (photoURL) {
    // Avatar `style` is typed as ViewStyle (the View branch is the common case).
    // expo-image's ImageStyle is structurally narrower (no 'scroll' overflow), but
    // the styles we actually pass (margins, position, border) are valid for both.
    return (
      <Image
        source={{ uri: photoURL }}
        style={[dimensions, style as StyleProp<ImageStyle>]}
        contentFit="cover"
        transition={150}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[
        dimensions,
        styles.center,
        { backgroundColor: getAvatarColor(uid ?? undefined) },
        style,
      ]}
    >
      <Text
        style={[
          styles.initial,
          { fontSize: fontSize ?? Math.round(size * 0.4), fontWeight },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  initial: { color: '#FFFFFF' },
});
