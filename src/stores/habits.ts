import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useTable } from './table'
import { requireUserId, supabase } from '@/services/supabase'
import type { DateKey } from '@/services/dates'
import type { HabitHistory } from '@/services/habits'
import type { HabitLogRow, HabitRow, NewRow } from '@/types/db'

export type NewHabit = NewRow<HabitRow, 'name'>

export const useHabitsStore = defineStore('habits', () => {
  const table = useTable<HabitRow, NewHabit>('habits', [
    { column: 'sort' },
    { column: 'created_at' },
  ])
  const logs = ref<HabitLogRow[]>([])

  async function load() {
    const [, logResult] = await Promise.all([
      table.load(),
      supabase.from('habit_logs').select('*').order('date'),
    ])
    if (logResult.error) throw logResult.error
    logs.value = logResult.data as HabitLogRow[]
  }

  function isDone(habitId: string, date: DateKey) {
    return logs.value.some((l) => l.habit_id === habitId && l.date === date && l.done)
  }

  /** The habit with the days it was popped, for the streak math in services/habits.ts. */
  function historyOf(habit: HabitRow): HabitHistory {
    const done = new Set(
      logs.value.filter((l) => l.habit_id === habit.id && l.done).map((l) => l.date),
    )
    return { habit, done }
  }

  /**
   * Pops (or un-pops) one day; a cleared day has no log row. The bubble changes right away
   * and goes back if saving fails.
   */
  async function setDone(habitId: string, date: DateKey, done: boolean) {
    const before = logs.value
    const others = before.filter((l) => !(l.habit_id === habitId && l.date === date))
    const row = { habit_id: habitId, user_id: await requireUserId(), date, done: true }
    logs.value = done ? [...others, row] : others
    const { error } = done
      ? await supabase.from('habit_logs').upsert(row)
      : await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('date', date)
    if (error) {
      logs.value = before
      throw error
    }
  }

  /** Deletes a habit; the database cascades its log, the store follows. */
  async function remove(id: string) {
    await table.remove(id)
    logs.value = logs.value.filter((l) => l.habit_id !== id)
  }

  function reset() {
    table.reset()
    logs.value = []
  }

  return { ...table, logs, load, isDone, historyOf, setDone, remove, reset }
})
