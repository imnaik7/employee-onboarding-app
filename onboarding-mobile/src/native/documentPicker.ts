import * as DocumentPicker from 'expo-document-picker';

// Native document picker wrapper. Screens import this, never expo-document-picker directly.

export type DocumentResult =
  | { ok: true; uri: string; name: string; size?: number; mimeType?: string }
  | { ok: false; reason: 'cancelled' | 'error'; message?: string };

/** Pick a single local document (PDF, Word, image) and copy it into the app cache. */
export async function pickDocument(options?: { type?: string | string[] }): Promise<DocumentResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: options?.type ?? '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.length) return { ok: false, reason: 'cancelled' };
    const asset = result.assets[0];
    return { ok: true, uri: asset.uri, name: asset.name, size: asset.size ?? undefined, mimeType: asset.mimeType ?? undefined };
  } catch (e: unknown) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : undefined };
  }
}
