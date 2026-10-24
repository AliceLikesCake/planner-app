// Quick-add links for iPhone Shortcuts and Wallet automations (DECISIONS 54):
//   /add/money?amount=150&note=7-11&type=expense&category=food
// Every parameter is optional. Apple Pay passes amounts like "NT$1,280.00" or "150.5".

export interface QuickAdd {
  amount?: number
  note?: string
  type?: 'expense' | 'income'
  /** A category key (food, transit, salary…) or name in either language. */
  category?: string
}

type Query = Record<string, unknown>

const text = (v: unknown): string =>
  typeof v === 'string' ? v.trim() : Array.isArray(v) ? text(v[0]) : ''

export function parseQuickAdd(query: Query): QuickAdd {
  const out: QuickAdd = {}
  const raw = text(query.amount).replace(/[^\d.]/g, '')
  const amount = Math.round(Number(raw))
  if (raw && Number.isFinite(amount) && amount > 0) out.amount = amount
  const note = text(query.note)
  if (note) out.note = note.slice(0, 100)
  const type = text(query.type)
  if (type === 'expense' || type === 'income') out.type = type
  const category = text(query.category)
  if (category) out.category = category
  return out
}
