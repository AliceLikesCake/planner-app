import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fakeDb } from './fakeSupabase'
import { DEFAULT_CATEGORIES } from '../services/defaults'
import { clearUserData, loadUserData } from '../services/session'
import { useSettingsStore } from '../stores/settings'
import { useCategoriesStore } from '../stores/categories'
import { useTasksStore } from '../stores/tasks'
import { useHabitsStore } from '../stores/habits'

vi.mock('@/services/supabase', () => import('./fakeSupabase'))

const PALETTE = ['blue', 'lav', 'green', 'peach', 'butter', 'rose', 'mint', 'pink', 'sand']

beforeEach(() => {
  localStorage.clear()
  fakeDb.reset('user-1')
  setActivePinia(createPinia())
})

describe('default categories', () => {
  it('match the spec: 5 task, 6 event, 8 expense, 3 income', () => {
    const count = (type: string) => DEFAULT_CATEGORIES.filter((c) => c.type === type).length
    expect([count('task'), count('event'), count('expense'), count('income')]).toEqual([5, 6, 8, 3])
  })

  it('have unique keys per type, both names and a palette color', () => {
    const ids = DEFAULT_CATEGORIES.map((c) => `${c.type}:${c.key}`)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of DEFAULT_CATEGORIES) {
      expect(c.name_zh).toBeTruthy()
      expect(c.name_en).toBeTruthy()
      expect(PALETTE).toContain(c.color)
    }
  })
})

describe('first sign-in', () => {
  it('creates settings with the current language and seeds categories', async () => {
    useSettingsStore().setLang('en')
    await loadUserData('user-1')

    expect(fakeDb.rows('settings')).toHaveLength(1)
    expect(useSettingsStore().row?.lang).toBe('en')
    expect(fakeDb.rows('categories')).toHaveLength(DEFAULT_CATEGORIES.length)
    expect(
      useCategoriesStore()
        .ofType('task')
        .map((c) => c.key),
    ).toEqual(['work', 'gig', 'study', 'life', 'health'])
  })

  it('does not seed again on later sign-ins', async () => {
    await loadUserData('user-1')
    clearUserData()
    await loadUserData('user-1')
    expect(fakeDb.rows('categories')).toHaveLength(DEFAULT_CATEGORIES.length)
  })

  it('finishes an interrupted setup without duplicating categories', async () => {
    await loadUserData('user-1')
    fakeDb.tables.settings = []
    await loadUserData('user-1')
    expect(fakeDb.rows('settings')).toHaveLength(1)
    expect(fakeDb.rows('categories')).toHaveLength(DEFAULT_CATEGORIES.length)
  })

  it('restores the saved language from settings', async () => {
    await loadUserData('user-1')
    await useSettingsStore().setLang('zh-TW')

    // A fresh device: nothing in localStorage, and jsdom's navigator.language is en-US.
    setActivePinia(createPinia())
    localStorage.clear()
    expect(useSettingsStore().lang).toBe('en')
    await loadUserData('user-1')
    expect(useSettingsStore().lang).toBe('zh-TW')
  })
})

describe('accounts are separate', () => {
  it('another user sees none of the first user’s rows', async () => {
    await loadUserData('user-1')
    await useTasksStore().add({ title: 'Write post', date: '2026-10-24' })

    clearUserData()
    fakeDb.userId = 'user-2'
    await loadUserData('user-2')

    expect(useTasksStore().items).toHaveLength(0)
    expect(useCategoriesStore().items).toHaveLength(DEFAULT_CATEGORIES.length)
    expect(fakeDb.rows('categories')).toHaveLength(DEFAULT_CATEGORIES.length * 2)
  })
})

describe('table stores', () => {
  it('add, update and remove keep the store and database in step', async () => {
    await loadUserData('user-1')
    const tasks = useTasksStore()

    const task = await tasks.add({ title: 'Buy milk', date: '2026-10-24' })
    expect(task.user_id).toBe('user-1')
    expect(tasks.items).toHaveLength(1)

    await tasks.update(task.id, { done: true })
    expect(tasks.items[0]?.done).toBe(true)
    expect(fakeDb.rows('tasks')[0]?.done).toBe(true)

    await tasks.remove(task.id)
    expect(tasks.items).toHaveLength(0)
    expect(fakeDb.rows('tasks')).toHaveLength(0)
  })

  it('habit logs mark and clear a day', async () => {
    await loadUserData('user-1')
    const habits = useHabitsStore()
    const habit = await habits.add({ name: 'Water' })

    await habits.setDone(habit.id, '2026-10-24', true)
    await habits.setDone(habit.id, '2026-10-24', true)
    expect(habits.isDone(habit.id, '2026-10-24')).toBe(true)
    expect(fakeDb.rows('habit_logs')).toHaveLength(1)

    await habits.setDone(habit.id, '2026-10-24', false)
    expect(habits.isDone(habit.id, '2026-10-24')).toBe(false)
    expect(fakeDb.rows('habit_logs')).toHaveLength(0)
  })
})
