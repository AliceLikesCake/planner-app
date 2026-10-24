import type { CategoryType, PaletteKey } from '@/types/db'

export interface DefaultCategory {
  type: CategoryType
  key: string
  name_zh: string
  name_en: string
  color: PaletteKey
}

function group(type: CategoryType, rows: [string, string, string, PaletteKey][]) {
  return rows.map(([key, name_zh, name_en, color]) => ({ type, key, name_zh, name_en, color }))
}

// SPEC 3.1 (tasks, events) and 4.5 (money); money colors from design/mockups/SetCategories.dc.html.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  ...group('task', [
    ['work', '工作', 'Work', 'blue'],
    ['gig', '接案', 'Gigs', 'lav'],
    ['study', '學習', 'Study', 'green'],
    ['life', '生活', 'Life', 'butter'],
    ['health', '健康', 'Health', 'rose'],
  ]),
  ...group('event', [
    ['work', '工作', 'Work', 'blue'],
    ['gig', '接案', 'Gigs', 'lav'],
    ['date', '約會聚餐', 'Dates & meals', 'butter'],
    ['travel', '旅行', 'Travel', 'mint'],
    ['study', '學習', 'Study', 'green'],
    ['health', '健康', 'Health', 'rose'],
  ]),
  ...group('expense', [
    ['food', '餐飲', 'Food', 'peach'],
    ['shop', '購物', 'Shopping', 'lav'],
    ['life', '生活', 'Life', 'butter'],
    ['transit', '交通', 'Transit', 'blue'],
    ['fun', '娛樂', 'Fun', 'green'],
    ['medical', '醫療', 'Medical', 'rose'],
    ['subscription', '訂閱', 'Subscriptions', 'pink'],
    ['other', '其他', 'Other', 'sand'],
  ]),
  ...group('income', [
    ['salary', '薪資', 'Salary', 'mint'],
    ['gig', '接案', 'Gigs', 'lav'],
    ['other', '其他', 'Other', 'sand'],
  ]),
]

/** Rows to insert for a new user, with `sort` following the order above within each type. */
export function defaultCategoryRows(userId: string) {
  const counters: Partial<Record<CategoryType, number>> = {}
  return DEFAULT_CATEGORIES.map((c) => {
    const sort = counters[c.type] ?? 0
    counters[c.type] = sort + 1
    return { ...c, user_id: userId, sort }
  })
}
