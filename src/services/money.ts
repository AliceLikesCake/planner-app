import { i18n } from '@/i18n'
import { addDays, toKey, type DateKey } from './dates'
import type { TransactionRow } from '@/types/db'

/** Whole New Taiwan dollars in the current language: "$12,000" (zh-TW) / "NT$12,000" (en). */
export function formatMoney(amount: number, locale = i18n.global.locale.value): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** "+38,500" / "−18,230" (a real minus sign), as on the Money page. */
export function formatSigned(amount: number, locale = i18n.global.locale.value): string {
  const digits = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    Math.abs(amount),
  )
  return `${amount < 0 ? '−' : '+'}${digits}`
}

export interface Period {
  /** Calendar month the period is named after (its first day's month). */
  year: number
  monthIndex: number
  start: DateKey
  /** Last day, inclusive. */
  end: DateKey
}

/**
 * A budget month starting on settings.month_start_day (1st, or payday the 5th): with the 5th,
 * "October" runs Oct 5 – Nov 4.
 */
export function periodOf(year: number, monthIndex: number, startDay = 1): Period {
  const start = toKey(new Date(year, monthIndex, startDay))
  const end = addDays(toKey(new Date(year, monthIndex + 1, startDay)), -1)
  const first = new Date(year, monthIndex, 1)
  return { year: first.getFullYear(), monthIndex: first.getMonth(), start, end }
}

/** The period that contains `day`. */
export function periodContaining(day: DateKey, startDay = 1): Period {
  const [y, m, d] = day.split('-').map(Number)
  const monthIndex = d! < startDay ? m! - 2 : m! - 1
  return periodOf(y!, monthIndex, startDay)
}

export interface CategoryTotal {
  categoryId: string | null
  amount: number
  /** Share of the type's total, 0–100. */
  pct: number
}

/** Income and spending totals of a period, and each category's share, largest first. */
export function summarize(entries: TransactionRow[], period: Period) {
  const inPeriod = entries.filter((t) => t.date >= period.start && t.date <= period.end)
  const totals = { income: 0, expense: 0 }
  const byCategory = {
    income: new Map<string | null, number>(),
    expense: new Map<string | null, number>(),
  }
  for (const t of inPeriod) {
    totals[t.type] += t.amount
    const map = byCategory[t.type]
    map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount)
  }
  const rank = (type: 'income' | 'expense'): CategoryTotal[] =>
    [...byCategory[type].entries()]
      .map(([categoryId, amount]) => ({
        categoryId,
        amount,
        pct: totals[type] ? (amount / totals[type]) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  return {
    entries: inPeriod,
    income: totals.income,
    expense: totals.expense,
    balance: totals.income - totals.expense,
    expenseByCategory: rank('expense'),
    incomeByCategory: rank('income'),
  }
}

type SavingsSettings = {
  savings_amount?: number | null
  savings_date?: string | null
  savings_set_at?: string | null
}

/** Entries that count toward 目前存款: dated on or after the savings date. */
export function entriesSinceSavings(
  settings: SavingsSettings | null | undefined,
  entries: TransactionRow[],
) {
  const since = settings?.savings_date
  if (since) return entries.filter((tx) => tx.date >= since)
  // Saved before the date existed: count what was recorded after the amount was entered.
  const setAt = settings?.savings_set_at ? Date.parse(settings.savings_set_at) : NaN
  return Number.isNaN(setAt) ? [] : entries.filter((tx) => Date.parse(tx.created_at) > setAt)
}

/** Net of entries: income added, spending taken off. */
export function netOf(entries: TransactionRow[]) {
  return entries.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0)
}

/**
 * 目前存款 (DECISIONS 44): the amount entered for the start of a day, plus every income and
 * minus every spending dated that day or later. Null when the feature isn't used.
 */
export function currentSavings(
  settings: SavingsSettings | null | undefined,
  entries: TransactionRow[],
): number | null {
  // `== null` also covers a database that doesn't have these columns yet (undefined).
  if (settings?.savings_amount == null) return null
  if (!settings.savings_date && !settings.savings_set_at) return null
  return settings.savings_amount + netOf(entriesSinceSavings(settings, entries))
}
