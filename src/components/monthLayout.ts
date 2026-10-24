// Month grid layout for the calendar (SPEC 4.2): weeks of day cells, with events placed in
// lanes so a multi-day event keeps the same row across the days of a week.
import { addDays, daysInMonth, toKey, type DateKey } from '@/services/dates'

export interface GridEvent {
  id: string
  start: DateKey
  end: DateKey
}

export interface EventSlot<E extends GridEvent> {
  event: E
  /** Square off the left / right end because the bar carries on into the next cell. */
  joinLeft: boolean
  joinRight: boolean
  /** Text shows at the start of the bar, and again at the start of each week row. */
  showText: boolean
}

export interface DayCell<E extends GridEvent> {
  key: DateKey
  day: number
  /** 0 = first column. */
  col: number
  /** One entry per visible lane; null keeps the lane empty so bars stay aligned. */
  slots: (EventSlot<E> | null)[]
  /** Events on this day that did not fit in the visible lanes. */
  more: number
  /** All events on this day, for labels. */
  events: E[]
}

export interface MonthWeek<E extends GridEvent> {
  /** Seven entries; null for days outside the month. */
  cells: (DayCell<E> | null)[]
}

/**
 * @param monthIndex 0 = January
 * @param weekStart first column: Monday or Sunday (settings.week_start)
 */
export function layoutMonth<E extends GridEvent>(
  year: number,
  monthIndex: number,
  weekStart: 'mon' | 'sun',
  events: E[],
  maxLanes = 3,
): MonthWeek<E>[] {
  const first = toKey(new Date(year, monthIndex, 1))
  const last = toKey(new Date(year, monthIndex, daysInMonth(year, monthIndex)))
  const firstDow = new Date(year, monthIndex, 1).getDay() // 0 = Sunday
  const lead = weekStart === 'sun' ? firstDow : (firstDow + 6) % 7

  const weeks: MonthWeek<E>[] = []
  for (
    let weekStartKey = addDays(first, -lead);
    weekStartKey <= last;
    weekStartKey = addDays(weekStartKey, 7)
  ) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartKey, i))
    const inMonth = (key: DateKey | undefined) => !!key && key >= first && key <= last
    const visibleFirst = days.find((d) => inMonth(d))!
    const visibleLast = [...days].reverse().find((d) => inMonth(d))!

    // Earlier starts take the top lanes; on the same day, longer events first.
    const weekEvents = events
      .filter((e) => e.start <= visibleLast && e.end >= visibleFirst)
      .sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end))
    const laneEnds: DateKey[] = []
    const laneOf = new Map<string, number>()
    for (const e of weekEvents) {
      const start = e.start < visibleFirst ? visibleFirst : e.start
      const end = e.end > visibleLast ? visibleLast : e.end
      let lane = laneEnds.findIndex((laneEnd) => laneEnd < start)
      if (lane === -1) lane = laneEnds.length
      laneEnds[lane] = end
      laneOf.set(e.id, lane)
    }

    weeks.push({
      cells: days.map((key, col) => {
        if (!inMonth(key)) return null
        const onDay = weekEvents.filter((e) => e.start <= key && key <= e.end)
        const slots: (EventSlot<E> | null)[] = Array.from({ length: maxLanes }, () => null)
        let more = 0
        for (const event of onDay) {
          const lane = laneOf.get(event.id)!
          if (lane >= maxLanes) {
            more++
            continue
          }
          const joinLeft = event.start < key && col > 0 && inMonth(days[col - 1])
          const joinRight = event.end > key && col < 6 && inMonth(days[col + 1])
          slots[lane] = { event, joinLeft, joinRight, showText: !joinLeft }
        }
        // Drop trailing empty lanes so a quiet day stays short.
        while (slots.length && slots[slots.length - 1] === null) slots.pop()
        return { key, day: Number(key.slice(8)), col, slots, more, events: onDay }
      }),
    })
  }
  return weeks
}
