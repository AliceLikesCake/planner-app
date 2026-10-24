import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fakeDb } from './fakeSupabase'
import { dueDates, nextDate, occurrence, upcomingDates } from '../services/recurring'
import { loadUserData } from '../services/session'
import {
  createRecurring,
  deleteRecurring,
  generateRecurring,
  makeEntryRecurring,
  recordTransaction,
  updateRecurring,
} from '../services/sync'
import { useMoneyStore } from '../stores/money'
import { useRecurringStore } from '../stores/recurring'

vi.mock('@/services/supabase', () => import('./fakeSupabase'))

describe('recurring schedule', () => {
  it('monthly on the same day, the last day in shorter months', () => {
    const rule = { frequency: 'month' as const, start_date: '2026-01-31' }
    expect([0, 1, 2, 3].map((k) => occurrence(rule, k))).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
  })

  it('yearly on the same date, Feb 29 on Feb 28 in other years', () => {
    const rule = { frequency: 'year' as const, start_date: '2028-02-29' }
    expect([0, 1, 4].map((k) => occurrence(rule, k))).toEqual([
      '2028-02-29',
      '2029-02-28',
      '2032-02-29',
    ])
  })

  it('due dates are those up to today not recorded yet', () => {
    const rule = { frequency: 'month' as const, start_date: '2026-08-15', last_date: '2026-08-15' }
    expect(dueDates(rule, '2026-10-24')).toEqual(['2026-09-15', '2026-10-15'])
    expect(dueDates({ ...rule, last_date: '2026-10-15' }, '2026-10-24')).toEqual([])
    expect(nextDate(rule, '2026-10-24')).toBe('2026-11-15')
  })

  it('upcoming dates in a period are the ones after today', () => {
    const rule = { frequency: 'month' as const, start_date: '2026-08-24', last_date: '2026-10-24' }
    expect(upcomingDates(rule, '2026-10-01', '2026-10-31', '2026-10-24')).toEqual([])
    expect(upcomingDates(rule, '2026-11-01', '2026-11-30', '2026-10-24')).toEqual(['2026-11-24'])
    const late = { frequency: 'month' as const, start_date: '2026-09-30', last_date: '2026-09-30' }
    expect(upcomingDates(late, '2026-10-01', '2026-10-31', '2026-10-24')).toEqual(['2026-10-30'])
  })
})

describe('固定收支', () => {
  beforeEach(async () => {
    localStorage.clear()
    fakeDb.reset('user-1')
    setActivePinia(createPinia())
    await loadUserData('user-1')
  })

  const entries = () =>
    useMoneyStore()
      .items.map((t) => [t.date, t.amount, !!t.recurring_id])
      .sort()

  it('records the first one now when it is due, and nothing early', async () => {
    await createRecurring(
      {
        type: 'expense',
        amount: 390,
        note: 'Netflix',
        frequency: 'month',
        start_date: '2026-10-15',
      },
      '2026-10-24',
    )
    await createRecurring(
      { type: 'expense', amount: 9800, note: 'Rent', frequency: 'month', start_date: '2026-11-01' },
      '2026-10-24',
    )
    expect(entries()).toEqual([['2026-10-15', 390, true]])
  })

  it('catches up on every month since the start, once', async () => {
    await createRecurring(
      { type: 'income', amount: 33500, frequency: 'month', start_date: '2026-08-31' },
      '2026-10-24',
    )
    expect(entries().map((e) => e[0])).toEqual(['2026-08-31', '2026-09-30'])

    await generateRecurring('2026-10-24')
    await generateRecurring('2026-10-31')
    expect(entries().map((e) => e[0])).toEqual(['2026-08-31', '2026-09-30', '2026-10-31'])
  })

  it('a deleted occurrence is not recorded again', async () => {
    await createRecurring(
      { type: 'expense', amount: 390, frequency: 'month', start_date: '2026-10-15' },
      '2026-10-24',
    )
    const money = useMoneyStore()
    await money.remove(money.items[0]!.id)
    await generateRecurring('2026-10-24')
    expect(money.items).toHaveLength(0)
  })

  it('an existing entry can become the first of a rule', async () => {
    const tx = await recordTransaction({ type: 'expense', amount: 1200, date: '2026-09-02' })
    const rule = await makeEntryRecurring(tx, 'month')
    await generateRecurring('2026-10-24')
    expect(entries()).toEqual([
      ['2026-09-02', 1200, true],
      ['2026-10-02', 1200, true],
    ])
    expect(useRecurringStore().items[0]!.id).toBe(rule.id)
  })

  it('changing the rule affects later entries only; stopping keeps the past', async () => {
    const rule = await createRecurring(
      { type: 'expense', amount: 390, frequency: 'month', start_date: '2026-09-15' },
      '2026-10-24',
    )
    await updateRecurring(rule.id, { amount: 420 }, '2026-10-24')
    await generateRecurring('2026-11-20')
    expect(entries().map((e) => e[1])).toEqual([390, 390, 420])

    await deleteRecurring(rule.id)
    await generateRecurring('2026-12-20')
    expect(useMoneyStore().items).toHaveLength(3)
    expect(useMoneyStore().items.every((t) => t.recurring_id === null)).toBe(true)
  })
})
