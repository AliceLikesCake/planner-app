<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BackHeader from '@/components/BackHeader.vue'
import ErrorToast from '@/components/ErrorToast.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import Toggle from '@/components/Toggle.vue'
import { useErrorToast } from '@/composables/useErrorToast'
import { shortTime } from '@/services/dates'
import { currentSavings, formatMoney } from '@/services/money'
import { useAuthStore } from '@/stores/auth'
import { useCategoriesStore } from '@/stores/categories'
import { useMoneyStore } from '@/stores/money'
import { useRecurringStore } from '@/stores/recurring'
import { useSettingsStore } from '@/stores/settings'
import { paletteVars } from '@/styles/palette'
import type { Locale } from '@/i18n'
import type { SettingsRow } from '@/types/db'

const { t } = useI18n()
const settings = useSettingsStore()
const auth = useAuthStore()
const categories = useCategoriesStore()
const money = useMoneyStore()
const recurring = useRecurringStore()
const { error, showError } = useErrorToast()

type BoolField = {
  [K in keyof SettingsRow]: SettingsRow[K] extends boolean ? K : never
}[keyof SettingsRow]

function save(patch: Partial<SettingsRow>) {
  settings.update(patch).catch((e) => {
    console.error(e)
    showError()
  })
}

const lang = computed<Locale>({
  get: () => settings.lang,
  // The language switches immediately; a failed save only means it isn't stored online.
  set: (value) => void settings.setLang(value).catch(console.error),
})
const weekStart = computed<'mon' | 'sun'>({
  get: () => settings.row?.week_start ?? 'mon',
  set: (value) => save({ week_start: value }),
})
const remindTime = computed({
  get: () => shortTime(settings.row?.habit_remind_time) || '21:30',
  set: (value: string) => {
    if (value) save({ habit_remind_time: value })
  },
})

/** A two-way binding for a yes/no setting. */
function flag(field: BoolField) {
  return computed({
    get: () => !!settings.row?.[field],
    set: (value: boolean) => save({ [field]: value }),
  })
}

const flags = {
  rollover_tasks: flag('rollover_tasks'),
  sound: flag('sound'),
  push: flag('push'),
  remind_deliver: flag('remind_deliver'),
  remind_overdue: flag('remind_overdue'),
  auto_sync_calendar: flag('auto_sync_calendar'),
  auto_sync_money: flag('auto_sync_money'),
}

const taskDots = computed(() => categories.ofType('task').map((c) => c.color))
const savings = computed(() => currentSavings(settings.row, money.items))

type Row =
  | { kind: 'toggle'; label: string; sub?: string; field: keyof typeof flags }
  | { kind: 'link'; label: string; sub?: string; value?: string; to: string; dots?: string[] }
  | { kind: 'time'; label: string }
  | { kind: 'disabled'; label: string; sub: string }

const sections = computed<{ title: string; rows: Row[] }[]>(() => [
  {
    title: t('settings.todayCake'),
    rows: [
      {
        kind: 'link',
        label: t('settings.categories'),
        sub: t('settings.categoriesSub'),
        to: '/settings/categories',
        dots: taskDots.value,
      },
      {
        kind: 'toggle',
        label: t('settings.rollover'),
        sub: t('settings.rolloverSub'),
        field: 'rollover_tasks',
      },
      {
        kind: 'link',
        label: t('settings.cakes'),
        sub: t('settings.cakesSub'),
        value: t('settings.cakesValue'),
        to: '/settings/cakes',
      },
    ],
  },
  {
    title: t('settings.notify'),
    rows: [
      { kind: 'toggle', label: t('settings.sound'), sub: t('settings.soundSub'), field: 'sound' },
      { kind: 'toggle', label: t('settings.push'), sub: t('settings.pushSub'), field: 'push' },
      {
        kind: 'toggle',
        label: t('settings.remindDeliver'),
        sub: t('settings.remindDeliverSub'),
        field: 'remind_deliver',
      },
      {
        kind: 'toggle',
        label: t('settings.remindOverdue'),
        sub: t('settings.remindOverdueSub'),
        field: 'remind_overdue',
      },
      { kind: 'time', label: t('settings.habitRemindTime') },
    ],
  },
  {
    title: t('settings.autoSync'),
    rows: [
      {
        kind: 'toggle',
        label: t('settings.syncCalendar'),
        sub: t('settings.syncCalendarSub'),
        field: 'auto_sync_calendar',
      },
      {
        kind: 'toggle',
        label: t('settings.syncMoney'),
        sub: t('settings.syncMoneySub'),
        field: 'auto_sync_money',
      },
    ],
  },
  {
    title: t('settings.money'),
    rows: [
      {
        kind: 'link',
        label: t('settings.budget'),
        value: formatMoney(settings.row?.budget_total ?? 0),
        to: '/settings/budget',
      },
      {
        kind: 'link',
        label: t('settings.savings'),
        value: savings.value === null ? t('settings.unset') : formatMoney(savings.value),
        to: '/settings/savings',
      },
      {
        kind: 'link',
        label: t('recurring.title'),
        sub: t('recurring.sub'),
        value: recurring.items.length ? t('recurring.count', { n: recurring.items.length }) : '',
        to: '/settings/recurring',
      },
      {
        kind: 'link',
        label: t('settings.moneyCategories'),
        sub: t('settings.moneyCategoriesSub'),
        to: '/settings/categories?tab=money',
      },
      {
        kind: 'link',
        label: t('settings.export'),
        sub: t('settings.exportSub'),
        to: '/settings/export',
      },
    ],
  },
  {
    title: t('settings.data'),
    rows: [
      {
        kind: 'link',
        label: t('settings.backup'),
        value: t('settings.backupValue'),
        to: '/settings/backup',
      },
      { kind: 'disabled', label: t('settings.feedback'), sub: t('settings.feedbackSoon') },
    ],
  },
])
</script>

