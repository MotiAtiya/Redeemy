import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AutocompleteInput, type AutocompleteItem } from '@/components/redeemy/AutocompleteInput';
import { useCreditsStore } from '@/stores/creditsStore';
import { ISRAELI_STORES, getCategoryForStore } from '@/data/israeliStores';
import { CATEGORIES } from '@/constants/categories';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (storeName: string) => void;
  hasError?: boolean;
  autoFocus?: boolean;
  storeList?: string[];
}

const MAX_SUGGESTIONS = 100;

function getIconForStore(name: string, userCredits: { storeName: string; category?: string }[]): IoniconsName {
  const creditMatch = userCredits.find(
    (c) => c.storeName.toLowerCase() === name.toLowerCase()
  );
  if (creditMatch?.category) {
    const cat = CATEGORIES.find((c) => c.id === creditMatch.category);
    if (cat) return cat.icon;
  }
  const categoryId = getCategoryForStore(name);
  if (categoryId) {
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    if (cat) return cat.icon;
  }
  return 'storefront-outline';
}

export function StoreAutocomplete({
  value,
  onChange,
  onSelectSuggestion,
  hasError,
  autoFocus,
  storeList,
}: Props) {
  const { t } = useTranslation();
  const credits = useCreditsStore((s) => s.credits);

  const suggestions = useMemo<AutocompleteItem[]>(() => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();

    const userStores = [...new Set(credits.map((c) => c.storeName))];
    const combined = [...new Set([...userStores, ...(storeList ?? ISRAELI_STORES)])];

    return combined
      .filter((name) => name.toLowerCase().includes(lower) && name.toLowerCase() !== lower)
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(lower);
        const bStarts = b.toLowerCase().startsWith(lower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b, 'he');
      })
      .slice(0, MAX_SUGGESTIONS)
      .map((name) => ({
        label: name,
        value: name,
        icon: getIconForStore(name, credits),
      }));
  }, [credits, value, storeList]);

  return (
    <AutocompleteInput
      value={value}
      suggestions={suggestions}
      onChangeText={onChange}
      onSelect={(item) => {
        onChange(item.value);
        onSelectSuggestion?.(item.value);
      }}
      placeholder={t('addCredit.storeName')}
      hasError={hasError}
      autoFocus={autoFocus}
      autoCapitalize="words"
    />
  );
}
