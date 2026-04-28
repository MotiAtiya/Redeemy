import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { ref, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { auth, storage } from './firebase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PickedImage {
  localUri: string;
}

/** A single uploaded image (full resolution + thumbnail). */
export interface DocumentImage {
  url: string;
  thumbnailUrl: string;
}

/** @deprecated Use DocumentImage instead */
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

/**
 * Uploads a local file URI to Firebase Storage natively.
 * Uses expo-file-system's uploadAsync (native HTTP, no JS Blob/XHR) so it works
 * on both iOS and Android, including file:// URIs.
 */
async function uploadFileNative(localUri: string, storagePath: string): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Not authenticated');

  const bucket = (storage.app.options as { storageBucket: string }).storageBucket;
  const encodedPath = encodeURIComponent(storagePath);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodedPath}`;

  const result = await FileSystem.uploadAsync(url, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': 'image/jpeg',
      Authorization: `Firebase ${idToken}`,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed: ${result.status} ${result.body}`);
  }
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

  const fullPath = `credits/${creditId}/full.jpg`;
  const thumbPath = `credits/${creditId}/thumb.jpg`;

  await Promise.all([
    uploadFileNative(fullUri, fullPath),
    uploadFileNative(thumbUri, thumbPath),
  ]);

  const [imageUrl, thumbnailUrl] = await Promise.all([
    getDownloadURL(ref(storage, fullPath)),
    getDownloadURL(ref(storage, thumbPath)),
  ]);

  return { imageUrl, thumbnailUrl };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Deletes both the full and thumbnail images for a credit from Firebase Storage.
 * Silently ignores errors (e.g. if no image was ever uploaded).
 */
export async function deleteCreditImages(creditId: string): Promise<void> {
  return deleteEntityImages('credits', creditId);
}

/**
 * Compresses `localUri` and uploads both sizes to Firebase Storage.
 *
 * Storage paths:
 *   documents/{documentId}/full.jpg
 *   documents/{documentId}/thumb.jpg
 */
export async function uploadDocumentImage(
  localUri: string,
  documentId: string
): Promise<UploadedImages> {
  const { fullUri, thumbUri } = await compressImage(localUri);

  const fullPath = `documents/${documentId}/full.jpg`;
  const thumbPath = `documents/${documentId}/thumb.jpg`;

  await Promise.all([
    uploadFileNative(fullUri, fullPath),
    uploadFileNative(thumbUri, thumbPath),
  ]);

  const [imageUrl, thumbnailUrl] = await Promise.all([
    getDownloadURL(ref(storage, fullPath)),
    getDownloadURL(ref(storage, thumbPath)),
  ]);

  return { imageUrl, thumbnailUrl };
}

/**
 * Deletes both the full and thumbnail images for a document from Firebase Storage.
 * Silently ignores errors.
 */
export async function deleteDocumentImages(documentId: string): Promise<void> {
  return deleteEntityImages('documents', documentId);
}

// ---------------------------------------------------------------------------
// Generic multi-image upload / delete
// ---------------------------------------------------------------------------

type EntityType = 'credits' | 'warranties' | 'documents';

/**
 * Compresses `localUri` and uploads both sizes to Firebase Storage.
 *
 * Storage paths:
 *   {entityType}/{entityId}/{index}_full.jpg
 *   {entityType}/{entityId}/{index}_thumb.jpg
 */
export async function uploadEntityImage(
  localUri: string,
  entityType: EntityType,
  entityId: string,
  index: number,
): Promise<DocumentImage> {
  const { fullUri, thumbUri } = await compressImage(localUri);

  const fullPath = `${entityType}/${entityId}/${index}_full.jpg`;
  const thumbPath = `${entityType}/${entityId}/${index}_thumb.jpg`;

  await Promise.all([
    uploadFileNative(fullUri, fullPath),
    uploadFileNative(thumbUri, thumbPath),
  ]);

  const [url, thumbnailUrl] = await Promise.all([
    getDownloadURL(ref(storage, fullPath)),
    getDownloadURL(ref(storage, thumbPath)),
  ]);

  return { url, thumbnailUrl };
}

/**
 * Deletes all images for an entity from Firebase Storage.
 * Silently ignores errors (e.g. if no images were uploaded).
 */
export async function deleteEntityImages(
  entityType: EntityType,
  entityId: string,
): Promise<void> {
  const folderRef = ref(storage, `${entityType}/${entityId}`);
  try {
    const { items } = await listAll(folderRef);
    await Promise.allSettled(items.map((item) => deleteObject(item)));
  } catch {
    // folder may not exist if no image was uploaded
  }
}
