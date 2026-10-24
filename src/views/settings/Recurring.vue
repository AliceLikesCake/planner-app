<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BackHeader from '@/components/BackHeader.vue'
import CategoryIcon from '@/components/CategoryIcon.vue'
import { useScheduleLabel } from '@/composables/useSchedule'
import { useToday } from '@/composables/useToday'
import { fromKey } from '@/services/dates'
import { formatSigned } from '@/services/money'
import { nextDate } from '@/services/recurring'
import { useCategoriesStore } from '@/stores/categories'
import { useRecurringStore } from '@/stores/recurring'
import { paletteVars } from '@/styles/palette'

const { t, locale } = useI18n()
const today = useToday()
const categories = useCategoriesStore()
const recurring = useRecurringStore()
const scheduleLabel = useScheduleLabel()

// 固定收支 (DECISIONS 53): spending first, then income; soonest first within each.
const rows = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, { month: 'numeric', day: 'numeric' })
  return recurring.items
    .map((rule) => {
      const category = categories.byId(rule.category_id)
      const next = nextDate(rule, today.value)
      return {
        rule,
        category,
        name: rule.note || categories.name(category),
        next,
        meta: `${scheduleLabel(rule)} · ${t('recurring.nextOn', { date: fmt.format(fromKey(next)) })}`,
      }
    })
    .sort((a, b) => a.rule.type.localeCompare(b.rule.type) || a.next.localeCompare(b.next))
})
</script>

<template>
  <main class="page">
    <BackHeader :title="t('recurring.title')" fallback="/settings" />
    <div class="page-body list">
      <p class="hint">{{ t('recurring.sub') }}</p>
      <div v-if="rows.length" class="card">
        <RouterLink
          v-for="r in rows"
          :key="r.rule.id"
          :to="`/edit/recurring/${r.rule.id}`"
          class="row"
          :style="paletteVars(r.category?.color)"
        >
          <span class="icon"><CategoryIcon :name="r.category?.key" :size="18" /></span>
          <span class="text">
            <span class="name">{{ r.name }}</span>
            <span class="sub num">{{ r.meta }}</span>
          </span>
          <span class="amount num" :class="r.rule.type">{{
            formatSigned(r.rule.type === 'income' ? r.rule.amount : -r.rule.amount)
          }}</span>
        </RouterLink>
      </div>
      <p v-else class="card empty">{{ t('recurring.empty') }}</p>
      <RouterLink :to="{ path: '/add/money', query: { repeat: 'month' } }" class="add">
        ＋ {{ t('recurring.add') }}
      </RouterLink>
    </div>
  </main>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint {
  margin: 0;
  padding: 0 6px;
  font-size: 12px;
  color: var(--muted);
}

.card {
  padding: 0 16px;
  border-radius: 20px;
  background: var(--surface);
}

.row {
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.row + .row {
  border-top: 1px solid var(--divider);
}

.icon {
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

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 15px;
  overflow-wrap: anywhere;
}

.sub {
  font-size: 12px;
  color: var(--muted);
}

.amount {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 700;
}

.amount.income {
  color: var(--paid-fg);
}

.empty {
  margin: 0;
  padding: 20px 16px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
  text-align: center;
}

.add {
  min-height: var(--tap);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed var(--dashed);
  border-radius: 16px;
  color: var(--ink-2);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}
</style>
