import { createDarkTheme, createLightTheme, type BrandVariants, type Theme } from '@fluentui/react-components';

// Power Platform AI Solution brand ramp, centred on indigo #4F46E5 (shade 80)
const brand: BrandVariants = {
  10: '#05041A',
  20: '#110E33',
  30: '#1B1650',
  40: '#231C6A',
  50: '#2B2284',
  60: '#33289E',
  70: '#3D31C1',
  80: '#4F46E5',
  90: '#625BEA',
  100: '#7570EE',
  110: '#8884F1',
  120: '#9B98F4',
  130: '#AEACF7',
  140: '#C1C0F9',
  150: '#D4D3FB',
  160: '#E8E7FD',
};

const base = {
  fontFamilyBase: "'Segoe UI Variable Text', 'Segoe UI', system-ui, -apple-system, sans-serif",
  borderRadiusMedium: '8px',
  borderRadiusLarge: '12px',
  borderRadiusXLarge: '16px',
};

export const lightTheme: Theme = {
  ...createLightTheme(brand),
  ...base,
  colorNeutralBackground1: '#FFFFFF',
  colorNeutralBackground2: '#F6F7FB',
};

export const darkTheme: Theme = {
  ...createDarkTheme(brand),
  ...base,
  // Deep navy canvas; surfaces are translucent glass on top of it
  colorNeutralBackground1: 'rgba(22, 24, 41, 0.72)',
  colorNeutralBackground2: '#0B0D17',
  colorNeutralBackground3: 'rgba(255, 255, 255, 0.04)',
  colorNeutralBackground1Hover: 'rgba(255, 255, 255, 0.06)',
  colorNeutralBackground1Pressed: 'rgba(255, 255, 255, 0.09)',
  colorNeutralStroke1: 'rgba(255, 255, 255, 0.14)',
  colorNeutralStroke2: 'rgba(255, 255, 255, 0.09)',
  colorNeutralStroke3: 'rgba(255, 255, 255, 0.06)',
  colorBrandForeground1: '#A5A2F7',
  colorBrandForeground2: '#C1C0F9',
  colorBrandBackground: '#5B52F0',
  colorBrandBackgroundHover: '#6B63F3',
  colorBrandBackgroundPressed: '#4F46E5',
  colorNeutralForeground2: '#C7CBE0',
  colorNeutralForeground3: '#8E93B0',
};
