import { createPowerAppsTamaguiConfig } from '@microsoft/power-apps-native-host/config/tamaguiConfig';

// CUSTOMIZATION START - DO NOT REMOVE OR RENAME THE COMMENT
// Power Platform AI Solution brand applied over the host's semantic aliases
// ($surface*, $accent*, $text*, $status*) so every screen uses brand colors.
import { defaultConfig } from '@tamagui/config/v5';
import { withPowerAppsSemanticAliases } from '@microsoft/power-apps-native-host/config/tamaguiConfig';
import { tokens as brand } from './brand/tokens';

const customConfig = {
  themes: {
    ...defaultConfig.themes,
    light: withPowerAppsSemanticAliases(defaultConfig.themes.light, brand.color),
    // Dark keeps the host's dark surfaces/text; only accents + status carry over
    dark: withPowerAppsSemanticAliases(defaultConfig.themes.dark, {
      primary: '#818CF8',
      accent: '#312E81',
      onPrimary: '#FFFFFF',
      statusSuccess: '#4ADE80',
      statusWarning: '#FBBF24',
      statusDanger: '#F87171',
      statusInfo: '#A5B4FC',
    }),
  },
};
// CUSTOMIZATION END - DO NOT REMOVE OR RENAME THE COMMENT

export const tamaguiConfig = createPowerAppsTamaguiConfig(customConfig);
export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
