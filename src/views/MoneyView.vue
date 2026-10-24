<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CategoryIcon from '@/components/CategoryIcon.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { useToday } from '@/composables/useToday'
import { fromKey } from '@/services/dates'
import {
  currentSavings,
  formatMoney,
  formatSigned,
  periodContaining,
  periodOf,
  summarize,
} from '@/services/money'
import { useCategoriesStore } from '@/stores/categories'
import { useMoneyStore } from '@/stores/money'
import { useSettingsStore } from '@/stores/settings'
import { paletteVars } from '@/styles/palette'
import type { TransactionRow } from '@/types/db'

const { t, locale } = useI18n()
const today = useToday()
const money = useMoneyStore()
const categories = useCategoriesStore()
const settings = useSettingsStore()

// ---- month (a budget period that may start on payday, SPEC 4.7) ----
const startDay = computed(() => settings.row?.month_start_day ?? 1)
const offset = ref(0)
const period = computed(() => {
  const current = periodContaining(today.value, startDay.value)
  return periodOf(current.year, current.monthIndex + offset.value, startDay.value)
})
const title = computed(() => {
  const d = new Date(period.value.year, period.value.monthIndex, 1)
  const month =
    locale.value === 'en'
      ? new Intl.DateTimeFormat('en', { month: 'long' }).format(d)
      : d.getMonth() + 1
  return t('calendar.title', { year: d.getFullYear(), month })
})

const summary = computed(() => summarize(money.items, period.value))

// 目前存款 (DECISIONS 44), independent of the month shown.
const savings = computed(() => currentSavings(settings.row, money.items))

// ---- budget ----
const budget = computed(() => settings.row?.budget_total ?? 0)
const usedPct = computed(() =>
  budget.value ? Math.round((summary.value.expense / budget.value) * 100) : 0,
)
const left = computed(() => budget.value - summary.value.expense)
// 快超支提醒 (settings.budget_warn): in-app until push notifications exist.
const nearLimit = computed(
  () => (settings.row?.budget_warn ?? true) && left.value >= 0 && usedPct.value >= 80,
)

// ---- by category ----
const view = ref<'expense' | 'income'>('expense')
const viewOptions = computed(() => [
  { value: 'expense' as const, label: t('money.expense') },
  { value: 'income' as const, label: t('money.income') },
])
const ranking = computed(() =>
  (view.value === 'expense' ? summary.value.expenseByCategory : summary.value.incomeByCategory).map(
    (row) => {
      const category = categories.byId(row.categoryId)
      return { ...row, category, name: categories.name(category) }
    },
  ),
)
const viewTotal = computed(() =>
  view.value === 'expense' ? summary.value.expense : summary.value.income,
)

// ---- entries by day, newest first ----
// 明細 filter: 全部 / 支出 / 收入 (DECISIONS 45). Day totals follow the filter.
const detailFilter = ref<'all' | 'expense' | 'income'>('all')
const detailOptions = computed(() => [
  { value: 'all' as const, label: t('common.all') },
  { value: 'expense' as const, label: t('money.expense') },
  { value: 'income' as const, label: t('money.income') },
])

// …and by category: the chips follow the type picked above.
const detailCategory = ref<string | null>(null)
const detailCategories = computed(() =>
  detailFilter.value === 'all'
    ? [...categories.ofType('expense'), ...categories.ofType('income')]
    : categories.ofType(detailFilter.value),
)
watch(detailFilter, () => {
  if (!detailCategories.value.some((c) => c.id === detailCategory.value))
    detailCategory.value = null
})

const days = computed(() => {
  const groups = new Map<string, TransactionRow[]>()
  const shown = summary.value.entries.filter(
    (tx) =>
      (detailFilter.value === 'all' || tx.type === detailFilter.value) &&
      (detailCategory.value === null || tx.category_id === detailCategory.value),
  )
  const sorted = [...shown].sort(
    (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
  )
  for (const tx of sorted) {
    if (!groups.has(tx.date)) groups.set(tx.date, [])
    groups.get(tx.date)!.push(tx)
  }
  const fmt = new Intl.DateTimeFormat(locale.value, {
    month: 'numeric',
    day: 'numeric',
    weekday: 'long',
  })
  return [...groups.entries()].map(([date, items]) => ({
    date,
    label: fmt.format(fromKey(date)),
    total: items.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0),
    items: items.map((tx) => {
      const category = categories.byId(tx.category_id)
      const categoryName = categories.name(category)
      return { tx, category, categoryName, name: tx.note || categoryName }
    }),
  }))
})
</script>

