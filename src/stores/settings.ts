import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n, initialLocale, storeLocale, type Locale } from '@/i18n'

export const useSettingsStore = defineStore('settings', () => {
  const lang = ref<Locale>(initialLocale())

  function applyLang(locale: Locale) {
    i18n.global.locale.value = locale
    if (typeof document !== 'undefined') document.documentElement.lang = locale
  }

  function setLang(locale: Locale) {
    lang.value = locale
    storeLocale(locale)
    applyLang(locale)
  }

  applyLang(lang.value)

  return { lang, setLang }
})