<template>
  <main class="page">
    <BackHeader :title="t('settings.title')" fallback="/" />
    <div class="page-body list">
      <RouterLink to="/settings/backup" class="account card">
        <span class="avatar">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="9" r="3.5" />
            <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
          </svg>
        </span>
        <span class="text">
          <span class="account-name">{{ t('settings.account') }}</span>
          <span v-if="auth.user?.email" class="sub ellipsis">{{ auth.user.email }}</span>
        </span>
        <svg class="chevron" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </RouterLink>

      <section class="section">
        <h2 class="section-title">{{ t('settings.general') }}</h2>
        <div class="card rows">
          <div class="row">
            <span class="label">{{ t('settings.language') }}</span>
            <SegmentedControl
              v-model="lang"
              :options="[
                { value: 'zh-TW', label: t('settings.langZh') },
                { value: 'en', label: t('settings.langEn') },
              ]"
              :label="t('settings.language')"
            />
          </div>
          <div class="row">
            <span class="label">{{ t('settings.weekStart') }}</span>
            <SegmentedControl
              v-model="weekStart"
              :options="[
                { value: 'mon', label: t('settings.mon') },
                { value: 'sun', label: t('settings.sun') },
              ]"
              :label="t('settings.weekStart')"
            />
          </div>
          <div class="row tall">
            <span class="text">
              <span class="label">{{ t('settings.dark') }}</span>
              <span class="sub">{{ t('settings.darkSub') }}</span>
            </span>
            <Toggle :model-value="false" :label="t('settings.dark')" disabled />
          </div>
        </div>
      </section>

      <section v-for="sec in sections" :key="sec.title" class="section">
        <h2 class="section-title">{{ sec.title }}</h2>
        <div class="card rows">
          <template v-for="row in sec.rows" :key="row.label">
            <div v-if="row.kind === 'toggle'" class="row" :class="{ tall: row.sub }">
              <span class="text">
                <span class="label">{{ row.label }}</span>
                <span v-if="row.sub" class="sub">{{ row.sub }}</span>
              </span>
              <Toggle v-model="flags[row.field].value" :label="row.label" />
            </div>
            <RouterLink
              v-else-if="row.kind === 'link'"
              :to="row.to"
              class="row"
              :class="{ tall: row.sub }"
            >
              <span class="text">
                <span class="label">{{ row.label }}</span>
                <span v-if="row.sub" class="sub">{{ row.sub }}</span>
              </span>
              <span class="value">
                <span v-for="(d, i) in row.dots" :key="i" class="dot" :style="paletteVars(d)" />
                <span v-if="row.value" class="num">{{ row.value }}</span>
                <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </RouterLink>
            <div v-else-if="row.kind === 'time'" class="row">
              <label for="habit-time" class="label">{{ row.label }}</label>
              <input id="habit-time" v-model.lazy="remindTime" class="time-input num" type="time" />
            </div>
            <div v-else class="row tall disabled">
              <span class="text">
                <span class="label">{{ row.label }}</span>
                <span class="sub">{{ row.sub }}</span>
              </span>
            </div>
          </template>
        </div>
      </section>

      <p class="version">{{ t('settings.version', { v: '1.0.0' }) }}</p>
    </div>
    <ErrorToast :message="error" />
  </main>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card {
  border-radius: 20px;
  background: var(--surface);
}

.account {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 8px;
  color: inherit;
  text-decoration: none;
}

.avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--rose-fill);
  color: var(--rose-text);
}

.account-name {
  font-size: 16px;
  font-weight: 700;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.section-title {
  margin: 0;
  padding: 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}

.rows {
  padding: 0 16px;
}

.row {
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  color: inherit;
  text-decoration: none;
}

.row.tall {
  min-height: 64px;
}

.row + .row {
  border-top: 1px solid var(--divider);
}

.row.disabled .label {
  color: var(--faint);
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label {
  flex: 1;
  font-size: 15px;
}

.sub {
  font-size: 12px;
  color: var(--muted);
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--muted);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c-deep);
}

.chevron {
  flex-shrink: 0;
  fill: none;
  stroke: var(--done-dot);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.time-input {
  min-height: var(--tap);
  border: none;
  outline: none;
  background: transparent;
  color: var(--muted);
  font-size: 16px;
  text-align: right;
}

.time-input::-webkit-date-and-time-value {
  text-align: right;
}

.version {
  margin: 0;
  padding: 4px 0 8px;
  text-align: center;
  font-size: 12px;
  color: var(--done-dot);
}
</style>
