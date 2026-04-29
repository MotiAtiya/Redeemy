import { View, TextInput, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}

export function SearchBar({ value, onChangeText, placeholder }: Props) {
  const colors = useAppTheme();
  const hasValue = value.length > 0;

  const searchIcon = (
    <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.icon} />
  );

  const clearButton = (
    <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="close-circle" size={18} color={colors.textTertiary} style={styles.icon} />
    </TouchableOpacity>
  );

  const input = (
    <TextInput
      style={[styles.input, { color: colors.textPrimary, textAlign: I18nManager.isRTL ? 'right' : 'left' }]}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      value={value}
      onChangeText={onChangeText}
      returnKeyType="search"
    />
  );

  // Same JSX order for all cases — I18nManager handles the visual flip:
  // LTR: [🔍][text][✕]  |  RTL empty: [placeholder][🔍]  |  RTL typing: [✕][text][🔍]
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {searchIcon}
      {input}
      {hasValue && clearButton}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    letterSpacing: 0,
  },
  icon: {
    marginHorizontal: 4,
  },
});
