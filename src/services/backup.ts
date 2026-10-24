// 下載備份檔: every row of the signed-in user as one JSON file (DECISIONS 49).
import { todayKey } from './dates'
import { useCategoriesStore } from '@/stores/categories'
import { useEventsStore } from '@/stores/events'
import { useGigsStore } from '@/stores/gigs'
import { useHabitsStore } from '@/stores/habits'
import { useMoneyStore } from '@/stores/money'
import { useSettingsStore } from '@/stores/settings'
import { useTasksStore } from '@/stores/tasks'

export function backupData() {
  const tasks = useTasksStore()
  const habits = useHabitsStore()
  return {
    app: 'planner',
    version: 1,
    exported_at: new Date().toISOString(),
    settings: useSettingsStore().row,
    categories: useCategoriesStore().items,
    tasks: tasks.items,
    task_completions: tasks.completions,
    events: useEventsStore().items,
    habits: habits.items,
    habit_logs: habits.logs,
    gigs: useGigsStore().items,
    transactions: useMoneyStore().items,
  }
}

export function downloadBackup() {
  const json = JSON.stringify(backupData(), null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `planner-backup-${todayKey()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
