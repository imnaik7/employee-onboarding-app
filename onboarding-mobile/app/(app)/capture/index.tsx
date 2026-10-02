import React from 'react';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { YStack, XStack, Text, Button, Switch } from 'tamagui';
import { useThemeTokens } from '@microsoft/power-apps-native-host';
import { Hero, BottomActionBar } from '@/components';
import { processResume, MAX_RESUME_MB, RESUME_MIME_TYPES } from '@/services/resume';
import type { PickedFile } from '@/services/resume';
// src/native/camera.ts (takePhoto) and src/native/documentPicker.ts (pickDocument).
// Raw expo-image-picker / expo-document-picker must not be imported in screens.
import { takePhoto } from '@/native/camera';
import { pickDocument } from '@/native/documentPicker';

type PickResult =
  | { ok: true; uri: string; name?: string; size?: number | null }
  | { ok: false; reason: string };

function formatSize(size?: number | null): string {
  if (!size || size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CaptureResumeScreen() {
  const router = useRouter();
  const theme = useThemeTokens();
  const [file, setFile] = React.useState<PickedFile | null>(null);
  const [useAi, setUseAi] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isNavigating, setIsNavigating] = React.useState(false);

  const accept = (res: PickResult, fallbackName: string) => {
    if (!res.ok) {
      if (res.reason === 'cancelled') return;
      setError(
        res.reason === 'permission-denied' || res.reason === 'permission_denied'
          ? 'Permission denied. Enable access in Settings, or choose a file instead.'
          : "Couldn't get that file. Please try again."
      );
      return;
    }
    if (res.size && res.size > MAX_RESUME_MB * 1024 * 1024) {
      setError(`That file is larger than ${MAX_RESUME_MB} MB. Pick a smaller one.`);
      return;
    }
    setError(null);
    setFile({ uri: res.uri, name: res.name ?? fallbackName, size: res.size ?? null });
  };

  const onTakePhoto = async () => {
    try {
      const res = (await takePhoto({ quality: 0.7 })) as PickResult;
      accept(res, `resume-${Date.now()}.jpg`);
    } catch (e) {
      console.error('[capture] camera failed', e);
      setError("Couldn't open the camera. Please try again.");
    }
  };

  const onChooseFile = async () => {
    try {
      const res = (await pickDocument({ type: RESUME_MIME_TYPES })) as PickResult;
      accept(res, `resume-${Date.now()}`);
    } catch (e) {
      console.error('[capture] picker failed', e);
      setError("Couldn't open the file picker. Please try again.");
    }
  };

  const onUpload = async () => {
    if (busy || !file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await processResume(file, useAi);
      router.push({ pathname: '/capture/review', params: { payload: JSON.stringify(result) } });
    } catch (e) {
      console.error('[capture] upload failed', e);
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSkip = () => {
    if (isNavigating || busy) return;
    setIsNavigating(true);
    try {
      router.push({ pathname: '/capture/review', params: { payload: '' } });
    } finally {
      setIsNavigating(false);
    }
  };

  const Tile = ({
    icon,
    label,
    onPress,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    onPress: () => void;
  }) => (
    <YStack
      flex={1}
      bg="$surface1"
      rounded="$4"
      p="$4"
      gap="$2"
      items="center"
      justify="center"
      minH={120}
      role="button"
      aria-label={label}
      aria-disabled={busy}
      onPress={busy ? undefined : onPress}
      pressStyle={{ scale: 0.98 }}
    >
      <Ionicons name={icon} size={32} color={theme.accentBase} />
      <Text fontSize="$4" fontWeight="600" color="$text0">
        {label}
      </Text>
    </YStack>
  );

  return (
    <YStack flex={1} bg="$surface0">
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={{ flex: 0 }}>
        <Hero title="Add a candidate" subtitle="Snap or upload a resume — AI can fill in the details" />
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <XStack gap="$3">
          <Tile icon="camera-outline" label="Take photo" onPress={onTakePhoto} />
          <Tile icon="document-attach-outline" label="Choose file" onPress={onChooseFile} />
        </XStack>

        {file && (
          <XStack bg="$surface1" rounded="$3" p="$3" gap="$3" items="center">
            <Ionicons name="document-text-outline" size={24} color={theme.accentBase} />
            <YStack flex={1}>
              <Text fontSize="$3" fontWeight="600" color="$text0" numberOfLines={1}>
                {file.name}
              </Text>
              {!!formatSize(file.size) && (
                <Text fontSize="$2" color="$text2">
                  {formatSize(file.size)}
                </Text>
              )}
            </YStack>
            <Button
              size="$3"
              chromeless
              aria-label="Remove file"
              disabled={busy}
              onPress={() => setFile(null)}
              icon={<Ionicons name="close" size={20} color={theme.accentBase} />}
            />
          </XStack>
        )}

        <XStack bg="$surface1" rounded="$3" p="$3" gap="$3" items="center">
          <YStack flex={1} gap="$1">
            <Text fontSize="$4" fontWeight="600" color="$text0">
              Auto-fill with AI
            </Text>
            <Text fontSize="$2" color="$text2">
              Uses AI credits. If unavailable, you can enter details manually.
            </Text>
          </YStack>
          <Switch checked={useAi} onCheckedChange={setUseAi} disabled={busy} aria-label="Auto-fill with AI">
            <Switch.Thumb />
          </Switch>
        </XStack>

        {error && (
          <XStack bg="$surface1" rounded="$3" p="$3" gap="$2" items="center">
            <Ionicons name="alert-circle" size={20} color={theme.accentBase} />
            <Text flex={1} fontSize="$3" color="$text0">
              {error}
            </Text>
            {file && !busy && (
              <Button size="$3" onPress={onUpload}>
                <Button.Text>Retry</Button.Text>
              </Button>
            )}
          </XStack>
        )}
      </ScrollView>

      <BottomActionBar>
        {!file && (
          <Text fontSize="$2" color="$text2" text="center">
            Take a photo or choose a file to continue
          </Text>
        )}
        <Button theme="blue" disabled={!file || busy} opacity={!file || busy ? 0.6 : 1} onPress={onUpload}>
          <Button.Text>
            {busy ? (useAi ? 'Uploading & reading with AI…' : 'Uploading…') : 'Upload & continue'}
          </Button.Text>
        </Button>
        <Button chromeless disabled={busy} onPress={onSkip}>
          <Button.Text color="$text2">Skip — enter details manually</Button.Text>
        </Button>
      </BottomActionBar>
    </YStack>
  );
}