<template>
  <main class="page">
    <div class="page-body money">
      <header class="top">
        <h1 class="title">{{ t('money.title') }}</h1>
        <div class="month">
          <button
            type="button"
            class="icon-btn plain"
            :aria-label="t('money.prevMonth')"
            @click="offset--"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span class="month-label">{{ title }}</span>
          <button
            type="button"
            class="icon-btn plain"
            :aria-label="t('money.nextMonth')"
            @click="offset++"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </header>

      <section class="card overview">
        <RouterLink
          to="/settings/savings"
          class="savings"
          :aria-label="savings === null ? t('money.setSavings') : t('money.editSavings')"
        >
          <span class="savings-text">
            <template v-if="savings !== null">
              <span class="label">{{ t('money.savings') }}</span>
              <span class="savings-value num" :class="{ negative: savings < 0 }">{{
                formatMoney(savings)
              }}</span>
            </template>
            <template v-else>
              <span class="savings-set">{{ t('money.setSavings') }}</span>
              <span class="label">{{ t('money.setSavingsSub') }}</span>
            </template>
          </span>
          <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </RouterLink>
        <div class="balance">
          <span class="label">{{ t('money.balance') }}</span>
          <span class="balance-value num">{{ formatMoney(summary.balance) }}</span>
        </div>
        <div class="split">
          <div class="side">
            <span class="label">{{ t('money.income') }}</span>
            <span class="side-value income num">{{ formatSigned(summary.income) }}</span>
          </div>
          <div class="side">
            <span class="label">{{ t('money.expense') }}</span>
            <span class="side-value expense num">{{ formatSigned(-summary.expense) }}</span>
          </div>
        </div>
        <div v-if="budget" class="budget">
          <div class="budget-text num">
            <span>{{ t('money.budgetUsed', { budget: formatMoney(budget), pct: usedPct }) }}</span>
            <span :class="{ over: left < 0, near: nearLimit }">{{
              left < 0
                ? t('money.budgetOver', { amount: formatMoney(-left) })
                : nearLimit
                  ? t('money.budgetWarn', { pct: usedPct })
                  : t('money.budgetLeft', { amount: formatMoney(left) })
            }}</span>
          </div>
          <div class="bar">
            <div
              class="bar-fill"
              :class="{ over: left < 0 }"
              :style="{ width: Math.min(usedPct, 100) + '%' }"
            />
          </div>
        </div>
      </section>

      <section class="card ranking">
        <div class="ranking-head">
          <SegmentedControl v-model="view" :options="viewOptions" :label="t('money.viewLabel')" />
          <span class="sum num">{{ t('money.total', { amount: formatMoney(viewTotal) }) }}</span>
        </div>
        <div
          v-for="row in ranking"
          :key="row.categoryId ?? 'none'"
          class="rank-row"
          :style="paletteVars(row.category?.color)"
        >
          <span class="rank-icon"><CategoryIcon :name="row.category?.key" :size="18" /></span>
          <span class="rank-body">
            <span class="rank-line">
              <span class="rank-name">{{ row.name }}</span>
              <span class="rank-amount num">{{ formatMoney(row.amount) }}</span>
            </span>
            <span class="rank-line">
              <span class="rank-bar"
                ><span class="rank-fill" :style="{ width: row.pct.toFixed(1) + '%' }"
              /></span>
              <span class="rank-pct num">{{ Math.round(row.pct) }}%</span>
            </span>
          </span>
        </div>
        <p v-if="!ranking.length" class="empty">
          {{
            t('money.emptyType', {
              type: view === 'expense' ? t('money.expense') : t('money.income'),
            })
          }}
        </p>
      </section>

      <section class="details">
        <div class="details-head">
          <h2 class="details-title">{{ t('money.detail') }}</h2>
          <RouterLink to="/settings/export" class="export">{{ t('money.export') }}</RouterLink>
        </div>
        <SegmentedControl
          v-model="detailFilter"
          class="detail-filter"
          :options="detailOptions"
          :label="t('money.detailFilter')"
        />
        <div class="cat-chips" role="group" :aria-label="t('money.categoryFilter')">
          <button
            type="button"
            class="cat-chip"
            :class="{ on: detailCategory === null }"
            :aria-pressed="detailCategory === null"
            @click="detailCategory = null"
          >
            {{ t('money.allCategories') }}
          </button>
          <button
            v-for="c in detailCategories"
            :key="c.id"
            type="button"
            class="cat-chip"
            :class="{ on: detailCategory === c.id }"
            :style="paletteVars(c.color)"
            :aria-pressed="detailCategory === c.id"
            @click="detailCategory = c.id"
          >
            <span class="chip-dot" />{{ categories.name(c) }}
          </button>
        </div>
        <div v-for="day in days" :key="day.date" class="card day">
          <div class="day-head num">
            <span class="day-label">{{ day.label }}</span>
            <span>{{ formatSigned(day.total) }}</span>
          </div>
          <RouterLink
            v-for="item in day.items"
            :key="item.tx.id"
            :to="`/edit/money/${item.tx.id}`"
            class="entry"
            :style="paletteVars(item.category?.color)"
            :aria-label="t('money.editEntry', { name: item.name })"
          >
            <span class="entry-dot" />
            <span class="entry-text">
              <span class="entry-name">{{ item.name }}</span>
              <span class="entry-meta">{{ item.categoryName }}</span>
            </span>
            <span class="entry-amount num" :class="{ income: item.tx.type === 'income' }">
              {{ formatSigned(item.tx.type === 'income' ? item.tx.amount : -item.tx.amount) }}
            </span>
          </RouterLink>
        </div>
        <p v-if="!days.length" class="card empty-card">
          {{
            detailCategory !== null
              ? t('money.emptyType', { type: categories.name(categories.byId(detailCategory)) })
              : detailFilter === 'all'
                ? t('money.empty')
                : t('money.emptyType', {
                    type: t(detailFilter === 'expense' ? 'money.expense' : 'money.income'),
                  })
          }}
        </p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.money {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 16px 110px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 400;
}

