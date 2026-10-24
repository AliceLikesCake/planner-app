import { describe, it, expect } from 'vitest'
import { computeLayers, type CakeTask } from '../components/cake/layers'
import { buildCake, DESSERT_IDS, weeklyDesserts } from '../components/cake/desserts'

const COLORS: Record<string, string> = { work: '#BCCDE6', gig: '#D5C8EA', study: '#C6DBB6' }

function task(id: string, group: string, doneAt?: string): CakeTask {
  return { id, group, color: COLORS[group]!, done: !!doneAt, doneAt: doneAt ?? null }
}

const H = 120

describe('computeLayers', () => {
  it('3 tasks: one layer each, height capped at 30, done ones at the bottom in completion order', () => {
    const tasks = [
      task('a', 'work'),
      task('b', 'gig', '2026-10-24T09:00'),
      task('c', 'study', '2026-10-24T08:00'),
    ]
    const { segments, merged, done, total } = computeLayers(tasks, H)

    expect(merged).toBe(false)
    expect([done, total]).toEqual([2, 3])
    expect(segments.map((s) => s.height)).toEqual([30, 30, 30])
    expect(segments.map((s) => s.color)).toEqual([COLORS.study, COLORS.gig, null])
  })

  it('6 tasks: height is total / count', () => {
    const tasks = Array.from({ length: 6 }, (_, i) =>
      task(`t${i}`, 'work', i < 2 ? `0${i}` : undefined),
    )
    const { segments, merged } = computeLayers(tasks, H)

    expect(merged).toBe(false)
    expect(segments).toHaveLength(6)
    expect(segments.every((s) => s.height === 20)).toBe(true)
    expect(segments.filter((s) => s.color === null)).toHaveLength(4)
  })

  it('never goes below 14 per layer when not merged', () => {
    const tasks = Array.from({ length: 8 }, (_, i) => task(`t${i}`, 'work'))
    expect(computeLayers(tasks, 96).segments[0]!.height).toBe(14)
  })

  it('12 tasks: merges done tasks by category and leaves one dashed block for the rest', () => {
    const groups = [
      'work',
      'work',
      'gig',
      'study',
      'work',
      'gig',
      'study',
      'study',
      'work',
      'gig',
      'work',
      'study',
    ]
    const doneAt = [
      '01',
      '03',
      '02',
      undefined,
      '04',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]
    const tasks = groups.map((g, i) => task(`t${i}`, g, doneAt[i]))
    const { segments, merged, done } = computeLayers(tasks, H)

    expect(merged).toBe(true)
    expect(done).toBe(4)
    // unit = floor(120 / 12) = 10; work done 3×, gig done 1× (raised to the 12px minimum)
    expect(segments).toEqual([
      { color: COLORS.work, height: 30, count: 3, isNew: false },
      { color: COLORS.gig, height: 12, count: 1, isNew: false },
      { color: null, height: 80, count: 8, isNew: false },
    ])
  })

  it('merged unit never drops below 7', () => {
    const tasks = Array.from({ length: 30 }, (_, i) => task(`t${i}`, 'work', '01'))
    expect(computeLayers(tasks, H).segments[0]!.height).toBe(30 * 7)
  })

  it('follows the max-layers setting', () => {
    const tasks = Array.from({ length: 7 }, (_, i) => task(`t${i}`, 'work'))
    expect(computeLayers(tasks, H, 8).merged).toBe(false)
    expect(computeLayers(tasks, H, 6).merged).toBe(true)
  })

  it('marks the layer holding the task just completed', () => {
    const tasks = [task('a', 'work', '01'), task('b', 'gig', '02'), task('c', 'study')]
    expect(computeLayers(tasks, H, 8, 'b').segments.map((s) => s.isNew)).toEqual([
      false,
      true,
      false,
    ])
  })

  it('has no layers without tasks', () => {
    expect(computeLayers([], H)).toEqual({ segments: [], merged: false, done: 0, total: 0 })
  })
})

describe('buildCake', () => {
  it('renders every dessert at 3, 6 and 12 tasks without writing text on layers', () => {
    for (const id of DESSERT_IDS) {
      for (const n of [3, 6, 12]) {
        const tasks = Array.from({ length: n }, (_, i) => task(`t${i}`, 'work', '01'))
        const { segments } = computeLayers(tasks, H)
        const view = buildCake(id, segments, true)
        expect(view.layers).toHaveLength(segments.length)
        expect(view.deco.length).toBeGreaterThan(0)
        expect(view.layers.every((l) => !/content:|NaN|undefined/.test(l.style))).toBe(true)
      }
    }
  })

  it('shows toppings only when everything is done', () => {
    const { segments } = computeLayers([task('a', 'work', '01'), task('b', 'gig')], H)
    expect(buildCake('classic', segments, false).deco).toEqual([])
  })
})

describe('weeklyDesserts', () => {
  it('picks seven different desserts, the same ones for the same week', () => {
    const a = weeklyDesserts('2026-10-19')
    expect(a).toHaveLength(7)
    expect(new Set(a).size).toBe(7)
    expect(weeklyDesserts('2026-10-19')).toEqual(a)
    const weeks = ['2026-10-26', '2026-11-02', '2026-11-09'].map((w) => weeklyDesserts(w).join())
    expect(new Set([a.join(), ...weeks]).size).toBeGreaterThan(1)
  })
})
