import { createConfig } from '@gluestack-style/react';
import { config as defaultConfig } from '@gluestack-ui/config';

/**
 * Redeemy theme — Sage teal (#5F9E8F) primary token scale.
 *
 * Override only the primary color ramp; all other tokens (spacing, radii,
 * typography, secondary/tertiary) inherit from the Gluestack UI default config.
 */
export const config = createConfig({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // Sage teal scale — generated from HSL(169°, 25%, L%)
      primary0: '#EFF5F4',
      primary50: '#DFF0EE',
      primary100: '#BFDFDB',
      primary200: '#9FCEC8',
      primary300: '#80BEB6',
      primary400: '#6FAEA4',
      primary500: '#5F9E8F', // Sage teal — brand primary
      primary600: '#508880',
      primary700: '#3F7068',
      primary800: '#2F5750',
      primary900: '#1F3A37',
      primary950: '#0F1E1C',
    },
  },
});

/** Convenience constant for use in RN StyleSheet / inline styles */
export const SAGE_TEAL = '#5F9E8F';

export type AppConfig = typeof config;

declare module '@gluestack-style/react' {
  // Merge our config into Gluestack's global type registry
  // so token auto-complete ($primary500 etc.) works project-wide.
  interface ICustomConfig extends AppConfig {}
}
