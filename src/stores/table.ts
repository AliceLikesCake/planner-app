import { ref, type Ref } from 'vue'
import { requireUserId, supabase, type TableName } from '@/services/supabase'

interface Order {
  column: string
  ascending?: boolean
}

/**
 * Shared read / add / update / remove for one user-owned table with an `id` primary key.
 * Each Pinia store composes this; RLS limits every query to the signed-in user's rows.
 */
export function useTable<T extends { id: string }, New extends object>(
  table: TableName,
  order: Order[],
) {
  const items = ref([]) as Ref<T[]>
  const loaded = ref(false)

  async function load() {
    let query = supabase.from(table).select('*')
    for (const o of order) query = query.order(o.column, { ascending: o.ascending ?? true })
    const { data, error } = await query
    if (error) throw error
    items.value = data as T[]
    loaded.value = true
  }

  async function add(row: New): Promise<T> {
    const user_id = await requireUserId()
    const { data, error } = await supabase
      .from(table)
      .insert({ ...row, user_id })
      .select()
      .single()
    if (error) throw error
    items.value.push(data as T)
    return data as T
  }

  async function update(id: string, patch: Partial<Omit<T, 'id' | 'user_id'>>): Promise<T> {
    const { data, error } = await supabase
      .from(table)
      .update(patch as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const index = items.value.findIndex((item) => item.id === id)
    if (index >= 0) items.value[index] = data as T
    return data as T
  }

  async function remove(id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    items.value = items.value.filter((item) => item.id !== id)
  }

  /** Drops rows locally that the database already removed (e.g. by ON DELETE CASCADE). */
  function forget(predicate: (item: T) => boolean) {
    items.value = items.value.filter((item) => !predicate(item))
  }

  function reset() {
    items.value = []
    loaded.value = false
  }

  return { items, loaded, load, add, update, remove, forget, reset }
}
