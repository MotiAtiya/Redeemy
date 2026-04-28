import { Linking, Platform } from 'react-native';

const APP_STORE_URL = 'itms-apps://itunes.apple.com/app/id6746872361?action=write-review';
const PLAY_STORE_URL = 'market://details?id=com.redeemy';

export function openStoreReview(): void {
  const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  Linking.openURL(url);
}
