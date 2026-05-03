import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { ref, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { auth, storage } from './firebase';
import { logEvent } from './eventLog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PickedImage {
  localUri: string;
  /** Natural pixel width as reported by the picker. */
  width: number;
  /** Natural pixel height as reported by the picker. */
  height: number;
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
// Picker → probe pipeline
// ---------------------------------------------------------------------------

/**
 * Waits until a file at `uri` exists and has a non-zero, settled size.
 * Polls FileSystem.getInfoAsync — when two consecutive readings give the same
 * non-zero size, the OS is done writing.
 *
 * react-native-image-picker resolves its Promise before the temp JPEG is
 * fully flushed on Android, so any code that opens the file too early
 * (Glide, BitmapFactory, even ImageManipulator) sees a partial/zero-byte
 * file and fails.
 */
async function waitForStableFile(uri: string, maxWaitMs = 2500): Promise<void> {
  if (!uri.startsWith('file://')) return;
  const deadline = Date.now() + maxWaitMs;
  let lastSize = -1;
  while (Date.now() < deadline) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      const size = info.exists ? ((info as { size?: number }).size ?? 0) : 0;
      if (size > 0 && size === lastSize) return;
      lastSize = size;
    } catch {
      lastSize = -1;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

/**
 * Re-decodes the picker's output via ImageManipulator. This is the linchpin
 * that makes the whole pipeline reliable on Android 13+, and it solves three
 * separate bugs in one step:
 *
 * 1. Race with disk flush: by waiting for a stable file size and then asking
 *    ImageManipulator to re-encode, we guarantee the bytes are fully written
 *    before any decoder touches them.
 *
 * 2. Wrong/zero dimensions: pickers report w/h from EXIF (which can be wrong
 *    or rotated). manipulateAsync reads dimensions from actual pixels.
 *
 * 3. Black image in <Image>: Glide caches a failed decode against the
 *    picker's temp URI; subsequent renders return blank. The fresh URI from
 *    manipulateAsync's own cache dir has never been seen by Glide.
 */
/**
 * Android 13+ Photo Picker hands react-native-image-picker a synthetic path:
 *   /sdcard/.transforms/synthetic/picker/0/com.android.providers.media.photopicker/media/1000196866.jpg
 * It's not a real file — it's a virtual reference to a content provider entry.
 * The actual readable form is the matching content URI:
 *   content://media/picker/0/com.android.providers.media.photopicker/media/1000196866
 * Returns null for paths that aren't synthetic photopicker references.
 */
function syntheticPathToContentUri(path: string): string | null {
  const match = path.match(
    /^\/sdcard\/\.transforms\/synthetic\/(.+?)(\.jpg|\.jpeg|\.png|\.webp|\.heic|\.heif)?$/i,
  );
  if (!match) return null;
  return `content://media/${match[1]}`;
}

/**
 * Picker can return a 0-byte temp file on some Android devices (HEIC sources,
 * cloud photos, photopicker synthetic refs). The original source is still
 * readable via `originalPath` — sometimes as a real file path, sometimes as
 * a synthetic path that we have to translate back to a content:// URI.
 * FileSystem.copyAsync is the only Expo API that accepts content:// schemes.
 */
async function copyOriginalToCache(originalPath: string): Promise<string | null> {
  const dest = `${FileSystem.cacheDirectory}redeemy-pick-${Date.now()}.jpg`;

  // First try the originalPath as-is — works for plain file:// paths and
  // already-formed content:// URIs.
  try {
    await FileSystem.copyAsync({ from: originalPath, to: dest });
    return dest;
  } catch {
    /* try fallback below */
  }

  // Translate Android 13+ photopicker synthetic refs back to content URIs.
  const contentUri = syntheticPathToContentUri(originalPath);
  if (contentUri) {
    try {
      await FileSystem.copyAsync({ from: contentUri, to: dest });
      return dest;
    } catch (err) {
      console.warn('copyAsync from synthetic content URI failed:', err);
    }
  }

  return null;
}

async function tryManipulate(uri: string): Promise<PickedImage | null> {
  try {
    const probe = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { localUri: probe.uri, width: probe.width, height: probe.height };
  } catch {
    return null;
  }
}

async function probeAsset(
  asset:
    | {
        uri?: string;
        width?: number;
        height?: number;
        type?: string;
        fileSize?: number;
        originalPath?: string;
      }
    | undefined,
): Promise<PickedImage | null> {
  if (!asset?.uri) return null;
  await waitForStableFile(asset.uri);

  // Build the candidate list, in priority order:
  //   1. The picker's copied file (good when the copy actually worked).
  //   2. A FileSystem.copyAsync of the original (for plain content:// URIs).
  //   3. The synthetic-path-derived content URI fed to ImageManipulator
  //      directly — needed for Android 13+ Photo Picker entries where the
  //      picker writes a 0-byte stub but the URI itself is still readable
  //      via ContentResolver inside expo-image-manipulator's native code.
  const candidates: string[] = [asset.uri];

  const info = await FileSystem.getInfoAsync(asset.uri).catch(() => null);
  const size = info?.exists ? ((info as { size?: number }).size ?? 0) : 0;
  const pickerCopyEmpty = size === 0;

  if (pickerCopyEmpty && asset.originalPath) {
    const copied = await copyOriginalToCache(asset.originalPath);
    if (copied) candidates.push(copied);
    const contentUri = syntheticPathToContentUri(asset.originalPath);
    if (contentUri) candidates.push(contentUri);
  }

  for (const candidate of candidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await tryManipulate(candidate);
      if (result) return result;
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  console.warn(
    'Image probe failed for every candidate — asset:',
    {
      type: asset.type,
      fileSize: asset.fileSize,
      width: asset.width,
      height: asset.height,
      uri: asset.uri,
      originalPath: asset.originalPath,
      tried: candidates,
    },
  );
  return null;
}

// ---------------------------------------------------------------------------
// Camera + Gallery
// ---------------------------------------------------------------------------

/**
 * We use react-native-image-picker (not expo-image-picker) because the latter
 * fails on Android 13+ Photo Picker URIs ("Uri lacks 'file' scheme") in the
 * SDK 55 native code. Permission requesting still goes through
 * expo-image-picker for its Settings-opening flow on permanent denial.
 */
export async function openCamera(): Promise<PickedImage | null> {
  const granted = await requestCameraPermission();
  if (!granted) return null;
  try {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.9,
      includeExtra: true,
      saveToPhotos: false,
      cameraType: 'back',
    });
    if (result.didCancel || result.errorCode) return null;
    return await probeAsset(result.assets?.[0]);
  } catch (err) {
    console.warn('Camera picker failed:', err);
    return null;
  }
}

export async function openGallery(): Promise<PickedImage | null> {
  const granted = await requestMediaLibraryPermission();
  if (!granted) return null;
  try {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
      includeExtra: true,
      selectionLimit: 1,
    });
    if (result.didCancel || result.errorCode) return null;
    return await probeAsset(result.assets?.[0]);
  } catch (err) {
    console.warn('Gallery picker failed:', err);
    return null;
  }
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
  try {
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
  } catch (err) {
    const errorCode = (err as { code?: string })?.code ?? 'unknown';
    void logEvent('image_upload_failed', {
      metadata: { entityType, errorCode, message: String((err as Error)?.message ?? err).slice(0, 200) },
    });
    throw err;
  }
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
