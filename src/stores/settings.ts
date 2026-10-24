import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n, initialLocale, storeLocale, type Locale } from '@/i18n'
import { supabase } from '@/services/supabase'
import type { SettingsRow } from '@/types/db'

export const useSettingsStore = defineStore('settings', () => {
  // Before sign-in (and as a cache for the next cold start) the language lives in localStorage.
  const lang = ref<Locale>(initialLocale())
  const row = ref<SettingsRow | null>(null)

  function applyLang(locale: Locale) {
    lang.value = locale
    storeLocale(locale)
    i18n.global.locale.value = locale
    if (typeof document !== 'undefined') document.documentElement.lang = locale
  }

  /** Loads the user's settings row; returns false when there is none yet (first sign-in). */
  async function load(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return false
    row.value = data as SettingsRow
    applyLang(row.value.lang)
    return true
  }

  /** Creates the row with the language already in use; safe if another device got there first. */
  async function create(userId: string) {
    const { error } = await supabase
      .from('settings')
      .upsert(
        { user_id: userId, lang: lang.value },
        { onConflict: 'user_id', ignoreDuplicates: true },
      )
    if (error) throw error
    if (!(await load(userId))) throw new Error('Settings row missing after create')
  }

  async function update(patch: Partial<Omit<SettingsRow, 'user_id'>>) {
    const current = row.value
    if (!current) throw new Error('Settings not loaded')
    const next = { ...patch, updated_at: new Date().toISOString() }
    const { data, error } = await supabase
      .from('settings')
      .update(next)
      .eq('user_id', current.user_id)
      .select()
      .single()
    if (error) throw error
    row.value = data as SettingsRow
  }

  async function setLang(locale: Locale) {
    applyLang(locale)
    if (row.value) await update({ lang: locale })
  }

  function reset() {
    row.value = null
  }

  applyLang(lang.value)

  return { lang, row, load, create, update, setLang, reset }
})
