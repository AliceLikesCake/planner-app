import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until .env.local has the project URL and anon key; the app shows a setup notice. */
export const isSupabaseConfigured = Boolean(url && anonKey)

// Placeholders keep the client constructible so the setup notice can render without crashing.
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'missing-anon-key',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  },
)

export type TableName =
  | 'settings'
  | 'categories'
  | 'gigs'
  | 'events'
  | 'tasks'
  | 'task_completions'
  | 'habits'
  | 'habit_logs'
  | 'recurring_transactions'
  | 'transactions'

/** The signed-in user's id, read from the locally stored session (no network call). */
export async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Not signed in')
  return id
}
