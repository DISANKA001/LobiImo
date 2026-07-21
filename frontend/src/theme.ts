/**
 * Lobilmo design tokens — Navy blue + White palette.
 * Typography scaled DOWN for compact mobile screens.
 */
export const colors = {
  surface: "#FFFFFF",
  onSurface: "#0F172A",
  surfaceSecondary: "#F4F6FA",
  onSurfaceSecondary: "#3B4A63",
  surfaceTertiary: "#E5EBF3",
  onSurfaceTertiary: "#4B5B75",
  surfaceInverse: "#0B2447",
  onSurfaceInverse: "#FFFFFF",

  // Navy blue primary
  brand: "#0B2447",
  brandPrimary: "#0B2447",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#19376D",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E3ECFA",
  onBrandTertiary: "#0B2447",

  // Gold accent to echo the logo
  accent: "#C9A24B",
  onAccent: "#FFFFFF",

  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#2563EB",

  border: "#E2E7F0",
  borderStrong: "#C7D0DE",
  divider: "#EEF1F6",
  muted: "#6B7891",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 18,
  pill: 999,
};

/**
 * Compact type scale — sized for phones.
 * Previous scale ran too large on 390-wide devices.
 */
export const typography = {
  xs: 10,
  sm: 11,
  base: 13,
  lg: 15,
  xl: 17,
  xxl: 20,
  display: 24,
};

export const shadow = {
  card: {
    shadowColor: "#0B2447",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
};
