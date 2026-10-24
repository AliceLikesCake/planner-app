import { useI18n } from 'vue-i18n'
import { fromKey } from '@/services/dates'
import type { RecurringRow } from '@/types/db'

/** "每月 15 號" / "每年 3/2" for a recurring rule. */
export function useScheduleLabel() {
  const { t, locale } = useI18n()
  return (rule: Pick<RecurringRow, 'frequency' | 'start_date'>) => {
    const start = fromKey(rule.start_date)
    if (rule.frequency === 'month') return t('recurring.monthlyOn', { day: start.getDate() })
    const date = new Intl.DateTimeFormat(locale.value, { month: 'numeric', day: 'numeric' }).format(
      start,
    )
    return t('recurring.yearlyOn', { date })
  }
}
