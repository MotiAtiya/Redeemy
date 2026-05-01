import { useCallback, useState, type ReactNode } from 'react';
import { CropModal } from '@/components/redeemy/CropModal';
import { openCamera, openGallery, type PickedImage } from '@/lib/imageUpload';

interface Options {
  /** Cap on how many photos the host screen accepts. */
  maxPhotos: number;
  /** Current photo count — pickers no-op when this hits maxPhotos. */
  currentCount: number;
  /** Called with the cropped local URI after the user confirms the crop. */
  onAdd: (croppedUri: string) => void;
}

interface PhotoPicker {
  /** Open the device camera, then route through the crop modal. */
  fromCamera: () => Promise<void>;
  /** Open the photo gallery, then route through the crop modal. */
  fromGallery: () => Promise<void>;
  /** JSX to render — non-null only while the crop modal is active. */
  cropOverlay: ReactNode;
}

/**
 * Centralises the "pick → crop → callback" pipeline used by every Add screen.
 * Each screen previously inlined the same state, two handlers, and CropModal
 * JSX; this hook collapses it to a single call site.
 */
export function usePhotoPicker({ maxPhotos, currentCount, onAdd }: Options): PhotoPicker {
  const [cropImage, setCropImage] = useState<PickedImage | null>(null);
  const atLimit = currentCount >= maxPhotos;

  const fromCamera = useCallback(async () => {
    if (atLimit) return;
    try {
      const picked = await openCamera();
      if (picked) setCropImage(picked);
    } catch {
      // Camera unavailable (e.g. simulator) — silently skip.
    }
  }, [atLimit]);

  const fromGallery = useCallback(async () => {
    if (atLimit) return;
    const picked = await openGallery();
    if (picked) setCropImage(picked);
  }, [atLimit]);

  const handleCropDone = useCallback((uri: string) => {
    onAdd(uri);
    setCropImage(null);
  }, [onAdd]);

  const handleCropCancel = useCallback(() => {
    setCropImage(null);
  }, []);

  const cropOverlay = cropImage ? (
    <CropModal
      uri={cropImage.localUri}
      width={cropImage.width}
      height={cropImage.height}
      onCrop={handleCropDone}
      onCancel={handleCropCancel}
    />
  ) : null;

  return { fromCamera, fromGallery, cropOverlay };
}
