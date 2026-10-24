import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fakeDb } from './fakeSupabase'
import { seedDemo } from '../services/demo'
import { loadUserData } from '../services/session'
import { currentSavings } from '../services/money'
import { useEventsStore } from '../stores/events'
import { useGigsStore } from '../stores/gigs'
import { useHabitsStore } from '../stores/habits'
import { useMoneyStore } from '../stores/money'
import { useRecurringStore } from '../stores/recurring'
import { useSettingsStore } from '../stores/settings'
import { useTasksStore } from '../stores/tasks'

vi.mock('@/services/supabase', () => import('./fakeSupabase'))

describe('demo data', () => {
  beforeEach(async () => {
    localStorage.clear()
    fakeDb.reset('demo-user')
    setActivePinia(createPinia())
    await loadUserData('demo-user')
  })

  it('fills every page, with the sync rules applied', async () => {
    const today = '2026-10-25'
    await seedDemo(today)

    const todays = useTasksStore().occurrencesOn(today)
    expect(todays.length).toBeGreaterThanOrEqual(5)
    expect(todays.filter((o) => o.done)).toHaveLength(3)
    expect(useHabitsStore().items).toHaveLength(5)
    expect(useGigsStore().items).toHaveLength(3)
    // rule 1: gig dates on the calendar; rule 4: the paid gig's income
    expect(useEventsStore().items.some((e) => e.source === 'gig')).toBe(true)
    expect(useMoneyStore().items.some((t) => t.gig_id)).toBe(true)
    expect(useRecurringStore().items).toHaveLength(3)
    expect(currentSavings(useSettingsStore().row, useMoneyStore().items)).toBeGreaterThan(120000)
  })
})
