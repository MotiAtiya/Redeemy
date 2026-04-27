import { View, Text, StyleSheet } from 'react-native';

interface HeroBadgeProps {
  text: string;
  color: string;
  bgColor: string;
}

export function HeroBadge({ text, color, bgColor }: HeroBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  text: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
