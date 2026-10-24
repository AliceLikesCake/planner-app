import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/services/supabase'
import { clearUserData, loadUserData } from '@/services/session'

export type AuthStatus = 'loading' | 'signedOut' | 'ready' | 'error'

export const useAuthStore = defineStore('auth', () => {
  const status = ref<AuthStatus>('loading')
  const user = ref<User | null>(null)
  let started = false

  async function enter(next: User | null) {
    if (next?.id === user.value?.id && status.value === 'ready') {
      user.value = next
      return
    }
    clearUserData()
    user.value = next
    if (!next) {
      status.value = 'signedOut'
      return
    }
    status.value = 'loading'
    try {
      await loadUserData(next.id)
      // Ignore a load that finished after the user changed again.
      if (user.value?.id === next.id) status.value = 'ready'
    } catch (error) {
      console.error(error)
      if (user.value?.id === next.id) status.value = 'error'
    }
  }

  async function init() {
    if (started || !isSupabaseConfigured) return
    started = true
    const { data } = await supabase.auth.getSession()
    await enter(data.session?.user ?? null)
    supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase advises against awaiting its own calls inside this callback.
      setTimeout(() => enter(session?.user ?? null), 0)
    })
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await enter(null)
  }

  function retry() {
    return enter(user.value)
  }

  return { status, user, init, signInWithGoogle, signOut, retry }
})
