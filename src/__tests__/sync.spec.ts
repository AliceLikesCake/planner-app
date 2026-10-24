import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fakeDb } from './fakeSupabase'
import { loadUserData } from '../services/session'
import {
  calendarTodos,
  createEvent,
  deleteEvent,
  eventDays,
  rolloverOncePerDay,
  rolloverTasks,
  syncEventTasks,
  updateEvent,
} from '../services/sync'
import { useCategoriesStore } from '../stores/categories'
import { useEventsStore } from '../stores/events'
import { useSettingsStore } from '../stores/settings'
import { useTasksStore } from '../stores/tasks'

vi.mock('@/services/supabase', () => import('./fakeSupabase'))

beforeEach(async () => {
  localStorage.clear()
  fakeDb.reset('user-1')
  setActivePinia(createPinia())
  await loadUserData('user-1')
})

const eventCat = (key: string) =>
  useCategoriesStore()
    .ofType('event')
    .find((c) => c.key === key)!
const taskCat = (key: string) =>
  useCategoriesStore()
    .ofType('task')
    .find((c) => c.key === key)!
const eventTasks = (id: string) =>
  useTasksStore()
    .items.filter((t) => t.event_id === id)
    .sort((a, b) => a.date.localeCompare(b.date))

describe('rule 6: calendar to-dos', () => {
  it('lists the day’s to-dos shown in the calendar, unfinished first', async () => {
    const tasks = useTasksStore()
    const a = await tasks.add({ title: 'A', date: '2026-10-24', time: '08:00:00' })
    await tasks.add({ title: 'B', date: '2026-10-24', time: '09:00:00' })
    await tasks.add({ title: 'Hidden', date: '2026-10-24', show_in_calendar: false })
    await tasks.setDone(a, '2026-10-24', true)

    expect(calendarTodos('2026-10-24').map((o) => o.task.title)).toEqual(['B', 'A'])
  })
})

