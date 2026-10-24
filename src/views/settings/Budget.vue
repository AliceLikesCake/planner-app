<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BackHeader from '@/components/BackHeader.vue'
import ErrorToast from '@/components/ErrorToast.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import Toggle from '@/components/Toggle.vue'
import { useErrorToast } from '@/composables/useErrorToast'
import { useToday } from '@/composables/useToday'
import { formatMoney, periodContaining, summarize } from '@/services/money'
import { useCategoriesStore } from '@/stores/categories'
import { useMoneyStore } from '@/stores/money'
import { useSettingsStore } from '@/stores/settings'
import { paletteVars } from '@/styles/palette'

const { t } = useI18n()
const today = useToday()
const settings = useSettingsStore()
const categories = useCategoriesStore()
const money = useMoneyStore()
const { error, showError } = useErrorToast()

function save(patch: Parameters<typeof settings.update>[0]) {
  settings.update(patch).catch((e) => {
    console.error(e)
    showError()
  })
}

const startDay = computed(() => settings.row?.month_start_day ?? 1)
const summary = computed(() =>
  summarize(money.items, periodContaining(today.value, startDay.value)),
)

// ---- total (SPEC 4.7: ±1000) ----
const total = computed(() => settings.row?.budget_total ?? 0)
const parse = (text: string) => Math.max(0, Number(text.replace(/[^\d]/g, '')) || 0)
const usedPct = computed(() =>
  total.value ? Math.round((summary.value.expense / total.value) * 100) : 0,
)

// ---- by category (±500) ----
const limits = computed(() => settings.row?.budget_by_category ?? {})
const allocated = computed(() =>
  categories.ofType('expense').reduce((sum, c) => sum + (limits.value[c.id] ?? 0), 0),
)
const rows = computed(() =>
  categories.ofType('expense').map((c) => {
    const limit = limits.value[c.id] ?? 0
    const used = summary.value.expenseByCategory.find((x) => x.categoryId === c.id)?.amount ?? 0
    const pct = limit ? used / limit : 0
    return {
      category: c,
      name: categories.name(c),
      limit,
      used,
      pct,
      level: !limit ? 'none' : used > limit ? 'over' : pct >= 0.8 ? 'near' : 'ok',
    }
  }),
)

function setLimit(id: string, value: number) {
  save({ budget_by_category: { ...limits.value, [id]: Math.max(0, value) } })
}

const warn = computed({
  get: () => settings.row?.budget_warn ?? true,
  set: (v: boolean) => save({ budget_warn: v }),
})
const start = computed<'1' | '5'>({
  get: () => (startDay.value === 5 ? '5' : '1'),
  set: (v) => save({ month_start_day: Number(v) }),
})
</script>

