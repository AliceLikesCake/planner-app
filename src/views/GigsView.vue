<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ErrorToast from '@/components/ErrorToast.vue'
import GigCard, { type GigStep } from '@/components/GigCard.vue'
import { useErrorToast } from '@/composables/useErrorToast'
import { useToday } from '@/composables/useToday'
import { formatMoney } from '@/services/money'
import { PRODUCTS } from '@/services/products'
import { updateGig } from '@/services/sync'
import { useGigsStore } from '@/stores/gigs'
import { paletteVars } from '@/styles/palette'
import type { GigRow, ProductCategory } from '@/types/db'

const { t } = useI18n()
const gigs = useGigsStore()
const today = useToday()
const { error, showError } = useErrorToast()

// ---- totals ----
const totals = computed(() => {
  const month = today.value.slice(0, 7)
  const year = today.value.slice(0, 4)
  let paidMonth = 0
  let unpaid = 0
  let paidYear = 0
  for (const g of gigs.items) {
    if (!g.paid_at) unpaid += g.amount
    else {
      if (g.paid_at.startsWith(month)) paidMonth += g.amount
      if (g.paid_at.startsWith(year)) paidYear += g.amount
    }
  }
  return { paidMonth, unpaid, paidYear }
})

// ---- filters ----
type PayFilter = 'all' | 'unpaid' | 'paid'
const payFilter = ref<PayFilter>('all')
const productFilter = ref<ProductCategory | 'all'>('all')

const payFilters = computed(() => [
  { id: 'all' as const, label: t('common.all') },
  { id: 'unpaid' as const, label: t('gigs.unpaid') },
  { id: 'paid' as const, label: t('gigs.paid') },
])

// Unpaid first, soonest payment date first; then the most recently paid.
const shown = computed(() =>
  gigs.items
    .filter((g) => payFilter.value === 'all' || (payFilter.value === 'paid') === !!g.paid_at)
    .filter((g) => productFilter.value === 'all' || g.product_category === productFilter.value)
    .sort((a, b) => {
      if (!!a.paid_at !== !!b.paid_at) return a.paid_at ? 1 : -1
      if (a.paid_at && b.paid_at) return b.paid_at.localeCompare(a.paid_at)
      return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
    }),
)

// ---- step circles ----
async function step(gig: GigRow, key: GigStep) {
  const patch =
    key === 'paid'
      ? { paid_at: gig.paid_at ? null : today.value }
      : key === 'contract'
        ? { contract_signed: !gig.contract_signed }
        : key === 'labor'
          ? { labor_signed: !gig.labor_signed }
          : key === 'delivered'
            ? { delivered: !gig.delivered }
            : { is_live: !gig.is_live }
  try {
    await updateGig(gig.id, patch)
  } catch (e) {
    console.error(e)
    showError()
  }
}
</script>

<template>
  <main class="page">
    <div class="page-body gigs">
      <h1 class="title">{{ t('gigs.title') }}</h1>

      <div class="stats">
        <div class="stat paid">
          <span class="stat-label">{{ t('gigs.paidMonth') }}</span>
          <span class="stat-value num">{{ formatMoney(totals.paidMonth) }}</span>
        </div>
        <div class="stat pending">
          <span class="stat-label">{{ t('gigs.unpaid') }}</span>
          <span class="stat-value num">{{ formatMoney(totals.unpaid) }}</span>
        </div>
        <div class="stat year">
          <span class="stat-label">{{ t('gigs.paidYear') }}</span>
          <span class="stat-value num">{{ formatMoney(totals.paidYear) }}</span>
        </div>
      </div>

      <div class="filters">
        <div class="row" role="group" :aria-label="t('gigs.payFilter')">
          <button
            v-for="f in payFilters"
            :key="f.id"
            type="button"
            class="pay-chip"
            :class="{ on: payFilter === f.id }"
            :aria-pressed="payFilter === f.id"
            @click="payFilter = f.id"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="row scroll" role="group" :aria-label="t('gigs.catFilter')">
          <button
            type="button"
            class="cat-chip"
            :class="{ on: productFilter === 'all' }"
            :aria-pressed="productFilter === 'all'"
            @click="productFilter = 'all'"
          >
            {{ t('gigs.allCategories') }}
          </button>
          <button
            v-for="p in PRODUCTS"
            :key="p.key"
            type="button"
            class="cat-chip"
            :class="{ on: productFilter === p.key }"
            :style="paletteVars(p.color)"
            :aria-pressed="productFilter === p.key"
            @click="productFilter = p.key"
          >
            {{ t(`product.${p.key}`) }}
          </button>
        </div>
      </div>

      <GigCard v-for="g in shown" :key="g.id" :gig="g" :today="today" @step="step(g, $event)" />
      <p v-if="!shown.length" class="empty">{{ t('gigs.empty') }}</p>
    </div>
    <ErrorToast :message="error" />
  </main>
</template>

<style scoped>
.gigs {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 16px 110px;
}

.title {
  margin: 0;
  padding: 0 4px;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 400;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 20px;
}

.stat-label {
  font-size: 12px;
  font-weight: 700;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 19px;
  overflow-wrap: anywhere;
}

.stat.paid {
  background: var(--paid-bg);
  color: var(--paid-fg);
}

.stat.pending {
  background: var(--pending-bg);
  color: var(--pending-fg);
}

.stat.year {
  background: var(--lav-fill);
  color: var(--lav-text);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  gap: 8px;
  padding: 0 2px;
}

.row.scroll {
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.row.scroll::-webkit-scrollbar {
  display: none;
}

.pay-chip {
  flex-shrink: 0;
  min-height: var(--tap);
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--chip);
  color: var(--ink-2);
  font-size: 14px;
  font-weight: 500;
}

.pay-chip.on {
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 700;
}

.cat-chip {
  flex-shrink: 0;
  min-height: var(--tap);
  padding: 0 12px;
  border: 1px solid var(--divider);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 500;
}

.cat-chip.on {
  border-color: transparent;
  background: var(--c-fill, var(--done-chip));
  color: var(--c-text, var(--ink));
  font-weight: 700;
}

.empty {
  margin: 0;
  padding: 20px;
  border-radius: 22px;
  background: var(--surface);
  text-align: center;
  font-size: 14px;
  color: var(--muted);
}
</style>
