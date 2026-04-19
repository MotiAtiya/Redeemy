import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Formats a Date using the user's chosen date format from settingsStore.
 * DD/MM/YYYY (default) or MM/DD/YYYY.
 */
export function formatDate(date: Date): string {
  const fmt = useSettingsStore.getState().dateFormat;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return fmt === 'MM/DD/YYYY' ? `${mm}/${dd}/${yyyy}` : `${dd}/${mm}/${yyyy}`;
}
