import { defineStore } from 'pinia'
import { useTable } from './table'
import { i18n } from '@/i18n'
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

  /** Name in the current language (SPEC 7: name_zh / name_en). */
  function name(category: CategoryRow | undefined) {
    // A deleted category leaves its rows with category_id null.
    if (!category) return i18n.global.t('category.none')
    return i18n.global.locale.value === 'en' ? category.name_en : category.name_zh
  }

  return { ...table, ofType, byId, name }
})
