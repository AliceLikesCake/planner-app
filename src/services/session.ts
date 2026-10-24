import { supabase } from './supabase'
import { defaultCategoryRows } from './defaults'
import { useSettingsStore } from '@/stores/settings'
import { useCategoriesStore } from '@/stores/categories'
import { useTasksStore } from '@/stores/tasks'
import { useEventsStore } from '@/stores/events'
import { useHabitsStore } from '@/stores/habits'
import { useGigsStore } from '@/stores/gigs'
import { useMoneyStore } from '@/stores/money'

function dataStores() {
  return [
    useCategoriesStore(),
    useTasksStore(),
    useEventsStore(),
    useHabitsStore(),
    useGigsStore(),
    useMoneyStore(),
  ]
}

/** Default categories go in only when the user has none, so a retry never duplicates them. */
async function seedCategories(userId: string) {
  const { count, error } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  if (count) return
  const { error: insertError } = await supabase
    .from('categories')
    .insert(defaultCategoryRows(userId))
  if (insertError) throw insertError
}

/**
 * Runs after sign-in. On first sign-in, default categories go in before the settings row,
 * so an interrupted setup is finished on the next attempt.
 */
export async function loadUserData(userId: string) {
  const settings = useSettingsStore()
  if (!(await settings.load(userId))) {
    await seedCategories(userId)
    await settings.create(userId)
  }
  await Promise.all(dataStores().map((store) => store.load()))
}

/** Runs on sign-out so the next account never sees the previous one's rows. */
export function clearUserData() {
  useSettingsStore().reset()
  for (const store of dataStores()) store.reset()
}
