import { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useCreditsStore } from '@/stores/creditsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ISRAELI_STORES } from '@/data/israeliStores';
import type { AppColors } from '@/constants/colors';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (storeName: string) => void;
  hasError?: boolean;
  autoFocus?: boolean;
}

const MAX_SUGGESTIONS = 100;

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    container: { position: 'relative', zIndex: 10 },
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
    inputRowFocused: {},
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
      textAlign: isRTL ? 'right' : 'left',
    },
    clearBtn: { padding: 4, marginStart: 4 },
    dropdown: {
      position: 'absolute',
      top: 56,
      left: 0,
      right: 0,
      maxHeight: 220,
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
      zIndex: 20,
      // Force LTR layout inside the dropdown so we control icon/text placement manually
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

export function StoreAutocomplete({
  value,
  onChange,
  onSelectSuggestion,
  hasError,
  autoFocus,
}: Props) {
  const colors = useAppTheme();
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const credits = useCreditsStore((s) => s.credits);

  const suggestions = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();

    // Combine user's previous stores + static Israeli list, deduplicated
    const userStores = [...new Set(credits.map((c) => c.storeName))];
    const combined = [...new Set([...userStores, ...ISRAELI_STORES])];

    return combined
      .filter(
        (name) =>
          name.toLowerCase().includes(lower) &&
          name.toLowerCase() !== lower
      )
      .sort((a, b) => {
        // Prioritize names that START with the query
        const aStarts = a.toLowerCase().startsWith(lower);
        const bStarts = b.toLowerCase().startsWith(lower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b, 'he');
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [credits, value]);

  const showDropdown = dropdownOpen && suggestions.length > 0;

  function handleSelect(name: string) {
    onChange(name);
    onSelectSuggestion?.(name);
    setDropdownOpen(false);
    inputRef.current?.blur();
  }

  function handleChangeText(text: string) {
    onChange(text);
    setDropdownOpen(true);
  }

  function highlightMatch(name: string) {
    const lower = value.toLowerCase();
    const idx = name.toLowerCase().indexOf(lower);
    if (idx === -1 || !value.trim()) return name;
    return {
      before: name.slice(0, idx),
      match: name.slice(idx, idx + value.length),
      after: name.slice(idx + value.length),
    };
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputRow,
          hasError && styles.inputRowError,
          isFocused && !hasError && styles.inputRowFocused,
        ]}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={t('addCredit.storeName')}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => { setIsFocused(true); setDropdownOpen(true); }}
          onBlur={() => {
            setIsFocused(false);
            blurTimerRef.current = setTimeout(() => setDropdownOpen(false), 200);
          }}
          returnKeyType="next"
          autoCapitalize="words"
          autoFocus={autoFocus}
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { onChange(''); setDropdownOpen(false); }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View
          style={styles.dropdown}
          onTouchStart={() => {
            // Cancel the blur-close timer when user touches the dropdown
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={true}
            onScrollBeginDrag={() => {
              // Re-focus input to keep keyboard open while scrolling
              if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
              inputRef.current?.focus();
            }}
          >
            {suggestions.map((item, index) => {
              const parts = highlightMatch(item);
              const isLast = index === suggestions.length - 1;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.item, isLast && styles.itemLast]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="storefront-outline" size={16} color={colors.textTertiary} />
                  {typeof parts === 'string' ? (
                    <Text style={styles.itemText}>{parts}</Text>
                  ) : (
                    <Text style={styles.itemText}>
                      <Text>{parts.before}</Text>
                      <Text style={styles.itemTextMatch}>{parts.match}</Text>
                      <Text>{parts.after}</Text>
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
