import { createI18n } from 'vue-i18n'
import zhTW from './locales/zh-TW.json'
import en from './locales/en.json'

export type Locale = 'zh-TW' | 'en'
export const LOCALES: Locale[] = ['zh-TW', 'en']

// Temporary home for the language until settings move to Supabase (phase 2).
const STORAGE_KEY = 'planner.lang'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as string[]).includes(value)
}

export function detectLocale(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en'
}

export function loadStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

export function storeLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Private mode or blocked storage: the choice still applies for this session.
  }
}

export function initialLocale(): Locale {
  return (
    loadStoredLocale() ??
    detectLocale(typeof navigator === 'undefined' ? undefined : navigator.language)
  )
}

export const i18n = createI18n<[typeof zhTW], Locale, false>({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'zh-TW',
  messages: { 'zh-TW': zhTW, en },
})
