import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Downloads a remote image to the device's media library. The caller decides
 * what to do on each branch via the callbacks — the helper itself does not
 * touch the UI (no Alert / no toast / no translations).
 *
 * Returns nothing; outcomes are reported through the provided callbacks.
 *   onPermissionDenied → user said no to MediaLibrary access
 *   onSuccess          → image saved
 *   onError            → any other failure (network, IO, …)
 *
 * Used by every detail-screen image carousel; the file naming prefix is
 * cosmetic (it's the cached temp filename — the saved gallery entry uses the
 * library's own naming).
 */
interface DownloadOptions {
  /** Remote URL to download from. */
  url: string;
  /** Cosmetic prefix for the temp filename, e.g. 'redeemy-doc'. */
  filenamePrefix?: string;
  onPermissionDenied: () => void;
  onSuccess: () => void;
  onError: (error: unknown) => void;
}

export async function downloadImageToLibrary({
  url,
  filenamePrefix = 'redeemy',
  onPermissionDenied,
  onSuccess,
  onError,
}: DownloadOptions): Promise<void> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      onPermissionDenied();
      return;
    }
    const filename = `${filenamePrefix}-${Date.now()}.jpg`;
    const localUri = FileSystem.cacheDirectory + filename;
    const { uri } = await FileSystem.downloadAsync(url, localUri);
    await MediaLibrary.saveToLibraryAsync(uri);
    onSuccess();
  } catch (error) {
    onError(error);
  }
}
