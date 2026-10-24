import { daysInMonth, fromKey, type DateKey } from './dates'
import type { TaskRow } from '@/types/db'

/**
 * Whether a task shows up on `day` (DECISIONS 4: a repeating task is stored once; its `date`
 * is the first day). Monthly tasks started on the 29th–31st fall on the last day of shorter months.
 */
export function occursOn(task: Pick<TaskRow, 'date' | 'repeat'>, day: DateKey): boolean {
  if (task.repeat === 'none') return task.date === day
  if (day < task.date) return false
  const start = fromKey(task.date)
  const d = fromKey(day)
  switch (task.repeat) {
    case 'day':
      return true
    case 'week':
      return start.getDay() === d.getDay()
    case 'month': {
      const target = Math.min(start.getDate(), daysInMonth(d.getFullYear(), d.getMonth()))
      return d.getDate() === target
    }
  }
}
