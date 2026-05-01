/**
 * Returns up to two initials from a full name (first letter of each of the
 * first two whitespace-separated words). Falls back to '?' for empty input.
 *
 * Examples:
 *   "מרדכי עטייה"  → "מע"
 *   "מוטי"          → "מ"
 *   "Jane Doe Smith" → "JD"
 *   "alice"         → "A"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
  return initials || '?';
}