<template>
  <main class="page">
    <BackHeader :title="t('settings.budget')" fallback="/settings" />
    <div class="page-body list">
      <section class="card total">
        <div class="total-head">
          <span class="title">{{ t('budget.total') }}</span>
          <span class="sub num">{{
            t('budget.allocated', { amount: formatMoney(allocated) })
          }}</span>
        </div>
        <div class="stepper big">
          <button
            type="button"
            class="step"
            :aria-label="t('budget.minus', { name: t('budget.total'), step: formatMoney(1000) })"
            @click="save({ budget_total: Math.max(0, total - 1000) })"
          >
            −
          </button>
          <input
            class="amount num"
            type="text"
            inputmode="numeric"
            :value="formatMoney(total)"
            :aria-label="t('budget.amountAria', { name: t('budget.total') })"
            @change="save({ budget_total: parse(($event.target as HTMLInputElement).value) })"
          />
          <button
            type="button"
            class="step"
            :aria-label="t('budget.plus', { name: t('budget.total'), step: formatMoney(1000) })"
            @click="save({ budget_total: total + 1000 })"
          >
            ＋
          </button>
        </div>
        <div class="bar">
          <div
            class="bar-fill"
            :class="{ over: usedPct > 100 }"
            :style="{ width: Math.min(usedPct, 100) + '%' }"
          />
        </div>
        <span class="sub num">
          {{
            summary.expense > total
              ? t('budget.usedOver', {
                  used: formatMoney(summary.expense),
                  pct: usedPct,
                  over: formatMoney(summary.expense - total),
                })
              : t('budget.used', {
                  used: formatMoney(summary.expense),
                  pct: usedPct,
                  left: formatMoney(total - summary.expense),
                })
          }}
        </span>
      </section>

      <section class="card">
        <div class="section-head">
          <span class="title">{{ t('budget.byCategory') }}</span>
          <span class="sub">{{ t('budget.byCategorySub') }}</span>
        </div>
        <div
          v-for="r in rows"
          :key="r.category.id"
          class="cat"
          :style="paletteVars(r.category.color)"
        >
          <div class="cat-head">
            <span class="dot" />
            <span class="cat-name">{{ r.name }}</span>
            <div class="stepper">
              <button
                type="button"
                class="step small"
                :aria-label="t('budget.minus', { name: r.name, step: formatMoney(500) })"
                @click="setLimit(r.category.id, r.limit - 500)"
              >
                −
              </button>
              <input
                class="cat-amount num"
                type="text"
                inputmode="numeric"
                :value="r.limit ? formatMoney(r.limit) : t('budget.noLimit')"
                :aria-label="t('budget.amountAria', { name: r.name })"
                @focus="($event.target as HTMLInputElement).select()"
                @change="setLimit(r.category.id, parse(($event.target as HTMLInputElement).value))"
              />
              <button
                type="button"
                class="step small"
                :aria-label="t('budget.plus', { name: r.name, step: formatMoney(500) })"
                @click="setLimit(r.category.id, r.limit + 500)"
              >
                ＋
              </button>
            </div>
          </div>
          <div v-if="r.limit" class="cat-usage">
            <div class="bar thin">
              <div
                class="bar-fill cat-fill"
                :class="r.level"
                :style="{ width: Math.min(100, Math.round(r.pct * 100)) + '%' }"
              />
            </div>
            <span class="left num" :class="r.level">
              {{
                r.level === 'over'
                  ? t('budget.over', { amount: formatMoney(r.used - r.limit) })
                  : t('budget.left', { amount: formatMoney(r.limit - r.used) })
              }}
            </span>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="row tall">
          <span class="text">
            <span>{{ t('budget.warn') }}</span>
            <span class="sub">{{ t('budget.warnSub') }}</span>
          </span>
          <Toggle v-model="warn" :label="t('budget.warn')" />
        </div>
        <div class="row">
          <span class="text">{{ t('budget.startDay') }}</span>
          <SegmentedControl
            v-model="start"
            :options="[
              { value: '1', label: t('budget.start1') },
              { value: '5', label: t('budget.start5') },
            ]"
            :label="t('budget.startDay')"
          />
        </div>
      </section>
    </div>
    <ErrorToast :message="error" />
  </main>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  padding: 4px 16px;
  border-radius: 20px;
  background: var(--surface);
}

.title {
  font-size: 15px;
  font-weight: 700;
}

.sub {
  font-size: 12px;
  color: var(--muted);
}

.total {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
}

.total-head,
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.section-head {
  flex-direction: column;
  padding: 12px 0 4px;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stepper.big {
  justify-content: space-between;
}

.step {
  width: var(--tap);
  height: var(--tap);
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: var(--chip);
  color: var(--ink);
  font-size: 20px;
  font-weight: 700;
}

.amount {
  min-width: 0;
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 30px;
  text-align: center;
}

.bar {
  height: 8px;
  border-radius: 4px;
  background: var(--chip);
  overflow: hidden;
}

.bar.thin {
  flex: 1;
  height: 6px;
  border-radius: 3px;
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--budget-bar);
}

.bar-fill.over {
  background: var(--overdue-dot);
}

.cat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 0;
}

.cat + .cat {
  border-top: 1px solid var(--divider);
}

.cat-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--c-deep);
}

.cat-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
}

.cat-amount {
  width: 92px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}

.cat-usage {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 20px;
}

.cat-fill {
  background: var(--c-deep);
}

.left {
  width: 96px;
  text-align: right;
  font-size: 12px;
  color: var(--muted);
}

.left.near {
  color: var(--peach-text);
  font-weight: 700;
}

.left.over {
  color: var(--overdue-fg);
  font-weight: 700;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
}

.row.tall {
  min-height: 64px;
}

.row + .row {
  border-top: 1px solid var(--divider);
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 15px;
}
</style>
