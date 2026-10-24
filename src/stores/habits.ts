import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useTable } from './table'
import { requireUserId, supabase } from '@/services/supabase'
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

  function isDone(habitId: string, date: string) {
    return logs.value.some((l) => l.habit_id === habitId && l.date === date && l.done)
  }

  /** Marks or clears one day; a cleared day has no log row. */
  async function setDone(habitId: string, date: string, done: boolean) {
    if (done) {
      const user_id = await requireUserId()
      const row = { habit_id: habitId, user_id, date, done: true }
      const { error } = await supabase.from('habit_logs').upsert(row)
      if (error) throw error
      logs.value = [...logs.value.filter((l) => !(l.habit_id === habitId && l.date === date)), row]
    } else {
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('habit_id', habitId)
        .eq('date', date)
      if (error) throw error
      logs.value = logs.value.filter((l) => !(l.habit_id === habitId && l.date === date))
    }
  }

  function reset() {
    table.reset()
    logs.value = []
  }

  return { ...table, logs, load, isDone, setDone, reset }
})
