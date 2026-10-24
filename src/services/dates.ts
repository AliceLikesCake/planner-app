// Calendar dates are handled as local 'YYYY-MM-DD' keys, matching Postgres `date` columns.

export type DateKey = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function todayKey(now = new Date()): DateKey {
  return toKey(now)
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromKey(key)
  d.setDate(d.getDate() + days)
  return toKey(d)
}

/** 0 = Monday ... 6 = Sunday (the order of the Today page's week buttons). */
export function weekdayIndex(key: DateKey): number {
  return (fromKey(key).getDay() + 6) % 7
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** The Monday-to-Sunday week containing `key`. */
export function weekOf(key: DateKey): DateKey[] {
  const monday = addDays(key, -weekdayIndex(key))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** 'HH:MM' from a Postgres time ('HH:MM:SS'), or '' when there is none. */
export function shortTime(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : ''
}

/** Minutes since midnight for 'HH:MM[:SS]'. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}

export function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}
