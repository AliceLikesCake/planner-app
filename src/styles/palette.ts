// Hex values of the palette in tokens.css, for code that has to compute colors (the cake's
// gradients). Components should use the CSS variables instead.
import type { PaletteKey } from '@/types/db'

export const PALETTE_KEYS: PaletteKey[] = [
  'blue',
  'lav',
  'green',
  'peach',
  'butter',
  'rose',
  'mint',
  'pink',
  'sand',
]

/** Cake layer tones (SPEC 3.1), one step deeper than each fill: --cake-* in tokens.css. */
export const CAKE_TONES: Record<PaletteKey, string> = {
  blue: '#BCCDE6',
  lav: '#D5C8EA',
  green: '#C6DBB6',
  butter: '#F0DE9F',
  rose: '#EFC1C1',
  peach: '#F3CDB8',
  mint: '#BCE0D6',
  pink: '#EFC6D9',
  sand: '#D9D2C7',
}

export function isPaletteKey(value: unknown): value is PaletteKey {
  return typeof value === 'string' && (PALETTE_KEYS as string[]).includes(value)
}

/** CSS custom properties that point --c-fill / --c-text / --c-deep at one palette color. */
export function paletteVars(color: PaletteKey | string | null | undefined) {
  const key = isPaletteKey(color) ? color : 'sand'
  return {
    '--c-fill': `var(--${key}-fill)`,
    '--c-text': `var(--${key}-text)`,
    '--c-deep': `var(--${key}-deep)`,
  }
}

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) =>
    Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t)
  return '#' + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)
}
