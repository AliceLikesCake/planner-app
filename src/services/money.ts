import { i18n } from '@/i18n'

/** Whole New Taiwan dollars in the current language: "$12,000" (zh-TW) / "NT$12,000" (en). */
export function formatMoney(amount: number, locale = i18n.global.locale.value): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
