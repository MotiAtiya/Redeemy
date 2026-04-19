import type { DateFormat } from '@/stores/settingsStore';

/**
 * Pure function — formats a Date using the provided format string.
 * Pass `dateFormat` from `useSettingsStore((s) => s.dateFormat)` so the
 * calling component re-renders reactively when the setting changes.
 */
export function formatDate(date: Date, fmt: DateFormat): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return fmt === 'MM/DD/YYYY' ? `${mm}/${dd}/${yyyy}` : `${dd}/${mm}/${yyyy}`;
}
