import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { lightColors, darkColors, type AppColors } from '@/constants/colors';

export function useAppTheme(): AppColors {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme();
  const resolved = themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;
  return resolved === 'dark' ? darkColors : lightColors;
}

export function useIsDark(): boolean {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme();
  const resolved = themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;
  return resolved === 'dark';
}
