import { defineStore } from 'pinia'
import { useTable } from './table'
import type { NewRow, RecurringRow } from '@/types/db'

export type NewRecurring = NewRow<RecurringRow, 'type' | 'amount' | 'frequency' | 'start_date'>

/** 固定收支: rules that record a money entry every month or year. */
export const useRecurringStore = defineStore('recurring', () => {
  const table = useTable<RecurringRow, NewRecurring>('recurring_transactions', [
    { column: 'created_at' },
  ])
  /** An older database without the table still loads (the feature just stays empty). */
  async function load() {
    try {
      await table.load()
    } catch (error) {
      if ((error as { code?: string }).code !== 'PGRST205') throw error
      console.warn('recurring_transactions table missing; run supabase/schema.sql')
      table.items.value = []
    }
  }

  return { ...table, load }
})
