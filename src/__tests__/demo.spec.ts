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
import { useAuthStore } from '../stores/auth'
import { i18n } from '../i18n'

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

  it('runs in English and puts the language back on leaving', async () => {
    const settings = useSettingsStore()
    await settings.setLang('zh-TW')
    const auth = useAuthStore()

    await auth.startDemo()
    expect(auth.status).toBe('ready')
    expect(i18n.global.locale.value).toBe('en')
    expect(useHabitsStore().items[0]?.name).toBe('Water')

    auth.leaveDemo()
    expect(i18n.global.locale.value).toBe('zh-TW')
  })
})
