import { defineStore } from 'pinia'
import { useTable } from './table'
import type { CategoryRow, CategoryType, NewRow } from '@/types/db'

export type NewCategory = NewRow<CategoryRow, 'type' | 'name_zh' | 'name_en' | 'color'>

export const useCategoriesStore = defineStore('categories', () => {
  const table = useTable<CategoryRow, NewCategory>('categories', [
    { column: 'type' },
    { column: 'sort' },
    { column: 'created_at' },
  ])

  function ofType(type: CategoryType) {
    return table.items.value.filter((c) => c.type === type)
  }

  function byId(id: string | null | undefined) {
    return id ? table.items.value.find((c) => c.id === id) : undefined
  }

  return { ...table, ofType, byId }
})
