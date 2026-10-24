import { defineStore } from 'pinia'
import { useTable } from './table'
import type { GigRow, NewRow } from '@/types/db'

export type NewGig = NewRow<GigRow, 'brand' | 'product_category'>

export const useGigsStore = defineStore('gigs', () => {
  const table = useTable<GigRow, NewGig>('gigs', [{ column: 'created_at', ascending: false }])

  return { ...table }
})
