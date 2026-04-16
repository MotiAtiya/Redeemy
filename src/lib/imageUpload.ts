import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Linking from 'expo-linking';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PickedImage {
  localUri: string;
}

export interface UploadedImages {
  imageUrl: string;
  thumbnailUrl: string;
}

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

/**
 * Requests camera permission.
 * Returns true if granted, false if denied.
 * On permanent denial, opens the device Settings app.
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { status, canAskAgain } =
    await ImagePicker.requestCameraPermissionsAsync();

  if (status === 'granted') return true;

  if (!canAskAgain) {
    // Permanently denied — send user to Settings
    await Linking.openSettings();
  }

  return false;
}

/**
 * Requests media library permission.
 * Returns true if granted, false if denied.
 * On permanent denial, opens the device Settings app.
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status, canAskAgain } =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status === 'granted') return true;

  if (!canAskAgain) {
    await Linking.openSettings();
  }

  return false;
}

// ---------------------------------------------------------------------------
// Camera — open full-screen immediately
// ---------------------------------------------------------------------------

/**
 * Opens the native camera. Returns the local image URI, or null if cancelled
 * or permission denied.
 */
export async function openCamera(): Promise<PickedImage | null> {
  const granted = await requestCameraPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1, // We compress ourselves — take full quality from camera
  });

  if (result.canceled) return null;

  return { localUri: result.assets[0].uri };
}

// ---------------------------------------------------------------------------
// Gallery picker
// ---------------------------------------------------------------------------

/**
 * Opens the photo library. Returns the local image URI, or null if cancelled
 * or permission denied.
 */
export async function openGallery(): Promise<PickedImage | null> {
  const granted = await requestMediaLibraryPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled) return null;

  return { localUri: result.assets[0].uri };
}

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

/**
 * Compresses a local image URI to the required sizes.
 * Raw camera output is NEVER used directly.
 *
 * @returns URIs of the compressed full and thumbnail images.
 */
async function compressImage(
  localUri: string
): Promise<{ fullUri: string; thumbUri: string }> {
  // Full image: max 1024px on the long edge, JPEG quality 0.7
  const fullResult = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1024 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Thumbnail: max 256px, JPEG quality 0.6
  const thumbResult = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 256 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
  );

  return { fullUri: fullResult.uri, thumbUri: thumbResult.uri };
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

/**
 * Compresses `localUri` and uploads both sizes to Firebase Storage.
 *
 * Storage paths:
 *   credits/{creditId}/full.jpg
 *   credits/{creditId}/thumb.jpg
 *
 * @returns Firebase Storage download URLs for full and thumbnail images.
 */
export async function uploadCreditImage(
  localUri: string,
  creditId: string
): Promise<UploadedImages> {
  const { fullUri, thumbUri } = await compressImage(localUri);

  const [fullBlob, thumbBlob] = await Promise.all([
    uriToBlob(fullUri),
    uriToBlob(thumbUri),
  ]);

  const fullRef = ref(storage, `credits/${creditId}/full.jpg`);
  const thumbRef = ref(storage, `credits/${creditId}/thumb.jpg`);

  await Promise.all([
    uploadBytes(fullRef, fullBlob, { contentType: 'image/jpeg' }),
    uploadBytes(thumbRef, thumbBlob, { contentType: 'image/jpeg' }),
  ]);

  const [imageUrl, thumbnailUrl] = await Promise.all([
    getDownloadURL(fullRef),
    getDownloadURL(thumbRef),
  ]);

  return { imageUrl, thumbnailUrl };
}
