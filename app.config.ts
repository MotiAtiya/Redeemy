import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Redeemy',
  slug: 'redeemy',
  version: '1.0.0',
  orientation: 'portrait',
  updates: {
    url: 'https://u.expo.dev/1bba5598-7e1b-4a4c-b956-912de45854b6',
    requestHeaders: {
      'expo-channel-name': 'development',
    },
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  icon: './assets/images/icon.png',
  scheme: 'redeemy',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.redeemy.app',
    icon: './assets/images/icon.png',
    infoPlist: {
      NSCameraUsageDescription: 'Redeemy uses the camera to photograph your store credits.',
      NSPhotoLibraryUsageDescription: 'Redeemy needs access to your photo library to select credit images.',
      NSPhotoLibraryAddUsageDescription: 'Redeemy needs permission to save images to your photo library.',
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
  },
  android: {
    package: 'com.redeemy.app',
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: '#5F9E8F',
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#5F9E8F',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
      },
    ],
    'expo-font',
    '@react-native-google-signin/google-signin',
    // 'expo-apple-authentication', // disabled for free-account device testing
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#5F9E8F',
        sounds: [],
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Redeemy needs access to your photos to select credit images.',
        cameraPermission: 'Redeemy uses the camera to photograph your store credits.',
      },
    ],
    [
      'expo-media-library',
      {
        photosPermission: 'Redeemy needs access to save credit images to your photo library.',
        savePhotosPermission: 'Redeemy needs permission to save images to your photo library.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    firebaseApiKey: process.env.FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.FIREBASE_APP_ID,
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '1bba5598-7e1b-4a4c-b956-912de45854b6',
    },
  },
});
