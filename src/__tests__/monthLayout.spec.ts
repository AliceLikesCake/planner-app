import { describe, it, expect } from 'vitest'
import { layoutMonth, type DayCell, type GridEvent } from '../components/monthLayout'

const ev = (id: string, start: string, end = start): GridEvent => ({ id, start, end })

function cell(weeks: ReturnType<typeof layoutMonth<GridEvent>>, key: string) {
  for (const w of weeks) for (const c of w.cells) if (c?.key === key) return c as DayCell<GridEvent>
  throw new Error(`no cell ${key}`)
}

describe('layoutMonth', () => {
  it('October 2026 starts on Thursday: 3 leading blanks from Monday, 4 from Sunday', () => {
    const mon = layoutMonth(2026, 9, 'mon', [])
    const sun = layoutMonth(2026, 9, 'sun', [])
    expect(mon[0]!.cells.slice(0, 4).map((c) => c?.day ?? null)).toEqual([null, null, null, 1])
    expect(sun[0]!.cells.slice(0, 5).map((c) => c?.day ?? null)).toEqual([
      null,
      null,
      null,
      null,
      1,
    ])
    expect(mon.flatMap((w) => w.cells).filter(Boolean)).toHaveLength(31)
  })

  it('keeps a multi-day event in one lane and repeats its text at the start of the next week', () => {
    // Oct 28 (Wed) – Nov 1 (Sun) with weeks starting Sunday: Oct 28–31 in one row.
    const trip = ev('trip', '2026-10-28', '2026-11-01')
    const weeks = layoutMonth(2026, 9, 'sun', [ev('a', '2026-10-29'), trip])
    const days = ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'].map((k) => cell(weeks, k))

    expect(days.map((d) => d.slots[0]?.event.id)).toEqual(['trip', 'trip', 'trip', 'trip'])
    expect(days.map((d) => d.slots[0]!.showText)).toEqual([true, false, false, false])
    expect(days[0]!.slots[0]!.joinLeft).toBe(false)
    expect(days[3]!.slots[0]!.joinRight).toBe(false) // Oct 31 is the month's last cell
    expect(cell(weeks, '2026-10-29').slots[1]?.event.id).toBe('a')
  })

  it('starts the text again on the first column of a new week', () => {
    const weeks = layoutMonth(2026, 9, 'mon', [ev('long', '2026-10-10', '2026-10-13')])
    // Oct 12 is a Monday
    expect(cell(weeks, '2026-10-12').slots[0]).toMatchObject({ showText: true, joinLeft: false })
    expect(cell(weeks, '2026-10-11').slots[0]).toMatchObject({ joinRight: false })
  })

  it('counts events past the third lane as +N', () => {
    const events = ['a', 'b', 'c', 'd', 'e'].map((id) => ev(id, '2026-10-24'))
    const c = cell(layoutMonth(2026, 9, 'mon', events), '2026-10-24')
    expect(c.slots).toHaveLength(3)
    expect(c.more).toBe(2)
    expect(c.events).toHaveLength(5)
  })
})
