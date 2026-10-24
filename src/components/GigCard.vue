<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { fromKey } from '@/services/dates'
import { GIG_STEPS, isStepDone, type GigStep } from '@/services/gigSteps'
import { formatMoney } from '@/services/money'
import { knownFormats, product } from '@/services/products'
import { paletteVars } from '@/styles/palette'
import type { GigRow } from '@/types/db'

const props = defineProps<{ gig: GigRow; today: string }>()
defineEmits<{ step: [step: GigStep] }>()

const { t, locale } = useI18n()

const info = computed(() => product(props.gig.product_category))
const paid = computed(() => !!props.gig.paid_at)
const overdue = computed(
  () => !paid.value && !!props.gig.due_date && props.gig.due_date < props.today,
)
const status = computed(() => (paid.value ? 'paid' : overdue.value ? 'overdue' : 'pending'))

const kind = computed(() =>
  knownFormats(props.gig.formats).length
    ? knownFormats(props.gig.formats)
        .map((f) => t(`gigs.formats.${f}`))
        .join(locale.value === 'en' ? ', ' : '、')
    : t('gigs.noFormat'),
)

const md = (key: string) =>
  new Intl.DateTimeFormat(locale.value, { month: '2-digit', day: '2-digit' }).format(fromKey(key))

const liveText = computed(() => {
  const g = props.gig
  if (!g.live_date) return t('gigs.liveTbd')
  return t(g.is_live ? 'gigs.liveOn' : 'gigs.liveExpected', { date: md(g.live_date) })
})

const payText = computed(() => {
  const g = props.gig
  if (g.paid_at) return t('gigs.paidOn', { date: md(g.paid_at) })
  if (!g.due_date) return t('gigs.dueTbd')
  return t(overdue.value ? 'gigs.dueOverdue' : 'gigs.dueOn', { date: md(g.due_date) })
})

// 合約 → 交稿 → 上線 → 勞報單 → 入帳 (DECISIONS 56)
const steps = computed(() =>
  GIG_STEPS.map((key) => {
    const on = isStepDone(props.gig, key)
    return {
      key,
      on,
      late: key === 'paid' && overdue.value,
      label: t(`gigs.steps.${key}`),
      aria: t('gigs.stepAria', {
        step: t(`gigs.steps.${key}`),
        state: t(on ? `gigs.stepOn.${key}` : `gigs.stepOff.${key}`),
      }),
    }
  }),
)
</script>

<template>
  <article class="gig">
    <RouterLink
      :to="`/edit/gig/${gig.id}`"
      class="head"
      :aria-label="t('gigs.openGig', { brand: gig.brand })"
    >
      <span class="icon" :style="paletteVars(info.color)">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          v-html="info.icon"
        />
      </span>
      <span class="who">
        <span class="brand">{{ gig.brand }}</span>
        <span class="kind">{{ t(`product.${gig.product_category}`) }} · {{ kind }}</span>
      </span>
      <span class="money">
        <span class="amount num">{{ formatMoney(gig.amount) }}</span>
        <span class="pill" :class="status">{{
          t(paid ? 'gigs.paid' : overdue ? 'gigs.overdue' : 'gigs.unpaid')
        }}</span>
      </span>
    </RouterLink>

    <div class="steps">
      <button
        v-for="s in steps"
        :key="s.key"
        type="button"
        class="step"
        :class="{ on: s.on, late: s.late, pay: s.key === 'paid' }"
        :aria-pressed="s.on"
        :aria-label="s.aria"
        @click="$emit('step', s.key)"
      >
        <span class="dot">
          <svg
            v-if="s.on"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12l5 5 9-10" />
          </svg>
        </span>
        <span class="step-label">{{ s.label }}</span>
      </button>
    </div>

    <div class="foot num">
      <span>{{ liveText }}</span>
      <span :class="{ late: overdue }">{{ payText }}</span>
    </div>
  </article>
</template>

<style scoped>
.gig {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 16px 14px;
  border-radius: 22px;
  background: var(--surface);
}

.head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--c-fill);
  color: var(--c-text);
}

.who {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.brand {
  font-size: 17px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.kind {
  font-size: 13px;
  color: var(--muted);
}

.money {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

.amount {
  font-size: 17px;
  font-weight: 700;
}

.pill {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.pill.paid {
  background: var(--paid-bg);
  color: var(--paid-fg);
}

.pill.pending {
  background: var(--pending-bg);
  color: var(--pending-fg);
}

.pill.overdue {
  background: var(--overdue-bg);
  color: var(--overdue-fg);
}

.steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
}

.step {
  height: 56px;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: none;
  background: transparent;
}

.dot {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--dashed);
  border-radius: 50%;
  background: var(--surface);
  color: var(--on-primary);
}

.step.on .dot {
  border: none;
  background: var(--switch-on);
}

.step.pay.on .dot {
  background: var(--paid-dot);
}

.step.late .dot {
  border-color: var(--overdue-dot);
}

.step-label {
  font-size: 12px;
  white-space: nowrap;
  color: var(--faint);
}

.step.on .step-label {
  color: var(--ink);
  font-weight: 700;
}

.step.late .step-label {
  color: var(--overdue-fg);
  font-weight: 700;
}

.foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--chip);
  font-size: 12px;
  color: var(--muted);
}

.foot .late {
  color: var(--overdue-fg);
  font-weight: 700;
}
</style>
