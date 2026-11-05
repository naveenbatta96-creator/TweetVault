// Google Material Design 3 (M3) Tonal Palette (Muted, harmonic, zero neon)
export const COLOR_PRESETS = [
  '#a8c7fa', // Google M3 Blue
  '#81c995', // Google M3 Sage Green
  '#fdd663', // Google M3 Soft Amber
  '#f28b82', // Google M3 Coral Peach
  '#78d9ec', // Google M3 Soft Mint
  '#f09d58', // Google M3 Ochre
  '#c5c6d0', // Google M3 Slate Lavender
  '#9aa0a6'  // Google M3 Neutral Slate
]

// Normalizes legacy loud/neon colors from stored items to Google M3 muted tones
export function sanitizeM3Color(hex) {
  if (!hex) return '#a8c7fa'
  const lower = hex.toLowerCase().trim()
  const neonMap = {
    '#ec4899': '#f28b82', // neon hot pink -> M3 soft coral
    '#06b6d4': '#78d9ec', // neon cyan -> M3 soft mint
    '#8b5cf6': '#c5c6d0', // neon electric violet -> M3 slate lavender
    '#3b82f6': '#a8c7fa', // saturated royal blue -> M3 Google Blue
    '#ef4444': '#f28b82', // harsh bright red -> M3 soft coral
    '#f59e0b': '#fdd663', // saturated amber -> M3 soft amber
    '#10b981': '#81c995', // bright emerald -> M3 sage green
    '#38bdf8': '#a8c7fa', // sky blue -> M3 Google Blue
    '#6366f1': '#a8c7fa', // indigo -> M3 Google Blue
    '#a855f7': '#c5c6d0', // purple -> M3 slate
    '#d946ef': '#f28b82', // fuchsia -> M3 soft coral
    '#00ffcc': '#78d9ec', // electric aqua -> M3 mint
    '#ff007f': '#f28b82', // magenta -> M3 coral
    '#2563eb': '#a8c7fa',
    '#1d4ed8': '#a8c7fa',
  }
  return neonMap[lower] || hex
}

