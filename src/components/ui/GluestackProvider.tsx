import React from 'react';
import { useColorScheme } from 'react-native';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from './theme';
import { useSettingsStore } from '@/stores/settingsStore';

interface Props {
  children: React.ReactNode;
}

export function GluestackProvider({ children }: Props) {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme();
  const resolved = themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;

  return (
    <GluestackUIProvider config={config} colorMode={resolved}>
      {children}
    </GluestackUIProvider>
  );
}
