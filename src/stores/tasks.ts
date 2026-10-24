import { defineStore } from 'pinia'
import { useTable } from './table'
import type { NewRow, TaskRow } from '@/types/db'

export type NewTask = NewRow<TaskRow, 'title' | 'date'>

export const useTasksStore = defineStore('tasks', () => {
  const table = useTable<TaskRow, NewTask>('tasks', [
    { column: 'date' },
    { column: 'time' },
    { column: 'created_at' },
  ])

  return { ...table }
})
