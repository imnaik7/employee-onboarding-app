import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  PowerAppsProvider,
  lightTheme as hostLightTheme,
  darkTheme as hostDarkTheme,
  type ThemeTokens,
} from '@microsoft/power-apps-native-host';
import { tokens as brand } from '../brand/tokens';

import appConfig from '../app.json';
import authConfig from '../auth.config.json';
import tamaguiConfig from '../tamagui.config';
// @ts-ignore - power.config.json is auto-generated at build time
import powerConfig from '../power.config.json';
// @ts-ignore - connectorSchemas is auto-generated at build time
import { schemaMap } from '../src/generated/connectorSchemas';

declare const require: (id: string) => unknown;
function isMissingOfflineProfile(error: unknown): boolean {
  return error instanceof Error && (
    error.message === "Cannot find module '../offline-profile.json'" ||
    error.message === 'Cannot find module'
  );
}

let offlineProfile: Record<string, unknown> | undefined;
try {
  offlineProfile = require('../offline-profile.json') as Record<string, unknown>;
} catch (error: unknown) {
  if (!isMissingOfflineProfile(error)) throw error;
  offlineProfile = undefined;
}

// Power Platform AI Solution brand over the host's default palettes
const brandedLightTheme: ThemeTokens = {
  ...hostLightTheme,
  accentDeep: brand.color.primaryDeep,
  accentBase: brand.color.primary,
  accentSoft: brand.color.accent,
  accentOnAccent: brand.color.onPrimary,
  surface0: brand.color.bg,
  surface1: brand.color.surface,
  surface3: brand.color.border,
  text0: brand.color.text,
  text1: brand.color.textMuted,
};
const brandedDarkTheme: ThemeTokens = {
  ...hostDarkTheme,
  accentDeep: '#6366F1',
  accentBase: '#818CF8',
  accentSoft: '#312E81',
  accentOnAccent: '#FFFFFF',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <PowerAppsProvider
        appConfig={appConfig}
        msalConfig={authConfig.msal}
        powerConfig={powerConfig}
        schemaMap={schemaMap}
        tamaguiConfig={tamaguiConfig}
        offlineProfile={offlineProfile}
        defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}
        theme={brandedLightTheme}
        darkTheme={brandedDarkTheme}
      >
        <StatusBar style="auto" />
        <Slot />
      </PowerAppsProvider>
    </SafeAreaProvider>
  );
}
