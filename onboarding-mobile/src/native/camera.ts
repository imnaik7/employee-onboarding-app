import * as ImagePicker from 'expo-image-picker';

// Native camera wrapper (from /add-native add-camera template). Screens import this,
// never expo-image-picker directly.

export type PhotoResult =
  | { ok: true; uri: string; width: number; height: number; mimeType?: string; fileSize?: number; size?: number; name?: string }
  | { ok: false; reason: 'permission-denied' | 'cancelled' | 'unsupported' | 'error'; message?: string };

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Launch the device camera and capture a photo.
 * Returns `{ ok: false, reason: 'unsupported' }` when native camera capture is unavailable.
 */
export async function takePhoto(options?: { quality?: number; allowsEditing?: boolean }): Promise<PhotoResult> {
  let granted = false;
  try {
    granted = await requestCameraPermission();
  } catch {
    return { ok: false, reason: 'unsupported' };
  }
  if (!granted) return { ok: false, reason: 'permission-denied' };

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: options?.quality ?? 0.8,
      allowsEditing: options?.allowsEditing ?? false,
      exif: false,
    });
    if (result.canceled) return { ok: false, reason: 'cancelled' };
    const asset = result.assets[0];
    return {
      ok: true,
      uri: asset.uri,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
      mimeType: asset.mimeType ?? undefined,
      fileSize: asset.fileSize ?? undefined,
      size: asset.fileSize ?? undefined,
      name: asset.fileName ?? undefined,
    };
  } catch (e: unknown) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : undefined };
  }
}
