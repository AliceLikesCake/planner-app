// Gig product categories (SPEC 4.4) with their palette color and icon, from
// design/mockups/Collabs.dc.html.
import type { PaletteKey, ProductCategory } from '@/types/db'

export const PRODUCTS: { key: ProductCategory; color: PaletteKey; icon: string }[] = [
  {
    key: 'beauty',
    color: 'rose',
    icon: '<path d="M8.5 21h7v-8h-7z"/><path d="M9.5 13V8.5L14.5 5v8"/>',
  },
  {
    key: 'skin',
    color: 'pink',
    icon: '<rect x="7" y="9" width="10" height="12" rx="3"/><path d="M10 9V6h4v3M11 3.5h3"/>',
  },
  {
    key: 'food',
    color: 'butter',
    icon: '<path d="M5 9h11v4.5a5.5 5.5 0 0 1-11 0z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5v2.5M11 3v3M14 3.5v2.5"/>',
  },
  { key: 'home', color: 'green', icon: '<path d="M4 11l8-6 8 6v8H4zM10 19v-5h4v5"/>' },
  {
    key: 'tech',
    color: 'blue',
    icon: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/>',
  },
  {
    key: 'fashion',
    color: 'lav',
    icon: '<path d="M8.5 4L4 7l2 3.5 2-1V20h8V9.5l2 1L20 7l-4.5-3c-.6 1.5-2 2.5-3.5 2.5S9.1 5.5 8.5 4z"/>',
  },
]

export function product(key: ProductCategory) {
  return PRODUCTS.find((p) => p.key === key) ?? PRODUCTS[0]!
}

/**
 * Colors of a gig's three calendar events, so 交稿 / 上線 / 入帳 can be told apart
 * (DECISIONS 34). The add-gig screen's date dots use the same colors.
 */
export const GIG_EVENT_COLORS: Record<'deliver' | 'live' | 'due', PaletteKey> = {
  deliver: 'lav',
  live: 'blue',
  due: 'mint',
}

/** Step names on the gig card, reused as the calendar label of each gig event. */
export const GIG_EVENT_LABELS = {
  deliver: 'gigs.steps.delivered',
  live: 'gigs.steps.live',
  due: 'gigs.steps.paid',
} as const

/** 合作形式 (SPEC 4.6 with Threads added and 部落格 dropped: DECISIONS 33), stored in gigs.formats. */
export const GIG_FORMATS = ['ig_post', 'ig_reels', 'story', 'threads', 'youtube'] as const

/** Drops formats no longer offered (e.g. an old 'blog'), in the order above. */
export function knownFormats(formats: string[]): string[] {
  return GIG_FORMATS.filter((f) => formats.includes(f))
}