.month {
  display: flex;
  align-items: center;
  gap: 2px;
}

.month-label {
  font-size: 15px;
  font-weight: 700;
}

.card {
  border-radius: 22px;
  background: var(--surface);
}

.label {
  font-size: 12px;
  color: var(--muted);
}

/* ---- overview ---- */
.overview {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 16px 16px;
}

.savings {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--chip);
  color: inherit;
  text-decoration: none;
}

.savings-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.savings-value {
  font-family: var(--font-display);
  font-size: 34px;
}

.savings-value.negative {
  color: var(--overdue-fg);
}

.savings-set {
  font-size: 15px;
  font-weight: 700;
}

.chevron {
  flex-shrink: 0;
  fill: none;
  stroke: var(--done-dot);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.balance {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.balance .label {
  font-size: 13px;
}

.balance-value {
  font-family: var(--font-display);
  font-size: 26px;
}

.split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding-top: 12px;
  border-top: 1px solid var(--chip);
}

.side {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.side:first-child {
  padding-right: 12px;
  border-right: 1px solid var(--chip);
}

.side:last-child {
  padding-left: 14px;
}

.side-value {
  font-size: 20px;
  font-weight: 700;
}

.side-value.income {
  color: var(--paid-fg);
}

.side-value.expense {
  color: var(--peach-text);
}

.budget {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.budget-text {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}

.over {
  color: var(--overdue-fg);
  font-weight: 700;
}

.near {
  color: var(--peach-text);
  font-weight: 700;
}

.bar {
  height: 8px;
  border-radius: 4px;
  background: var(--chip);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--budget-bar);
}

.bar-fill.over {
  background: var(--overdue-dot);
}

/* ---- by category ---- */
.ranking {
  display: flex;
  flex-direction: column;
  padding: 14px 16px 6px;
}

.ranking-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
}

.sum {
  font-size: 13px;
  color: var(--muted);
}

.rank-row {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--surface-muted);
}

.rank-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--c-fill);
  color: var(--c-text);
}

.rank-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 0;
}

.rank-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.rank-name {
  font-size: 15px;
  font-weight: 500;
}

.rank-amount {
  font-size: 15px;
  font-weight: 700;
}

.rank-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--divider);
  overflow: hidden;
}

.rank-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--c-deep);
}

.rank-pct {
  width: 34px;
  text-align: right;
  font-size: 12px;
  color: var(--muted);
}

.empty {
  margin: 0;
  padding: 12px 0 16px;
  font-size: 14px;
  color: var(--muted);
}

/* ---- entries ---- */
.details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.details-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.details-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 400;
}

.export {
  min-height: var(--tap);
  padding: 0 12px;
  display: flex;
  align-items: center;
  border-radius: var(--radius-pill);
  background: var(--chip);
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.detail-filter {
  align-self: flex-start;
}

.cat-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.cat-chips::-webkit-scrollbar {
  display: none;
}

.cat-chip {
  flex-shrink: 0;
  min-height: var(--tap);
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--divider);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 500;
}

.cat-chip.on {
  border-color: transparent;
  background: var(--c-fill, var(--primary));
  color: var(--c-text, var(--on-primary));
  font-weight: 700;
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-deep);
}

.day {
  padding: 4px 16px;
  border-radius: 20px;
}

.day-head {
  height: 38px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--surface-muted);
  font-size: 13px;
  color: var(--muted);
}

.day-label {
  font-weight: 700;
}

.entry {
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}

.entry-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--c-deep);
}

.entry-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.entry-name {
  font-size: 15px;
  overflow-wrap: anywhere;
}

.entry-meta {
  font-size: 12px;
  color: var(--muted);
}

.entry-amount {
  font-size: 15px;
  font-weight: 700;
}

.entry-amount.income {
  color: var(--paid-fg);
}

.empty-card {
  margin: 0;
  padding: 20px;
  text-align: center;
  font-size: 14px;
  color: var(--muted);
}
</style>
