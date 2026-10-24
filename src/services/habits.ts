// Habit schedule and streak math (SPEC 4.3). Pure functions; the habits store supplies the data.
import { addDays, fromKey, toKey, type DateKey } from './dates'
import type { HabitRow } from '@/types/db'

/** ISO weekday: 1 = Monday ... 7 = Sunday (habits.weekdays). */
export function isoWeekday(day: DateKey): number {
  return ((fromKey(day).getDay() + 6) % 7) + 1
}

/** Habits only show up on the weekdays they were set for. */
export function isScheduled(habit: Pick<HabitRow, 'weekdays'>, day: DateKey): boolean {
  return habit.weekdays.includes(isoWeekday(day))
}

export type DayStatus = 'done' | 'missed' | 'off' | 'future'

export interface HabitHistory {
  habit: Pick<HabitRow, 'weekdays' | 'created_at'>
  /** Days the habit was popped. */
  done: Set<DateKey>
}

function startOf(h: HabitHistory): DateKey {
  return toKey(new Date(h.habit.created_at))
}

/**
 * How one day looks in the month record. A scheduled day that is not done yet counts as
 * missed only once it is over; today stays open.
 */
export function dayStatus(h: HabitHistory, day: DateKey, today: DateKey): DayStatus {
  if (day > today) return 'future'
  if (h.done.has(day)) return 'done'
  if (!isScheduled(h.habit, day) || day < startOf(h)) return 'off'
  return day === today ? 'future' : 'missed'
}

/**
 * Scheduled days in a row that were done, counting back from today. Days the habit is not
 * scheduled don't break a streak; today not popped yet doesn't either.
 */
export function currentStreak(h: HabitHistory, today: DateKey): number {
  const start = startOf(h)
  let streak = 0
  for (let d = today; d >= start; d = addDays(d, -1)) {
    if (h.done.has(d)) streak++
    else if (isScheduled(h.habit, d) && d !== today) break
  }
  return streak
}

/** The longest run of done scheduled days since the habit was created. */
export function bestStreak(h: HabitHistory, today: DateKey): number {
  let best = 0
  let run = 0
  for (let d = startOf(h); d <= today; d = addDays(d, 1)) {
    if (h.done.has(d)) best = Math.max(best, ++run)
    else if (isScheduled(h.habit, d) && d !== today) run = 0
  }
  return best
}

/** Done days and scheduled-so-far days in a month, for "本月完成" and the percentage. */
export function monthStats(h: HabitHistory, year: number, monthIndex: number, today: DateKey) {
  const first = toKey(new Date(year, monthIndex, 1))
  const last = toKey(new Date(year, monthIndex + 1, 0))
  let done = 0
  let scheduled = 0
  for (let d = first; d <= last && d <= today; d = addDays(d, 1)) {
    if (h.done.has(d)) done++
    if (d >= startOf(h) && (isScheduled(h.habit, d) || h.done.has(d))) scheduled++
  }
  return { done, scheduled }
}
