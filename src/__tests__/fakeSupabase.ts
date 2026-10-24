// Test double for '@/services/supabase', backed by the app's in-memory database.
// Usage: vi.mock('@/services/supabase', () => import('./fakeSupabase')) and reset with fakeDb.reset().
import { memoryDb, memoryFrom } from '../services/memoryBackend'

export const fakeDb = memoryDb

export const isSupabaseConfigured = true

export const supabase = {
  from: memoryFrom,
  auth: {
    getSession: async () => ({
      data: { session: memoryDb.userId ? { user: { id: memoryDb.userId } } : null },
    }),
  },
}

export async function requireUserId(): Promise<string> {
  if (!memoryDb.userId) throw new Error('Not signed in')
  return memoryDb.userId
}
