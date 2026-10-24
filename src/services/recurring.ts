// Schedule of a recurring money entry (固定收支, DECISIONS 53): every month or year on the
// start date's day; a day the month doesn't have (29–31) falls on its last day.
import { daysInMonth, fromKey, toKey, type DateKey } from './dates'
import type { RecurringRow } from '@/types/db'

type Schedule = Pick<RecurringRow, 'frequency' | 'start_date' | 'last_date'>

/** The k-th occurrence (0 = the start date). */
export function occurrence(
  rule: Pick<RecurringRow, 'frequency' | 'start_date'>,
  k: number,
): DateKey {
  const start = fromKey(rule.start_date)
  const year = rule.frequency === 'year' ? start.getFullYear() + k : start.getFullYear()
  const monthIndex = rule.frequency === 'month' ? start.getMonth() + k : start.getMonth()
  const first = new Date(year, monthIndex, 1)
  const day = Math.min(start.getDate(), daysInMonth(first.getFullYear(), first.getMonth()))
  return toKey(new Date(first.getFullYear(), first.getMonth(), day))
}

/** Occurrences that are due by `today` and not recorded yet, oldest first. */
export function dueDates(rule: Schedule, today: DateKey): DateKey[] {
  const dates: DateKey[] = []
  for (let k = 0; ; k++) {
    const date = occurrence(rule, k)
    if (date > today) break
    if (!rule.last_date || date > rule.last_date) dates.push(date)
  }
  return dates
}

/** The next occurrence after `today`. */
export function nextDate(
  rule: Pick<RecurringRow, 'frequency' | 'start_date'>,
  today: DateKey,
): DateKey {
  for (let k = 0; ; k++) {
    const date = occurrence(rule, k)
    if (date > today) return date
  }
}

/**
 * Occurrences in [from, to] that haven't happened yet (after today and not recorded), shown
 * as 預計 on the Money page.
 */
export function upcomingDates(
  rule: Schedule,
  from: DateKey,
  to: DateKey,
  today: DateKey,
): DateKey[] {
  const dates: DateKey[] = []
  for (let k = 0; ; k++) {
    const date = occurrence(rule, k)
    if (date > to) break
    if (date >= from && date > today && (!rule.last_date || date > rule.last_date)) dates.push(date)
  }
  return dates
}
