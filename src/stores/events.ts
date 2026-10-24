import { defineStore } from 'pinia'
import { useTable } from './table'
import type { DateKey } from '@/services/dates'
import type { EventRow, NewRow } from '@/types/db'

export type NewEvent = NewRow<EventRow, 'title' | 'start_date' | 'end_date'>

export const useEventsStore = defineStore('events', () => {
  const table = useTable<EventRow, NewEvent>('events', [
    { column: 'start_date' },
    { column: 'start_time' },
    { column: 'created_at' },
  ])

  /** Events covering `day`, multi-day ones included. */
  function eventsOn(day: DateKey) {
    return table.items.value.filter((e) => e.start_date <= day && day <= e.end_date)
  }

  return { ...table, eventsOn }
})
