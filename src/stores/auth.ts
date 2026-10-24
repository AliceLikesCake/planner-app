import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import {
  DEMO_USER_ID,
  enterDemo,
  exitDemo,
  isSupabaseConfigured,
  supabase,
} from '@/services/supabase'
import { clearUserData, loadUserData } from '@/services/session'
import { seedDemo } from '@/services/demo'
import { todayKey } from '@/services/dates'
import { useSettingsStore } from '@/stores/settings'
import type { Locale } from '@/i18n'

export type AuthStatus = 'loading' | 'signedOut' | 'ready' | 'error'

export const useAuthStore = defineStore('auth', () => {
  const status = ref<AuthStatus>('loading')
  const user = ref<User | null>(null)
  /** When everything was last read from Supabase. */
  const lastSyncedAt = ref<Date | null>(null)
  /** Exploring sample data without signing in (DECISIONS 57). */
  const demo = ref(false)
  /** The language before the demo, put back when it ends. */
  let langBeforeDemo: Locale | null = null
  let started = false

  async function enter(next: User | null) {
    // Supabase's own sign-in events don't end the demo.
    if (demo.value) return
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
      if (user.value?.id === next.id) {
        status.value = 'ready'
        lastSyncedAt.value = new Date()
      }
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

  /** 先逛逛: an in-memory copy of the app filled with sample data. Nothing is saved. */
  async function startDemo() {
    clearUserData()
    // The demo is for CV readers, so it is always in English (DECISIONS 59).
    const settings = useSettingsStore()
    langBeforeDemo ??= settings.lang
    await settings.setLang('en')
    enterDemo()
    demo.value = true
    user.value = { id: DEMO_USER_ID, email: undefined } as unknown as User
    status.value = 'loading'
    try {
      await loadUserData(DEMO_USER_ID)
      await seedDemo(todayKey())
      status.value = 'ready'
      lastSyncedAt.value = new Date()
    } catch (error) {
      console.error(error)
      leaveDemo()
    }
  }

  function leaveDemo() {
    clearUserData()
    exitDemo()
    demo.value = false
    user.value = null
    status.value = 'signedOut'
    if (langBeforeDemo) {
      void useSettingsStore().setLang(langBeforeDemo)
      langBeforeDemo = null
    }
  }

  async function signOut() {
    if (demo.value) {
      leaveDemo()
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await enter(null)
  }

  function retry() {
    return enter(user.value)
  }

  /** 立即同步: reads everything again, picking up changes made on another device. */
  async function syncNow() {
    if (!user.value || demo.value) return
    await loadUserData(user.value.id)
    lastSyncedAt.value = new Date()
  }

  return {
    status,
    user,
    lastSyncedAt,
    demo,
    init,
    signInWithGoogle,
    signOut,
    retry,
    syncNow,
    startDemo,
    leaveDemo,
  }
})
