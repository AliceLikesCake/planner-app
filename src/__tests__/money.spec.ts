import { describe, it, expect } from 'vitest'
import {
  currentSavings,
  formatSigned,
  periodContaining,
  periodOf,
  summarize,
} from '../services/money'
import type { TransactionRow } from '../types/db'

const tx = (
  type: 'income' | 'expense',
  amount: number,
  date: string,
  category_id: string,
): TransactionRow => ({
  id: `${type}-${amount}-${date}`,
  user_id: 'u',
  type,
  amount,
  date,
  category_id,
  note: null,
  gig_id: null,
  recurring_id: null,
  created_at: '',
})

describe('budget periods', () => {
  it('a calendar month when it starts on the 1st', () => {
    expect(periodOf(2026, 9, 1)).toMatchObject({ start: '2026-10-01', end: '2026-10-31' })
    expect(periodOf(2026, 1, 1)).toMatchObject({ start: '2026-02-01', end: '2026-02-28' })
  })

  it('payday on the 5th: Oct 5 – Nov 4, and early days belong to the month before', () => {
    expect(periodOf(2026, 9, 5)).toMatchObject({
      start: '2026-10-05',
      end: '2026-11-04',
      monthIndex: 9,
    })
    expect(periodContaining('2026-10-03', 5)).toMatchObject({ start: '2026-09-05', monthIndex: 8 })
    expect(periodContaining('2026-01-02', 5)).toMatchObject({ start: '2025-12-05', year: 2025 })
  })
})

describe('summarize', () => {
  it('totals the period and ranks categories, largest first', () => {
    const s = summarize(
      [
        tx('expense', 150, '2026-10-22', 'food'),
        tx('expense', 620, '2026-10-20', 'life'),
        tx('expense', 180, '2026-10-19', 'food'),
        tx('income', 5000, '2026-10-20', 'gig'),
        tx('expense', 999, '2026-09-30', 'food'),
      ],
      periodOf(2026, 9, 1),
    )
    expect([s.income, s.expense, s.balance]).toEqual([5000, 950, 4050])
    expect(s.expenseByCategory.map((c) => [c.categoryId, c.amount])).toEqual([
      ['life', 620],
      ['food', 330],
    ])
    expect(Math.round(s.expenseByCategory[0]!.pct)).toBe(65)
    expect(s.entries).toHaveLength(4)
  })
})

describe('formatSigned', () => {
  it('uses a real minus sign and thousands separators', () => {
    expect(formatSigned(38500, 'zh-TW')).toBe('+38,500')
    expect(formatSigned(-18230, 'en')).toBe('−18,230')
  })
})

describe('currentSavings', () => {
  const at = (
    date: string,
    type: 'income' | 'expense',
    amount: number,
    recorded = `${date}T09:00:00Z`,
  ) => ({
    ...tx(type, amount, date, 'x'),
    id: `${date}-${amount}`,
    created_at: recorded,
  })

  it('is off until an amount is entered', () => {
    expect(currentSavings(null, [])).toBeNull()
    expect(currentSavings({ savings_amount: null, savings_date: null }, [])).toBeNull()
    expect(currentSavings({}, [])).toBeNull() // columns not added to the database yet
  })

  it('adds every entry dated on or after the start day, whenever it was recorded', () => {
    const settings = { savings_amount: 150000, savings_date: '2026-10-01' }
    const entries = [
      at('2026-09-30', 'expense', 999), // before the start day
      at('2026-10-01', 'expense', 55), // on the start day
      at('2026-10-03', 'expense', 150, '2026-10-24T09:00:00Z'), // logged late, still counts
      at('2026-10-20', 'income', 3150),
    ]
    expect(currentSavings(settings, entries)).toBe(150000 - 55 - 150 + 3150)
  })

  it('falls back to entries recorded after it was set when there is no start day', () => {
    const settings = { savings_amount: 1000, savings_set_at: '2026-10-20T12:00:00Z' }
    const entries = [at('2026-10-19', 'expense', 10), at('2026-10-21', 'income', 500)]
    expect(currentSavings(settings, entries)).toBe(1500)
  })
})
