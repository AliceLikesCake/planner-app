// Row types for supabase/schema.sql. Dates are 'YYYY-MM-DD', times 'HH:MM[:SS]'.

export type PaletteKey =
  'blue' | 'lav' | 'green' | 'peach' | 'butter' | 'rose' | 'mint' | 'pink' | 'sand'

export type CategoryType = 'task' | 'event' | 'expense' | 'income'

export interface SettingsRow {
  user_id: string
  lang: 'zh-TW' | 'en'
  week_start: 'mon' | 'sun'
  dark: boolean
  sound: boolean
  push: boolean
  remind_deliver: boolean
  remind_overdue: boolean
  habit_remind_time: string
  auto_sync_calendar: boolean
  auto_sync_money: boolean
  rollover_tasks: boolean
  budget_total: number
  budget_by_category: Record<string, number>
  budget_warn: boolean
  month_start_day: number
  cakes_by_weekday: string[]
  cakes_random_weekly: boolean
  max_layers: number
  updated_at: string
}

export interface CategoryRow {
  id: string
  user_id: string
  type: CategoryType
  key: string | null
  name_zh: string
  name_en: string
  color: PaletteKey
  sort: number
  created_at: string
}

export type ProductCategory = 'beauty' | 'skin' | 'food' | 'home' | 'tech' | 'fashion'

export interface GigRow {
  id: string
  user_id: string
  brand: string
  product_category: ProductCategory
  formats: string[]
  amount: number
  contact: string | null
  note: string | null
  deliver_date: string | null
  live_date: string | null
  due_date: string | null
  contract_signed: boolean
  labor_signed: boolean
  delivered: boolean
  is_live: boolean
  paid_at: string | null
  sync_calendar: boolean
  sync_todo: boolean
  sync_docs: boolean
  sync_money: boolean
  created_at: string
  updated_at: string
}

export interface EventRow {
  id: string
  user_id: string
  title: string
  category_id: string | null
  start_date: string
  end_date: string
  all_day: boolean
  start_time: string | null
  end_time: string | null
  place: string | null
  remind: 'none' | 'hour' | 'day' | 'week'
  add_to_today: boolean
  source: 'manual' | 'gig'
  gig_id: string | null
  gig_kind: 'deliver' | 'live' | 'due' | null
  created_at: string
}

export interface TaskRow {
  id: string
  user_id: string
  title: string
  category_id: string | null
  date: string
  time: string | null
  repeat: 'none' | 'day' | 'week' | 'month'
  remind: boolean
  show_in_calendar: boolean
  note: string | null
  done: boolean
  done_at: string | null
  source: 'manual' | 'gig' | 'event'
  gig_id: string | null
  gig_kind: 'prep_deliver' | 'check_live' | 'sign_docs' | null
  event_id: string | null
  created_at: string
}

export interface HabitRow {
  id: string
  user_id: string
  name: string
  goal: string | null
  color: PaletteKey
  /** 1 = Monday ... 7 = Sunday */
  weekdays: number[]
  remind: boolean
  sort: number
  archived: boolean
  created_at: string
}

export interface HabitLogRow {
  habit_id: string
  user_id: string
  date: string
  done: boolean
}

export interface TransactionRow {
  id: string
  user_id: string
  type: 'expense' | 'income'
  amount: number
  category_id: string | null
  date: string
  note: string | null
  gig_id: string | null
  created_at: string
}

/** Columns the database fills in on insert. */
type Generated = 'id' | 'user_id' | 'created_at' | 'updated_at'

/** Insert payload: required columns without defaults, everything else optional. */
export type NewRow<T, Required extends keyof T> = Pick<T, Required> &
  Partial<Omit<T, Required | Generated>>
