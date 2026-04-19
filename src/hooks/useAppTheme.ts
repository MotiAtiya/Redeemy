import { useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { lightColors, darkColors, type AppColors } from '@/constants/colors';

function getScheme(): 'light' | 'dark' {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function useSystemScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>(getScheme);
  useEffect(() => {
    // Re-read after mount in case native layer wasn't ready on first render
    setScheme(getScheme());
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);
  return scheme;
}

export function useAppTheme(): AppColors {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useSystemScheme();
  const resolved = themeMode === 'system' ? systemScheme : themeMode;
  return resolved === 'dark' ? darkColors : lightColors;
}

export function useIsDark(): boolean {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useSystemScheme();
  const resolved = themeMode === 'system' ? systemScheme : themeMode;
  return resolved === 'dark';
}
