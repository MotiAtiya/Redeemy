import React from 'react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from './theme';
import { useIsDark } from '@/hooks/useAppTheme';

interface Props {
  children: React.ReactNode;
}

export function GluestackProvider({ children }: Props) {
  const isDark = useIsDark();

  return (
    <GluestackUIProvider config={config} colorMode={isDark ? 'dark' : 'light'}>
      {children}
    </GluestackUIProvider>
  );
}
