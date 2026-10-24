import { defineStore } from 'pinia'
import { useTable } from './table'
import type { NewRow, TransactionRow } from '@/types/db'

export type NewTransaction = NewRow<TransactionRow, 'type' | 'amount' | 'date'>

export const useMoneyStore = defineStore('money', () => {
  const table = useTable<TransactionRow, NewTransaction>('transactions', [
    { column: 'date', ascending: false },
    { column: 'created_at', ascending: false },
  ])

  return { ...table }
})
