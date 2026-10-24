import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fakeDb } from './fakeSupabase'
import { occursOn } from '../services/repeat'
import { useTasksStore } from '../stores/tasks'

vi.mock('@/services/supabase', () => import('./fakeSupabase'))

describe('occursOn', () => {
  it('one-off tasks only on their date', () => {
    const t = { date: '2026-10-24', repeat: 'none' as const }
    expect(occursOn(t, '2026-10-24')).toBe(true)
    expect(occursOn(t, '2026-10-25')).toBe(false)
  })

  it('daily from the start date on', () => {
    const t = { date: '2026-10-24', repeat: 'day' as const }
    expect(occursOn(t, '2026-10-23')).toBe(false)
    expect(occursOn(t, '2026-10-24')).toBe(true)
    expect(occursOn(t, '2027-01-01')).toBe(true)
  })

  it('weekly on the same weekday', () => {
    const t = { date: '2026-10-24', repeat: 'week' as const } // Saturday
    expect(occursOn(t, '2026-10-31')).toBe(true)
    expect(occursOn(t, '2026-10-30')).toBe(false)
  })

  it('monthly on the same day, or the last day of shorter months', () => {
    const t = { date: '2026-01-31', repeat: 'month' as const }
    expect(occursOn(t, '2026-02-28')).toBe(true)
    expect(occursOn(t, '2026-03-30')).toBe(false)
    expect(occursOn(t, '2026-03-31')).toBe(true)
    expect(occursOn(t, '2026-04-30')).toBe(true)
  })
})

describe('tasks store', () => {
  beforeEach(() => {
    fakeDb.reset('user-1')
    setActivePinia(createPinia())
  })

  it('lists a day by time, untimed last', async () => {
    const tasks = useTasksStore()
    await tasks.add({ title: 'untimed', date: '2026-10-24' })
    await tasks.add({ title: 'late', date: '2026-10-24', time: '21:00:00' })
    await tasks.add({ title: 'early', date: '2026-10-24', time: '08:30:00' })
    await tasks.add({ title: 'other day', date: '2026-10-25' })

    expect(tasks.occurrencesOn('2026-10-24').map((o) => o.task.title)).toEqual([
      'early',
      'late',
      'untimed',
    ])
  })

  it('a one-off task is ticked on the task itself', async () => {
    const tasks = useTasksStore()
    const task = await tasks.add({ title: 'Buy milk', date: '2026-10-24' })

    await tasks.setDone(task, '2026-10-24', true)
    expect(tasks.occurrencesOn('2026-10-24')[0]?.done).toBe(true)
    expect(fakeDb.rows('tasks')[0]?.done_at).toBeTruthy()
    expect(fakeDb.rows('task_completions')).toHaveLength(0)
  })

  it('a repeating task is ticked per day and survives a reload', async () => {
    const tasks = useTasksStore()
    const task = await tasks.add({ title: 'Stretch', date: '2026-10-20', repeat: 'day' })

    await tasks.setDone(task, '2026-10-24', true)
    expect(tasks.occurrencesOn('2026-10-24')[0]?.done).toBe(true)
    expect(tasks.occurrencesOn('2026-10-25')[0]?.done).toBe(false)
    expect(fakeDb.rows('tasks')[0]?.done).toBe(false)

    setActivePinia(createPinia())
    const reloaded = useTasksStore()
    await reloaded.load()
    expect(reloaded.occurrencesOn('2026-10-24')[0]?.done).toBe(true)

    await reloaded.setDone(reloaded.items[0]!, '2026-10-24', false)
    expect(fakeDb.rows('task_completions')).toHaveLength(0)
  })

  it('deleting a repeating task drops its ticks too', async () => {
    const tasks = useTasksStore()
    const task = await tasks.add({ title: 'Stretch', date: '2026-10-20', repeat: 'day' })
    await tasks.setDone(task, '2026-10-24', true)

    await tasks.remove(task.id)
    expect(tasks.items).toHaveLength(0)
    expect(tasks.completions).toHaveLength(0)
  })
})
