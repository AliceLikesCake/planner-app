import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useTable } from './table'
import { requireUserId, supabase } from '@/services/supabase'
import { occursOn } from '@/services/repeat'
import { timeToMinutes, type DateKey } from '@/services/dates'
import type { NewRow, TaskCompletionRow, TaskRow } from '@/types/db'

export type NewTask = NewRow<TaskRow, 'title' | 'date'>

/** A task as it appears on one day; repeating tasks get their done state from that day. */
export interface TaskOccurrence {
  task: TaskRow
  date: DateKey
  done: boolean
  doneAt: string | null
}

export const useTasksStore = defineStore('tasks', () => {
  const table = useTable<TaskRow, NewTask>('tasks', [
    { column: 'date' },
    { column: 'time' },
    { column: 'created_at' },
  ])
  const completions = ref<TaskCompletionRow[]>([])

  async function load() {
    const [, result] = await Promise.all([
      table.load(),
      supabase.from('task_completions').select('*').order('date'),
    ])
    if (result.error) throw result.error
    completions.value = result.data as TaskCompletionRow[]
  }

  function completion(taskId: string, date: DateKey) {
    return completions.value.find((c) => c.task_id === taskId && c.date === date)
  }

  /** The day's tasks: timed ones by time, then untimed ones in the order they were added. */
  function occurrencesOn(date: DateKey): TaskOccurrence[] {
    return table.items.value
      .filter((task) => occursOn(task, date))
      .map((task) => {
        if (task.repeat === 'none') return { task, date, done: task.done, doneAt: task.done_at }
        const c = completion(task.id, date)
        return { task, date, done: !!c, doneAt: c?.done_at ?? null }
      })
      .sort((a, b) => {
        const ta = a.task.time ? timeToMinutes(a.task.time) : Infinity
        const tb = b.task.time ? timeToMinutes(b.task.time) : Infinity
        return ta - tb || a.task.created_at.localeCompare(b.task.created_at)
      })
  }

  /** Updates the screen first (the cake stacks on tap) and rolls back if saving fails. */
  async function setDone(task: TaskRow, date: DateKey, done: boolean) {
    const doneAt = done ? new Date().toISOString() : null

    if (task.repeat === 'none') {
      const items = table.items.value
      const index = items.findIndex((t) => t.id === task.id)
      const before = items[index]
      if (before) items[index] = { ...before, done, done_at: doneAt }
      try {
        await table.update(task.id, { done, done_at: doneAt })
      } catch (error) {
        if (before) table.items.value[index] = before
        throw error
      }
      return
    }

    const before = completions.value
    const others = before.filter((c) => !(c.task_id === task.id && c.date === date))
    const user_id = await requireUserId()
    const row = { task_id: task.id, user_id, date, done_at: doneAt ?? '' }
    completions.value = done ? [...others, row] : others
    const { error } = done
      ? await supabase.from('task_completions').upsert(row)
      : await supabase.from('task_completions').delete().eq('task_id', task.id).eq('date', date)
    if (error) {
      completions.value = before
      throw error
    }
  }

  /** Deletes a task; the database cascades its per-day ticks, the store follows. */
  async function remove(id: string) {
    await table.remove(id)
    completions.value = completions.value.filter((c) => c.task_id !== id)
  }

  function reset() {
    table.reset()
    completions.value = []
  }

  return { ...table, completions, load, occurrencesOn, setDone, remove, reset }
})
