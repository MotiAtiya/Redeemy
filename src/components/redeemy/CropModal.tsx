import { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  PanResponder,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

const HANDLE_SIZE = 30;
const MIN_CROP = 60;

interface Rect { x: number; y: number; width: number; height: number }
interface Size { width: number; height: number }

interface Props {
  uri: string;
  /** Natural pixel size — provided by the picker, avoids a flaky Image.getSize call. */
  width: number;
  height: number;
  onCrop: (croppedUri: string) => void;
  onCancel: () => void;
}

/** Given a container and natural image size, compute the displayed image rect (contentFit="contain"). */
function calcDisplayRect(container: Size, natural: Size): Rect {
  const ca = container.width / container.height;
  const ia = natural.width / natural.height;
  const dw = ia > ca ? container.width : container.height * ia;
  const dh = ia > ca ? container.width / ia : container.height;
  return {
    x: (container.width - dw) / 2,
    y: (container.height - dh) / 2,
    width: dw,
    height: dh,
  };
}

function clamp(rect: Rect, bounds: Rect): Rect {
  const x = Math.max(bounds.x, Math.min(rect.x, bounds.x + bounds.width - MIN_CROP));
  const y = Math.max(bounds.y, Math.min(rect.y, bounds.y + bounds.height - MIN_CROP));
  const width = Math.max(MIN_CROP, Math.min(rect.width, bounds.x + bounds.width - x));
  const height = Math.max(MIN_CROP, Math.min(rect.height, bounds.y + bounds.height - y));
  return { x, y, width, height };
}

export function CropModal({ uri, width, height, onCrop, onCancel }: Props) {
  const { t } = useTranslation();
  const [currentUri, setCurrentUri] = useState(uri);
  const [containerSize, setContainerSize] = useState<Size | null>(null);
  // Natural size starts from the picker-provided dimensions and is replaced
  // on rotation by the dimensions ImageManipulator returns. This keeps us off
  // Image.getSize entirely — its disk read raced the picker's cache write.
  const [naturalSize, setNaturalSize] = useState<Size>({ width, height });
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const [cropping, setCropping] = useState(false);
  const [rotating, setRotating] = useState(false);

  // Refs so PanResponder closures always see current values
  const cropRef = useRef<Rect | null>(null);
  const imageRectRef = useRef<Rect | null>(null);

  // Recalculate image display rect when inputs change
  const imageRect =
    containerSize && naturalSize ? calcDisplayRect(containerSize, naturalSize) : null;

  // Update imageRectRef whenever imageRect changes
  useEffect(() => {
    imageRectRef.current = imageRect;
  }, [imageRect]);

  // Initialise (or re-initialise after rotation) crop rect to image bounds with padding.
  // Triggers whenever imageRect changes — which happens both on first load and after
  // rotation (URI change → naturalSize reset → new naturalSize → new imageRect).
  useEffect(() => {
    if (!imageRect) return;
    const pad = 24;
    const r: Rect = {
      x: imageRect.x + pad,
      y: imageRect.y + pad,
      width: imageRect.width - pad * 2,
      height: imageRect.height - pad * 2,
    };
    cropRef.current = r;
    setCropRect(r);
  // imageRect is stable-by-value but object-by-reference; key fields drive the reset
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageRect?.x, imageRect?.y, imageRect?.width, imageRect?.height]);

  // In RTL mode PanResponder inverts both dx and dy — negate them back to physical coords
  const isRTL = I18nManager.isRTL;
  function fixGesture(dx: number, dy: number) {
    return { dx: isRTL ? -dx : dx, dy };
  }

  // Build PanResponder for a corner handle
  function makePan(corner: 'tl' | 'tr' | 'bl' | 'br') {
    let start: Rect = { x: 0, y: 0, width: 0, height: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        start = cropRef.current ?? start;
      },
      onPanResponderMove: (_, gesture) => {
        const bounds = imageRectRef.current;
        if (!bounds) return;
        const { dx, dy } = fixGesture(gesture.dx, gesture.dy);

        let r: Rect;
        if (corner === 'tl') {
          r = { x: start.x + dx, y: start.y + dy, width: start.width - dx, height: start.height - dy };
        } else if (corner === 'tr') {
          r = { x: start.x, y: start.y + dy, width: start.width + dx, height: start.height - dy };
        } else if (corner === 'bl') {
          r = { x: start.x + dx, y: start.y, width: start.width - dx, height: start.height + dy };
        } else {
          r = { x: start.x, y: start.y, width: start.width + dx, height: start.height + dy };
        }

        if (r.width < MIN_CROP || r.height < MIN_CROP) return;
        const clamped = clamp(r, bounds);
        cropRef.current = clamped;
        setCropRect({ ...clamped });
      },
    });
  }

  // Build PanResponder for moving the entire crop box
  function makeMovePan() {
    let start: Rect = { x: 0, y: 0, width: 0, height: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        start = cropRef.current ?? start;
      },
      onPanResponderMove: (_, gesture) => {
        const bounds = imageRectRef.current;
        if (!bounds) return;
        const { dx, dy } = fixGesture(gesture.dx, gesture.dy);
        const r: Rect = {
          x: start.x + dx,
          y: start.y + dy,
          width: start.width,
          height: start.height,
        };
        // Clamp position so the box stays fully within the image
        const x = Math.max(bounds.x, Math.min(r.x, bounds.x + bounds.width - r.width));
        const y = Math.max(bounds.y, Math.min(r.y, bounds.y + bounds.height - r.height));
        const clamped = { x, y, width: r.width, height: r.height };
        cropRef.current = clamped;
        setCropRect({ ...clamped });
      },
    });
  }

  // Create pan responders once
  const pans = useRef({
    tl: makePan('tl'),
    tr: makePan('tr'),
    bl: makePan('bl'),
    br: makePan('br'),
    move: makeMovePan(),
  }).current;

  async function handleRotate() {
    if (rotating) return;
    setRotating(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      // Reset crop rect so it recalculates for the new orientation, and use
      // the dimensions ImageManipulator just gave us — no getSize round-trip.
      cropRef.current = null;
      setCurrentUri(result.uri);
      setNaturalSize({ width: result.width, height: result.height });
    } finally {
      setRotating(false);
    }
  }

  async function handleCrop() {
    const rect = cropRef.current;
    const imgRect = imageRectRef.current;
    if (!rect || !imgRect || !naturalSize) return;

    setCropping(true);
    const scaleX = naturalSize.width / imgRect.width;
    const scaleY = naturalSize.height / imgRect.height;

    // In RTL the displayed image is mirrored relative to the physical coordinate
    // space used by the crop rect. Convert the physical left-offset to the
    // image's natural (LTR) x origin before passing to ImageManipulator.
    const physicalOffsetX = rect.x - imgRect.x;
    const nativeOriginX = isRTL
      ? imgRect.width - physicalOffsetX - rect.width
      : physicalOffsetX;

    const crop = {
      originX: Math.max(0, Math.round(nativeOriginX * scaleX)),
      originY: Math.max(0, Math.round((rect.y - imgRect.y) * scaleY)),
      width: Math.round(rect.width * scaleX),
      height: Math.round(rect.height * scaleY),
    };

    try {
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ crop }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      onCrop(result.uri);
    } catch {
      setCropping(false);
    }
  }

  const h = HANDLE_SIZE / 2;

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <View style={styles.root}>
        {/* Image area */}
        <View
          style={styles.imageArea}
          onLayout={(e) => setContainerSize(e.nativeEvent.layout)}
        >
          <Image source={{ uri: currentUri }} style={StyleSheet.absoluteFill} contentFit="contain" />

          {cropRect && (
            <>
              {/* Dark overlay — 4 strips around the crop rect */}
              <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: cropRect.y }]} />
              <View style={[styles.overlay, { top: cropRect.y + cropRect.height, left: 0, right: 0, bottom: 0 }]} />
              <View style={[styles.overlay, { top: cropRect.y, left: 0, width: cropRect.x, height: cropRect.height }]} />
              <View style={[styles.overlay, { top: cropRect.y, left: cropRect.x + cropRect.width, right: 0, height: cropRect.height }]} />

              {/* Crop border */}
              <View
                style={[styles.cropBorder, {
                  left: cropRect.x,
                  top: cropRect.y,
                  width: cropRect.width,
                  height: cropRect.height,
                }]}
              />

              {/* Draggable move area (inside the crop box, above grid lines) */}
              <View
                style={[styles.moveArea, {
                  left: cropRect.x,
                  top: cropRect.y,
                  width: cropRect.width,
                  height: cropRect.height,
                }]}
                {...pans.move.panHandlers}
              />

              {/* Grid lines (rule of thirds) */}
              <View style={[styles.gridLine, styles.gridH, {
                top: cropRect.y + cropRect.height / 3,
                left: cropRect.x,
                width: cropRect.width,
              }]} />
              <View style={[styles.gridLine, styles.gridH, {
                top: cropRect.y + (cropRect.height * 2) / 3,
                left: cropRect.x,
                width: cropRect.width,
              }]} />
              <View style={[styles.gridLine, styles.gridV, {
                left: cropRect.x + cropRect.width / 3,
                top: cropRect.y,
                height: cropRect.height,
              }]} />
              <View style={[styles.gridLine, styles.gridV, {
                left: cropRect.x + (cropRect.width * 2) / 3,
                top: cropRect.y,
                height: cropRect.height,
              }]} />

              {/* Corner handles */}
              <View style={[styles.handle, { left: cropRect.x - h, top: cropRect.y - h }]} {...pans.tl.panHandlers} />
              <View style={[styles.handle, { left: cropRect.x + cropRect.width - h, top: cropRect.y - h }]} {...pans.tr.panHandlers} />
              <View style={[styles.handle, { left: cropRect.x - h, top: cropRect.y + cropRect.height - h }]} {...pans.bl.panHandlers} />
              <View style={[styles.handle, { left: cropRect.x + cropRect.width - h, top: cropRect.y + cropRect.height - h }]} {...pans.br.panHandlers} />
            </>
          )}
        </View>

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onCancel} style={styles.toolbarBtn} disabled={cropping || rotating}>
            <Text style={styles.cancelText}>{t('crop.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRotate}
            style={styles.toolbarBtn}
            disabled={cropping || rotating}
          >
            {rotating
              ? <ActivityIndicator color="#AAAAAA" size="small" />
              : <Ionicons name="refresh-outline" size={22} color="#AAAAAA" />
            }
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCrop}
            style={styles.toolbarBtn}
            disabled={!cropRect || cropping || rotating}
          >
            {cropping
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={styles.doneText}>{t('crop.done')}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  imageArea: { flex: 1 },
  overlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  cropBorder: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.25)' },
  gridH: { height: 1 },
  gridV: { width: 1 },
  moveArea: { position: 'absolute' },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    backgroundColor: '#111111',
  },
  toolbarBtn: { minWidth: 64, alignItems: 'center', padding: 8 },
  cancelText: { color: '#AAAAAA', fontSize: 16 },
  doneText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 12, color: '#666666' },
});
