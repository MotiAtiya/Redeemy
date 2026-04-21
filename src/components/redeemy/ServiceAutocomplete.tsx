import { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

const MAX_SUGGESTIONS = 50;

interface Props {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    container: {},
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

function highlightMatch(name: string, query: string) {
  const lower = query.toLowerCase();
  const idx = name.toLowerCase().indexOf(lower);
  if (idx === -1 || !query.trim()) return name;
  return {
    before: name.slice(0, idx),
    match: name.slice(idx, idx + query.length),
    after: name.slice(idx + query.length),
  };
}

export function ServiceAutocomplete({ value, onChange, autoFocus }: Props) {
  const colors = useAppTheme();
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const subscriptions = useSubscriptionsStore((s) => s.subscriptions);

  const suggestions = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();

    // Deduplicated service names from user's existing subscriptions
    const serviceNames = [...new Set(subscriptions.map((s) => s.serviceName))];

    return serviceNames
      .filter(
        (name) =>
          name.toLowerCase().includes(lower) &&
          name.toLowerCase() !== lower
      )
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(lower);
        const bStarts = b.toLowerCase().startsWith(lower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b, 'he');
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [subscriptions, value]);

  const showDropdown = dropdownOpen && suggestions.length > 0;

  function handleSelect(name: string) {
    onChange(name);
    setDropdownOpen(false);
    inputRef.current?.blur();
  }

  function handleChangeText(text: string) {
    onChange(text);
    setDropdownOpen(true);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={t('addSubscription.serviceNamePlaceholder')}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => {
            // Delay so a tap on a suggestion item registers before closing
            setTimeout(() => setDropdownOpen(false), 150);
          }}
          returnKeyType="next"
          autoCapitalize="words"
          autoCorrect={false}
          spellCheck={false}
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
        <View style={styles.dropdown}>
          {suggestions.map((item, index) => {
            const parts = highlightMatch(item, value);
            const isLast = index === suggestions.length - 1;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.item, isLast && styles.itemLast]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="repeat-outline" size={16} color={colors.textTertiary} />
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
        </View>
      )}
    </View>
  );
}
