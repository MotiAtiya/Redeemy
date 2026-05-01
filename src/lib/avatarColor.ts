/**
 * Picks a stable, deterministic background color for a user's avatar from a
 * curated 12-color palette. The same userId always maps to the same color
 * across devices, screens, and family changes — so each person reads as
 * "the same coloured circle" wherever they appear.
 *
 * Tuned to harmonize with the app's Sage Teal brand and to keep AA-level
 * contrast against white text in both light and dark themes.
 */

export const AVATAR_PALETTE = [
  '#D26B58', // Coral
  '#8B79B8', // Lavender
  '#B5872E', // Mustard
  '#5C7BA0', // Slate Blue
  '#B04E3F', // Terracotta
  '#8E5B7A', // Plum
  '#4F7280', // Steel
  '#6F6FA0', // Indigo
  '#C4708F', // Rose
  '#7B8A3D', // Olive
  '#8B4255', // Burgundy
  '#4F7C5E', // Forest
] as const;

export function getAvatarColor(userId: string | null | undefined): string {
  if (!userId) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
