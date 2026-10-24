import { createClient } from '@supabase/supabase-js'
import { memoryDb, memoryFrom } from './memoryBackend'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until .env.local has the project URL and anon key; the app shows a setup notice. */
export const isSupabaseConfigured = Boolean(url && anonKey)

// Placeholders keep the client constructible so the setup notice can render without crashing.
const client = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

// ---- demo mode (DECISIONS 57): data reads and writes go to an in-memory database ----

export const DEMO_USER_ID = 'demo-user'
let demo = false

export function isDemo() {
  return demo
}

/** Starts the demo with an empty in-memory database; nothing reaches Supabase. */
export function enterDemo() {
  demo = true
  memoryDb.reset(DEMO_USER_ID)
}

export function exitDemo() {
  demo = false
  memoryDb.reset(null)
}

/**
 * The Supabase client, except that in demo mode `from()` uses the in-memory database.
 * Auth always goes to Supabase (the demo never signs in).
 */
export const supabase = new Proxy(client, {
  get(target, prop, receiver) {
    if (prop === 'from' && demo) return memoryFrom
    return Reflect.get(target, prop, receiver)
  },
})

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
  if (demo) return DEMO_USER_ID
  const { data } = await client.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Not signed in')
  return id
}
