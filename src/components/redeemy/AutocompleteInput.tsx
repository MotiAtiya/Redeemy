import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { ComponentProps } from 'react';
import type { AppColors } from '@/constants/colors';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface AutocompleteItem {
  label: string;
  value: string;
  icon?: IoniconsName;
}

interface Props {
  value: string;
  suggestions: AutocompleteItem[];
  onChangeText: (text: string) => void;
  onSelect: (item: AutocompleteItem) => void;
  placeholder?: string;
  autoFocus?: boolean;
  hasError?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
}

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    inputRow: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
    },
    inputRowError: { borderColor: colors.danger },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
      textAlign: isRTL ? 'right' : 'left',
    },
    clearBtn: { padding: 4, marginStart: 4 },
    dropdown: {
      marginTop: 4,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.separator,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
      overflow: 'hidden',
      direction: 'ltr',
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
      gap: 10,
    },
    itemLast: { borderBottomWidth: 0 },
    itemText: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      textAlign: isRTL ? 'right' : 'left',
    },
    itemTextMatch: { color: colors.primary, fontWeight: '600' },
  });
}

function getHighlightParts(text: string, query: string) {
  if (!query.trim()) return null;
  const lower = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(lower);
  if (idx === -1) return null;
  return {
    before: text.slice(0, idx),
    match: text.slice(idx, idx + query.length),
    after: text.slice(idx + query.length),
  };
}

export function AutocompleteInput({
  value,
  suggestions,
  onChangeText,
  onSelect,
  placeholder,
  autoFocus,
  hasError,
  autoCapitalize = 'none',
}: Props) {
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const showDropdown = dropdownOpen && suggestions.length > 0;

  function handleSelect(item: AutocompleteItem) {
    onSelect(item);
    setDropdownOpen(false);
    inputRef.current?.blur();
  }

  return (
    <View>
      <View style={[styles.inputRow, hasError && styles.inputRowError]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={(text) => { onChangeText(text); setDropdownOpen(true); }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="next"
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { onChangeText(''); setDropdownOpen(false); }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          {suggestions.map((item, index) => {
            const parts = getHighlightParts(item.label, value);
            const isLast = index === suggestions.length - 1;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.item, isLast && styles.itemLast]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                {item.icon && (
                  <Ionicons name={item.icon} size={16} color={colors.textTertiary} />
                )}
                {parts ? (
                  <Text style={styles.itemText}>
                    <Text>{parts.before}</Text>
                    <Text style={styles.itemTextMatch}>{parts.match}</Text>
                    <Text>{parts.after}</Text>
                  </Text>
                ) : (
                  <Text style={styles.itemText}>{item.label}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