describe('rule 7: event → to-dos', () => {
  it('eventDays covers start to end, across months', () => {
    expect(eventDays({ start_date: '2026-10-30', end_date: '2026-11-02' })).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ])
  })

  it('creates one to-do per day, in the matching task category', async () => {
    const event = await createEvent({
      title: 'Tokyo trip',
      category_id: eventCat('travel').id,
      start_date: '2026-10-28',
      end_date: '2026-11-01',
      add_to_today: true,
    })
    const list = eventTasks(event.id)
    expect(list.map((t) => t.date)).toEqual([
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ])
    expect(list.every((t) => t.source === 'event' && t.title === 'Tokyo trip')).toBe(true)
    // travel has no task category, so it falls back to life
    expect(list[0]!.category_id).toBe(taskCat('life').id)
    expect(list[0]!.show_in_calendar).toBe(false)
  })

  it('uses the same-key task category and puts the start time on the first day', async () => {
    const event = await createEvent({
      title: 'Workshop',
      category_id: eventCat('work').id,
      start_date: '2026-10-24',
      end_date: '2026-10-25',
      all_day: false,
      start_time: '09:30:00',
      add_to_today: true,
    })
    const [first, second] = eventTasks(event.id)
    expect(first!.category_id).toBe(taskCat('work').id)
    expect([first!.time, second!.time]).toEqual(['09:30:00', null])
  })

  it('is idempotent', async () => {
    const event = await createEvent({
      title: 'X',
      start_date: '2026-10-24',
      end_date: '2026-10-26',
      add_to_today: true,
    })
    await syncEventTasks(event)
    await syncEventTasks(event)
    expect(fakeDb.rows('tasks')).toHaveLength(3)
  })

  it('follows date and title changes, keeping ticks on days that remain', async () => {
    const events = useEventsStore()
    const tasks = useTasksStore()
    const event = await createEvent({
      title: 'X',
      start_date: '2026-10-24',
      end_date: '2026-10-26',
      add_to_today: true,
    })
    const kept = eventTasks(event.id).find((t) => t.date === '2026-10-25')!
    await tasks.setDone(kept, '2026-10-25', true)

    const moved = await events.update(event.id, {
      title: 'Y',
      start_date: '2026-10-25',
      end_date: '2026-10-27',
    })
    await syncEventTasks(moved)

    const list = eventTasks(event.id)
    expect(list.map((t) => t.date)).toEqual(['2026-10-25', '2026-10-26', '2026-10-27'])
    expect(list.every((t) => t.title === 'Y')).toBe(true)
    expect(list[0]!.id).toBe(kept.id)
    expect(list[0]!.done).toBe(true)
  })

  it('removes the to-dos when the option is turned off, and leaves manual to-dos alone', async () => {
    const events = useEventsStore()
    await useTasksStore().add({ title: 'manual', date: '2026-10-24' })
    const event = await createEvent({
      title: 'X',
      start_date: '2026-10-24',
      end_date: '2026-10-25',
      add_to_today: true,
    })

    await syncEventTasks(await events.update(event.id, { add_to_today: false }))
    expect(eventTasks(event.id)).toHaveLength(0)
    expect(useTasksStore().items.map((t) => t.title)).toEqual(['manual'])
  })

  it('creates nothing when the option is off', async () => {
    await createEvent({ title: 'X', start_date: '2026-10-24', end_date: '2026-10-25' })
    expect(useTasksStore().items).toHaveLength(0)
  })

  it('deleting an event drops its to-dos from the store', async () => {
    const event = await createEvent({
      title: 'X',
      start_date: '2026-10-24',
      end_date: '2026-10-25',
      add_to_today: true,
    })
    await deleteEvent(event.id)
    expect(useEventsStore().items).toHaveLength(0)
    expect(useTasksStore().items).toHaveLength(0)
  })

  it('updateEvent saves the event and re-syncs its to-dos', async () => {
    const event = await createEvent({
      title: 'X',
      start_date: '2026-10-24',
      end_date: '2026-10-24',
    })
    await updateEvent(event.id, { add_to_today: true, end_date: '2026-10-25', title: 'Y' })

    expect(useEventsStore().items[0]!.title).toBe('Y')
    expect(eventTasks(event.id).map((t) => [t.date, t.title])).toEqual([
      ['2026-10-24', 'Y'],
      ['2026-10-25', 'Y'],
    ])
  })
})

describe('rule 9: unfinished to-dos move to today', () => {
  it('moves unfinished one-off manual to-dos from before today, nothing else', async () => {
    const tasks = useTasksStore()
    const old = await tasks.add({ title: 'old', date: '2026-10-20' })
    const done = await tasks.add({ title: 'done', date: '2026-10-20', done: true })
    const daily = await tasks.add({ title: 'daily', date: '2026-10-01', repeat: 'day' })
    const future = await tasks.add({ title: 'future', date: '2026-10-30' })
    const generated = await tasks.add({ title: 'gen', date: '2026-10-20', source: 'event' })

    expect(await rolloverTasks('2026-10-24')).toBe(1)
    const date = (id: string) => tasks.items.find((t) => t.id === id)!.date
    expect(date(old.id)).toBe('2026-10-24')
    expect([date(done.id), date(daily.id), date(future.id), date(generated.id)]).toEqual([
      '2026-10-20',
      '2026-10-01',
      '2026-10-30',
      '2026-10-20',
    ])
  })

  it('does nothing when the setting is off, and runs once a day', async () => {
    const tasks = useTasksStore()
    await useSettingsStore().update({ rollover_tasks: false })
    const t1 = await tasks.add({ title: 'old', date: '2026-10-20' })
    expect(await rolloverTasks('2026-10-24')).toBe(0)

    await useSettingsStore().update({ rollover_tasks: true })
    localStorage.setItem('planner.rollover.user-1', '2026-10-24')
    await rolloverOncePerDay('user-1', '2026-10-24')
    expect(tasks.items.find((t) => t.id === t1.id)!.date).toBe('2026-10-20')
    await rolloverOncePerDay('user-1', '2026-10-25')
    expect(tasks.items.find((t) => t.id === t1.id)!.date).toBe('2026-10-25')
  })
})
