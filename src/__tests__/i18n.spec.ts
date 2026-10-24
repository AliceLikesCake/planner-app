import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import zhTW from '../locales/zh-TW.json'
import en from '../locales/en.json'
import { detectLocale, i18n, loadStoredLocale } from '../i18n'
import { useSettingsStore } from '../stores/settings'

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('locales', () => {
  it('zh-TW and en have identical keys', () => {
    expect(keys(en).sort()).toEqual(keys(zhTW).sort())
  })
})

describe('detectLocale', () => {
  it('uses zh-TW for any zh language and en otherwise', () => {
    expect(detectLocale('zh-TW')).toBe('zh-TW')
    expect(detectLocale('zh-CN')).toBe('zh-TW')
    expect(detectLocale('en-US')).toBe('en')
    expect(detectLocale('ja')).toBe('en')
    expect(detectLocale(undefined)).toBe('en')
  })
})

describe('settings store language', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('switches the app language and remembers it', () => {
    const settings = useSettingsStore()
    settings.setLang('en')
    expect(i18n.global.locale.value).toBe('en')
    expect(i18n.global.t('nav.today')).toBe('Today')
    expect(loadStoredLocale()).toBe('en')

    settings.setLang('zh-TW')
    expect(i18n.global.t('nav.today')).toBe('今日')
    expect(loadStoredLocale()).toBe('zh-TW')
  })

  it('restores the saved language on a fresh start', () => {
    localStorage.setItem('planner.lang', 'en')
    expect(useSettingsStore().lang).toBe('en')
  })
})
