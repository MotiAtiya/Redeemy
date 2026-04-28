import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AutocompleteInput, type AutocompleteItem } from '@/components/redeemy/AutocompleteInput';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { SUBSCRIPTION_SERVICE_NAMES, getCategoryForService } from '@/data/subscriptionServices';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptionCategories';

const MAX_SUGGESTIONS = 50;

function getCategoryIcon(categoryId: string | null) {
  if (!categoryId) return 'repeat-outline' as const;
  return SUBSCRIPTION_CATEGORIES.find((c) => c.id === categoryId)?.icon ?? ('repeat-outline' as const);
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (name: string, categoryId: string | null) => void;
  autoFocus?: boolean;
}

export function ServiceAutocomplete({ value, onChange, onSelectSuggestion, autoFocus }: Props) {
  const { t } = useTranslation();
  const subscriptions = useSubscriptionsStore((s) => s.subscriptions);

  const suggestions = useMemo<AutocompleteItem[]>(() => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();

    const userNames = [...new Set(subscriptions.map((s) => s.serviceName))];
    const combined = [...new Set([...userNames, ...SUBSCRIPTION_SERVICE_NAMES])];

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
        icon: getCategoryIcon(getCategoryForService(name)),
      }));
  }, [subscriptions, value]);

  return (
    <AutocompleteInput
      value={value}
      suggestions={suggestions}
      onChangeText={onChange}
      onSelect={(item) => {
        onChange(item.value);
        onSelectSuggestion?.(item.value, getCategoryForService(item.value));
      }}
      placeholder={t('addSubscription.serviceNamePlaceholder')}
      autoFocus={autoFocus}
      autoCapitalize="words"
    />
  );
}
