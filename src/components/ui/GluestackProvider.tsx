import React from 'react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from './theme';

interface Props {
  children: React.ReactNode;
}

/**
 * GluestackProvider — wraps the entire app with the Redeemy Sage teal theme.
 * Must be the outermost provider in src/app/_layout.tsx.
 */
export function GluestackProvider({ children }: Props) {
  return (
    <GluestackUIProvider config={config}>
      {children}
    </GluestackUIProvider>
  );
}
