// ShipBroker design tokens — ported from the Claude Design handoff (ds.css §2).
// Friendly fintech-meets-logistics: white surfaces, soft rounded cards, mint→teal brand.

export const colors = {
  brandMint: '#00D9A3',
  brandTeal: '#00B4C4',

  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F6F8',
  border: '#E4E8EC',
  textPrimary: '#14181F',
  textSecondary: '#6B7280',
  textTertiary: '#9AA3AD',

  success: '#00C896',
  warning: '#F5A623',
  error: '#FF4D4F',
  info: '#2D7FF9',
  ratingGold: '#FFB400',

  modeAir: '#2D7FF9',
  modeRoad: '#F5A623',
  modeSea: '#00B4C4',

  // dark hero ink colors
  sendInk: '#2A2E8F',
  carryInk: '#00875E',
} as const;

// Gradient stop arrays for expo-linear-gradient.
export const gradients = {
  brand: ['#00D9A3', '#00B4C4'] as const, // 135deg
  send: ['#2A2E8F', '#4453C9', '#5B6BE0'] as const, // 160deg
  carry: ['#00B07A', '#00C9A0', '#1FD6B2'] as const, // 160deg
};

export const radius = {
  card: 16,
  input: 12,
  pill: 999,
  sheet: 24,
} as const;

export const shadow = {
  // iOS shadow + Android elevation, tuned to the web --shadow-card.
  card: {
    shadowColor: '#14181F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  sheet: {
    shadowColor: '#14181F',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 16,
  },
  pop: {
    shadowColor: '#14181F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 12,
  },
} as const;

// Font families (loaded in App.tsx via @expo-google-fonts).
export const fonts = {
  // Latin — Plus Jakarta Sans
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  // Arabic — IBM Plex Sans Arabic
  arRegular: 'IBMPlexSansArabic_400Regular',
  arMedium: 'IBMPlexSansArabic_500Medium',
  arSemibold: 'IBMPlexSansArabic_600SemiBold',
  arBold: 'IBMPlexSansArabic_700Bold',
} as const;

// Resolve a Latin font weight to the matching Arabic face when in RTL.
export function fontFor(family: string, isRTL: boolean): string {
  if (!isRTL) return family;
  switch (family) {
    case fonts.regular:
    case fonts.medium:
      return fonts.arRegular;
    case fonts.semibold:
      return fonts.arSemibold;
    case fonts.bold:
    case fonts.extrabold:
      return fonts.arBold;
    default:
      return fonts.arRegular;
  }
}

export type ModeKey = 'air' | 'road' | 'sea';
export const modeColor: Record<ModeKey, string> = {
  air: colors.modeAir,
  road: colors.modeRoad,
  sea: colors.modeSea,
};
