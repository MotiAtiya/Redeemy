/**
 * Type patch for @firebase/auth v12.
 *
 * Firebase v12 places "types" before "react-native" in its package.json
 * exports map, so TypeScript resolves the browser types instead of the
 * RN types — even with customConditions: ["react-native"] in tsconfig.
 *
 * getReactNativePersistence IS present at runtime (Metro correctly resolves
 * the react-native condition). This augmentation restores the type.
 *
 * Remove once Firebase corrects the condition order in their package.json.
 */

// The empty export makes this a module, so 'declare module' is an augmentation
export {};

declare module '@firebase/auth' {
  export interface ReactNativeAsyncStorage {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }
  // Persistence is already declared by @firebase/auth's own types
  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage,
  ): import('@firebase/auth').Persistence;
}
