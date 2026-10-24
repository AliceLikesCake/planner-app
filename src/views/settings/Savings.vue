<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AddHeader from '@/components/AddHeader.vue'
import DeleteButton from '@/components/DeleteButton.vue'
import NumberPad from '@/components/NumberPad.vue'
import { useToday } from '@/composables/useToday'
import {
  entriesSinceSavings,
  formatMoney,
  formatSigned,
  netOf,
  periodContaining,
} from '@/services/money'
import { useMoneyStore } from '@/stores/money'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const router = useRouter()
const today = useToday()
const settings = useSettingsStore()
const money = useMoneyStore()

const row = settings.row
const inUse = row?.savings_amount != null
// Defaults to the start of this month, so this month's entries are counted (DECISIONS 44).
const date = ref(
  row?.savings_date ?? periodContaining(today.value, row?.month_start_day ?? 1).start,
)
const digits = ref(inUse ? String(Math.max(0, row!.savings_amount!)) : '')
const amount = computed(() => Number(digits.value) || 0)
const saving = ref(false)
const failed = ref(false)

function press(key: string) {
  if (key === 'del') digits.value = digits.value.slice(0, -1)
  else if (digits.value.length < 10) digits.value = (digits.value + key).replace(/^0+/, '')
}

// Live preview of what the Money page will show.
const net = computed(() => netOf(entriesSinceSavings({ savings_date: date.value }, money.items)))
const result = computed(() => amount.value + net.value)

function leave() {
  if (window.history.state?.back) router.back()
  else router.replace('/money')
}

async function save(fields: {
  savings_amount: number | null
  savings_date: string | null
  savings_set_at: string | null
}) {
  saving.value = true
  failed.value = false
  try {
    await settings.update(fields)
    leave()
  } catch (error) {
    console.error(error)
    failed.value = true
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="page">
    <AddHeader
      :title="t('savings.title')"
      :can-save="!!digits && !!date && !saving"
      @save="
        save({
          savings_amount: amount,
          savings_date: date,
          savings_set_at: new Date().toISOString(),
        })
      "
    />

    <div class="page-body form">
      <p v-if="failed" class="error" role="alert">{{ t('today.saveError') }}</p>

      <div class="card amount-card">
        <output class="amount num" :aria-label="t('savings.amount')">{{
          formatMoney(amount)
        }}</output>
      </div>

      <div class="card rows">
        <div class="row tall">
          <label for="savings-date" class="row-text">
            <span>{{ t('savings.date') }}</span>
            <span class="sub">{{ t('savings.dateSub') }}</span>
          </label>
          <input id="savings-date" v-model="date" class="value-input" type="date" required />
        </div>
        <div class="row">
          <span>{{ t('savings.net') }}</span>
          <span class="num">{{ formatSigned(net) }}</span>
        </div>
        <div class="row">
          <span class="strong">{{ t('savings.result') }}</span>
          <span class="strong num">{{ formatMoney(result) }}</span>
        </div>
      </div>

      <div class="card field">
        <p class="text">{{ t('savings.hint') }}</p>
        <p class="sub">{{ t('savings.adjust') }}</p>
      </div>

      <DeleteButton
        v-if="inUse"
        :label="t('savings.clear')"
        :hint="t('savings.clearHint')"
        :busy="saving"
        @confirm="save({ savings_amount: null, savings_date: null, savings_set_at: null })"
      />
    </div>

    <NumberPad @key="press" />
  </main>
</template>

<style scoped>
.amount-card {
  display: flex;
  justify-content: flex-end;
  padding: 18px 16px;
}

.amount {
  font-family: var(--font-display);
  font-size: 34px;
  overflow-wrap: anywhere;
}

.strong {
  font-weight: 700;
}

.text,
.sub {
  margin: 0;
  line-height: 1.6;
}

.text {
  font-size: 14px;
}
</style>
