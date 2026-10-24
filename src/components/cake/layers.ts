// Pure layer math for the Today cake (SPEC 4.1 "蛋糕規則").

export interface CakeTask {
  id: string
  /** Layer color (cake tone of the task's category). */
  color: string
  /** Groups layers when the cake is merged; usually the category id. */
  group: string
  done: boolean
  /** Completion time; done layers stack bottom-up in this order. */
  doneAt?: string | null
}

export interface CakeSegment {
  /** Null for the dashed "not done yet" placeholder. */
  color: string | null
  height: number
  /** How many tasks this segment stands for. */
  count: number
  /** True when it holds the task that was just completed (plays the drop animation). */
  isNew: boolean
}

export interface CakeLayout {
  /** Bottom to top. */
  segments: CakeSegment[]
  merged: boolean
  done: number
  total: number
}

export const SINGLE_MIN = 14
export const SINGLE_MAX = 30
export const MERGED_UNIT_MIN = 7
/** A merged layer never gets thinner than this, so a single task still reads as a layer. */
export const MERGED_LAYER_MIN = 12

/**
 * @param totalHeight the dessert's layer height budget (DESSERTS[id].height)
 * @param maxLayers settings.max_layers; more tasks than this merge layers by category
 * @param lastDoneId the task completed just now, if any
 */
export function computeLayers(
  tasks: CakeTask[],
  totalHeight: number,
  maxLayers = 8,
  lastDoneId: string | null = null,
): CakeLayout {
  const total = tasks.length
  const doneTasks = tasks
    .filter((t) => t.done)
    .sort((a, b) => (a.doneAt ?? '').localeCompare(b.doneAt ?? ''))
  const done = doneTasks.length
  if (total === 0) return { segments: [], merged: false, done: 0, total: 0 }

  const merged = total > maxLayers
  const segments: CakeSegment[] = []

  if (!merged) {
    const unit = Math.min(SINGLE_MAX, Math.max(SINGLE_MIN, Math.floor(totalHeight / total)))
    for (const t of doneTasks) {
      segments.push({ color: t.color, height: unit, count: 1, isNew: t.id === lastDoneId })
    }
    for (let i = done; i < total; i++) {
      segments.push({ color: null, height: unit, count: 1, isNew: false })
    }
  } else {
    const unit = Math.max(MERGED_UNIT_MIN, Math.floor(totalHeight / total))
    const byGroup = new Map<string, CakeSegment>()
    for (const t of doneTasks) {
      let seg = byGroup.get(t.group)
      if (!seg) {
        seg = { color: t.color, height: 0, count: 0, isNew: false }
        byGroup.set(t.group, seg)
        segments.push(seg)
      }
      seg.count++
      seg.height += unit
      if (t.id === lastDoneId) seg.isNew = true
    }
    for (const seg of segments) seg.height = Math.max(MERGED_LAYER_MIN, seg.height)
    if (done < total) {
      segments.push({
        color: null,
        height: (total - done) * unit,
        count: total - done,
        isNew: false,
      })
    }
  }

  return { segments, merged, done, total }
}
