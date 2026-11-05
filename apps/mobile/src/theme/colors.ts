/**
 * TS mirror of the theme tokens in src/global.css — ONLY for the places
 * NativeWind classes cannot reach: the react-navigation theme, status bar,
 * and native chrome. Components must use token classes (bg-bg, text-text…),
 * never these values directly. Keep in sync with global.css.
 */
export type ThemeScheme = 'dark' | 'light';

export interface ColorTokens {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textMuted: string;
  accent: string;
  /** Sea blue — links, focus rings, listen/speak surfaces (ADR-0009). */
  accent2: string;
  /** Text/icon colour on accent and accent-2 fills. */
  onAccent: string;
  success: string;
  danger: string;
  border: string;
  /** Warm «Сім’я»-track identity (T30) — icons/SVG the class system can't reach. */
  trackWarm: string;
  /** Readiness «с запасом» band (T70). */
  gold: string;
  /** Backdrop/shadow wash base (always used WITH an alpha) — scene layers (T31). */
  scrim: string;
}

export const colors: Record<ThemeScheme, ColorTokens> = {
  dark: {
    bg: '#0A0E16',
    surface: '#121926',
    surface2: '#1A2333',
    text: '#E8E6E3',
    textMuted: '#98A0B3',
    accent: '#E9C032',
    accent2: '#4B85FF',
    onAccent: '#0A0E16',
    success: '#75935E',
    danger: '#CF6E64',
    border: '#253047',
    trackWarm: '#D9A441',
    gold: '#E9C032',
    scrim: '#000000',
  },
  light: {
    bg: '#F7F5F2',
    surface: '#FFFFFF',
    surface2: '#EFECE7',
    text: '#1A1A1F',
    textMuted: '#6B6870',
    accent: '#856600',
    accent2: '#1F56C8',
    onAccent: '#FFFFFF',
    success: '#587246',
    danger: '#96322B',
    border: '#E2DED8',
    trackWarm: '#8B6233',
    gold: '#8A6A00',
    scrim: '#000000',
  },
};
