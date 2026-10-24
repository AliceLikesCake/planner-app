import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fakeDb } from './fakeSupabase'
import {
  bestStreak,
  currentStreak,
  dayStatus,
  isScheduled,
  monthStats,
  type HabitHistory,
} from '../services/habits'
import { useHabitsStore } from '../stores/habits'

vi.mock('@/services/supabase', () => import('./fakeSupabase'))

const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7]
const WEEKDAYS = [1, 2, 3, 4, 5]

function history(
  weekdays: number[],
  done: string[],
  created = '2026-10-01T08:00:00',
): HabitHistory {
  return { habit: { weekdays, created_at: created }, done: new Set(done) }
}

// 2026-10-24 is a Saturday.
const TODAY = '2026-10-24'

describe('habit schedule', () => {
  it('shows only on the chosen weekdays', () => {
    expect(isScheduled({ weekdays: WEEKDAYS }, '2026-10-23')).toBe(true) // Fri
    expect(isScheduled({ weekdays: WEEKDAYS }, TODAY)).toBe(false) // Sat
  })
})

describe('streaks', () => {
  it('counts back from today; today not popped yet does not break it', () => {
    const h = history(EVERY_DAY, ['2026-10-21', '2026-10-22', '2026-10-23'])
    expect(currentStreak(h, TODAY)).toBe(3)
    h.done.add(TODAY)
    expect(currentStreak(h, TODAY)).toBe(4)
  })

  it('a missed scheduled day ends the streak', () => {
    const h = history(EVERY_DAY, ['2026-10-20', '2026-10-22', '2026-10-23'])
    expect(currentStreak(h, TODAY)).toBe(2)
  })

  it('days off the schedule are skipped, not counted as misses', () => {
    // Mon–Fri habit: Fri 23, Thu 22 done; weekend in between does not matter.
    const h = history(WEEKDAYS, [
      '2026-10-16',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ])
    expect(currentStreak(h, '2026-10-25')).toBe(6) // Sunday
  })

  it('best streak is the longest run since the habit was created', () => {
    const h = history(EVERY_DAY, [
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-10',
      '2026-10-23',
    ])
    expect(bestStreak(h, TODAY)).toBe(4)
  })

  it('days before the habit existed are not misses', () => {
    const h = history(EVERY_DAY, ['2026-10-22', '2026-10-23'], '2026-10-22T09:00:00')
    expect(currentStreak(h, TODAY)).toBe(2)
    expect(dayStatus(h, '2026-10-21', TODAY)).toBe('off')
  })
})

describe('month record', () => {
  it('marks each day done, missed, off or future', () => {
    const h = history(WEEKDAYS, ['2026-10-22'])
    expect(dayStatus(h, '2026-10-22', TODAY)).toBe('done')
    expect(dayStatus(h, '2026-10-21', TODAY)).toBe('missed')
    expect(dayStatus(h, '2026-10-18', TODAY)).toBe('off') // Sunday
    expect(dayStatus(h, '2026-10-26', TODAY)).toBe('future')
  })

  it('counts done days and scheduled days so far', () => {
    const h = history(EVERY_DAY, ['2026-10-01', '2026-10-02', '2026-10-24'])
    expect(monthStats(h, 2026, 9, TODAY)).toEqual({ done: 3, scheduled: 24 })
  })
})

describe('habits store', () => {
  beforeEach(() => {
    fakeDb.reset('user-1')
    setActivePinia(createPinia())
  })

  it('pops and un-pops a day, and deleting a habit drops its log', async () => {
    const habits = useHabitsStore()
    const habit = await habits.add({ name: 'Water' })

    await habits.setDone(habit.id, TODAY, true)
    expect(habits.isDone(habit.id, TODAY)).toBe(true)
    await habits.setDone(habit.id, TODAY, false)
    expect(habits.isDone(habit.id, TODAY)).toBe(false)

    await habits.setDone(habit.id, TODAY, true)
    await habits.remove(habit.id)
    expect(habits.items).toHaveLength(0)
    expect(habits.logs).toHaveLength(0)
  })
})
