/**
 * Parse a hex color string (#RGB, #RRGGBB) into { r, g, b } components (0–255).
 * Input validation: returns null for malformed strings.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-f]{3,8})$/i.exec(hex)
  if (!m) return null
  let h = m[1]
  // Expand #RGB → #RRGGBB
  if (h.length === 3 || h.length === 4) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return null
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}
