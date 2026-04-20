// Type declaration for expo-clipboard
// Install with: npx expo install expo-clipboard
declare module 'expo-clipboard' {
  export function setStringAsync(text: string): Promise<void>;
  export function getStringAsync(): Promise<string>;
  export function hasStringAsync(): Promise<boolean>;
}
