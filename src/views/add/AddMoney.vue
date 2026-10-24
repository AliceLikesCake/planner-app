<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AddHeader from '@/components/AddHeader.vue'
import CategoryIcon from '@/components/CategoryIcon.vue'
import DeleteButton from '@/components/DeleteButton.vue'
import NumberPad from '@/components/NumberPad.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import SyncSummary from '@/components/SyncSummary.vue'
import { fromKey, todayKey } from '@/services/dates'
import { formatMoney } from '@/services/money'
import { parseQuickAdd, type QuickAdd } from '@/services/quickAdd'
import {
  createRecurring,
  deleteRecurring,
  gigIncome,
  makeEntryRecurring,
  recordTransaction,
  updateRecurring,
  updateTransaction,
} from '@/services/sync'
import { useScheduleLabel } from '@/composables/useSchedule'
import { useRecurringStore } from '@/stores/recurring'
import { useCategoriesStore } from '@/stores/categories'
import { useGigsStore } from '@/stores/gigs'
import { useMoneyStore } from '@/stores/money'
import { paletteVars } from '@/styles/palette'
import type { RecurringRow, TransactionRow } from '@/types/db'

/**
 * /edit/money/:id edits an entry; /edit/recurring/:recurringId edits a 固定收支 rule
 * (DECISIONS 53). Without either, the form adds an entry.
 */
const props = defineProps<{ id?: string; recurringId?: string }>()

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const categories = useCategoriesStore()
const gigs = useGigsStore()
const money = useMoneyStore()
const recurring = useRecurringStore()
const scheduleLabel = useScheduleLabel()

const existing = props.id ? money.items.find((tx) => tx.id === props.id) : undefined
// The rule being edited, or the rule that recorded the entry being edited.
const rule = props.recurringId ? recurring.items.find((r) => r.id === props.recurringId) : undefined
const ruleOfEntry = existing?.recurring_id
  ? recurring.items.find((r) => r.id === existing.recurring_id)
  : undefined

function leave() {
  if (window.history.state?.back) router.back()
  else router.replace(rule ? '/settings/recurring' : '/money')
}

if (props.id && !existing) router.replace('/money')
if (props.recurringId && !rule) router.replace('/settings/recurring')

const source = existing ?? rule
// A new entry can arrive prefilled from an iPhone shortcut (DECISIONS 54).
const quick: QuickAdd = source ? {} : parseQuickAdd(route.query)
const type = ref<TransactionRow['type']>(source?.type ?? quick.type ?? 'expense')
const digits = ref(source ? String(source.amount) : quick.amount ? String(quick.amount) : '')
const categoryId = ref<string | null>(source?.category_id ?? null)
const gigId = ref<string | null>(existing?.gig_id ?? null)
const date = ref(
  existing?.date ??
    rule?.start_date ??
    (typeof route.query.date === 'string' ? route.query.date : todayKey()),
)
const note = ref(source?.note ?? quick.note ?? '')
const saving = ref(false)
const failed = ref(false)

const typeOptions = computed(() => [
  { value: 'expense' as const, label: t('money.expense') },
  { value: 'income' as const, label: t('money.income') },
])
const typeCategories = computed(() => categories.ofType(type.value))

// A new entry starts on the shortcut's category, else the first of its type; switching type
// picks again.
if (!categoryId.value && quick.category) {
  const wanted = quick.category.toLowerCase()
  categoryId.value =
    typeCategories.value.find((c) =>
      [c.key, c.name_zh, c.name_en].some((n) => n?.toLowerCase() === wanted),
    )?.id ?? null
}
if (!categoryId.value) categoryId.value = typeCategories.value[0]?.id ?? null
watch(type, () => {
  categoryId.value = typeCategories.value[0]?.id ?? null
  gigId.value = null
})

const category = computed(() => categories.byId(categoryId.value))
const amount = computed(() => Number(digits.value) || 0)

function press(key: string) {
  if (key === 'del') digits.value = digits.value.slice(0, -1)
  else if (digits.value.length < 8) digits.value = (digits.value + key).replace(/^0+/, '')
}

// ---- rule 5: an income filed under 接案 can name the gig it pays for ----
const isGigIncome = computed(() => type.value === 'income' && category.value?.key === 'gig')
watch(isGigIncome, (gig) => {
  if (!gig) gigId.value = null
})
// A gig can only have one income entry, so gigs already paid through another entry are left out.
const gigChoices = computed(() =>
  gigs.items
    .filter((g) => g.id === existing?.gig_id || !gigIncome(g.id))
    .sort((a, b) => Number(!!a.paid_at) - Number(!!b.paid_at)),
)
const pickedGig = computed(() => gigs.items.find((g) => g.id === gigId.value))

function pickGig(id: string | null) {
  const previous = pickedGig.value
  gigId.value = id
  const gig = pickedGig.value
  if (!gig) return
  // Fill in what the gig already knows, without overwriting a note typed by hand.
  digits.value = String(gig.amount)
  if (
    !note.value ||
    (previous && note.value === t('addMoney.gigNote', { brand: previous.brand }))
  ) {
    note.value = t('addMoney.gigNote', { brand: gig.brand })
  }
}

// ---- 固定收支 (DECISIONS 53) ----
type Repeat = 'none' | RecurringRow['frequency']
const queryRepeat =
  route.query.repeat === 'month' || route.query.repeat === 'year' ? route.query.repeat : null
const repeat = ref<Repeat>(rule?.frequency ?? queryRepeat ?? 'none')
const repeatOptions = computed(() =>
  (rule ? ['month', 'year'] : ['none', 'month', 'year']).map((value) => ({
    value: value as Repeat,
    label: t(`recurring.${value}`),
  })),
)
// An entry recorded by a rule shows the rule instead; gig income never repeats.
const canRepeat = computed(() => !ruleOfEntry && !pickedGig.value)
const scope = ref<'this' | 'future'>('this')
const scopeOptions = computed(() => [
  { value: 'this' as const, label: t('recurring.scopeThis') },
  { value: 'future' as const, label: t('recurring.scopeFuture') },
])

// ---- what saving updates ----
const shortDate = computed(() =>
  date.value
    ? new Intl.DateTimeFormat(locale.value, { month: 'numeric', day: 'numeric' }).format(
        fromKey(date.value),
      )
    : '',
)
const syncLines = computed(() => {
  const lines = [
    t('addMoney.syncDetail', { date: shortDate.value, category: categories.name(category.value) }),
  ]
  if (type.value === 'expense') lines.push(t('addMoney.syncBudget'))
  if (pickedGig.value) lines.push(t('addMoney.gigSync', { brand: pickedGig.value.brand }))
  if (repeat.value !== 'none' && canRepeat.value && date.value) {
    const schedule = scheduleLabel({ frequency: repeat.value, start_date: date.value })
    lines.push(t('recurring.autoLine', { schedule }))
    if (date.value > todayKey()) lines.push(t('recurring.firstOn', { date: shortDate.value }))
  }
  return lines
})

// ---- save / delete ----
const canSave = computed(
  () => amount.value > 0 && !!categoryId.value && !!date.value && !saving.value,
)

async function save() {
  if (!canSave.value) return
  saving.value = true
  failed.value = false
  const fields = {
    type: type.value,
    amount: amount.value,
    category_id: categoryId.value,
    gig_id: isGigIncome.value ? gigId.value : null,
    date: date.value,
    note: note.value.trim() || null,
  }
  const ruleFields = {
    type: fields.type,
    amount: fields.amount,
    category_id: fields.category_id,
    note: fields.note,
  }
  const today = todayKey()
  try {
    if (rule && repeat.value !== 'none') {
      await updateRecurring(
        rule.id,
        { ...ruleFields, frequency: repeat.value, start_date: date.value },
        today,
      )
    } else if (existing) {
      const tx = await updateTransaction(existing.id, fields)
      if (ruleOfEntry && scope.value === 'future') {
        await updateRecurring(ruleOfEntry.id, ruleFields, today)
      } else if (canRepeat.value && repeat.value !== 'none') {
        await makeEntryRecurring(tx, repeat.value)
      }
    } else if (canRepeat.value && repeat.value !== 'none') {
      await createRecurring(
        { ...ruleFields, frequency: repeat.value, start_date: date.value },
        today,
      )
    } else {
      await recordTransaction(fields)
    }
    leave()
  } catch (error) {
    console.error(error)
    failed.value = true
  } finally {
    saving.value = false
  }
}

async function stopRepeat() {
  if (!ruleOfEntry) return
  saving.value = true
  failed.value = false
  try {
    await deleteRecurring(ruleOfEntry.id)
    leave()
  } catch (error) {
    console.error(error)
    failed.value = true
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!existing && !rule) return
  saving.value = true
  failed.value = false
  try {
    if (rule) await deleteRecurring(rule.id)
    else await money.remove(existing!.id)
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
  <main class="page add-money">
    <AddHeader
      :title="t(rule ? 'recurring.edit' : existing ? 'addMoney.editEntry' : 'money.addEntry')"
      :can-save="canSave"
      @save="save"
    >
      <template #title>
        <SegmentedControl
          v-model="type"
          :options="typeOptions"
          :label="t(rule ? 'recurring.edit' : existing ? 'addMoney.editEntry' : 'money.addEntry')"
        />
      </template>
    </AddHeader>

    <form class="page-body form" @submit.prevent="save">
      <p v-if="failed" class="error" role="alert">{{ t('today.saveError') }}</p>

      <div class="card amount-card" :style="paletteVars(category?.color)">
        <span class="badge">{{ categories.name(category) }}</span>
        <output class="amount num" :class="type" :aria-label="t('addMoney.amount')">
          {{ type === 'expense' ? '−' : '+' }} {{ formatMoney(amount) }}
        </output>
      </div>

      <div class="grid-cats">
        <button
          v-for="c in typeCategories"
          :key="c.id"
          type="button"
          class="money-cat"
          :class="{ on: c.id === categoryId }"
          :style="paletteVars(c.color)"
          :aria-pressed="c.id === categoryId"
          @click="categoryId = c.id"
        >
          <span class="cat-icon"><CategoryIcon :name="c.key" :size="18" /></span>
          <span class="cat-name">{{ categories.name(c) }}</span>
        </button>
      </div>

      <fieldset v-if="isGigIncome" class="card field">
        <legend class="field-label row-legend">{{ t('addMoney.whichGig') }}</legend>
        <div class="chips">
          <button
            v-for="g in gigChoices"
            :key="g.id"
            type="button"
            class="chip"
            :class="{ on: gigId === g.id }"
            :aria-pressed="gigId === g.id"
            @click="pickGig(g.id)"
          >
            {{ g.brand }}
          </button>
          <button
            type="button"
            class="chip"
            :class="{ on: gigId === null }"
            :aria-pressed="gigId === null"
            @click="pickGig(null)"
          >
            {{ t('addMoney.noGig') }}
          </button>
        </div>
        <p v-if="!gigChoices.length" class="sub">{{ t('addMoney.noGigs') }}</p>
      </fieldset>

      <div class="card rows">
        <div class="row">
          <label for="money-date">{{ t(rule ? 'recurring.startDate' : 'common.date') }}</label>
          <input id="money-date" v-model="date" class="value-input" type="date" required />
        </div>
        <div class="row">
          <label for="money-note">{{ t('common.note') }}</label>
          <input
            id="money-note"
            v-model="note"
            class="value-input plain"
            type="text"
            enterkeyhint="done"
            :placeholder="t('addMoney.notePlaceholder')"
          />
        </div>
      </div>

      <div v-if="ruleOfEntry" class="card field recurring">
        <p class="recurring-text">
          {{ t('recurring.isRecurring', { schedule: scheduleLabel(ruleOfEntry) }) }}
        </p>
        <span class="sub">{{ t('recurring.scope') }}</span>
        <SegmentedControl v-model="scope" :options="scopeOptions" :label="t('recurring.scope')" />
        <DeleteButton
          :label="t('recurring.stop')"
          :hint="t('recurring.stopHint')"
          :busy="saving"
          @confirm="stopRepeat"
        />
      </div>
      <div v-else-if="canRepeat" class="card rows">
        <fieldset class="row stacked">
          <legend class="row-legend">{{ t('recurring.repeat') }}</legend>
          <div class="grid-3">
            <button
              v-for="r in repeatOptions"
              :key="r.value"
              type="button"
              class="chip"
              :class="{ on: repeat === r.value }"
              :aria-pressed="repeat === r.value"
              @click="repeat = r.value"
            >
              {{ r.label }}
            </button>
          </div>
        </fieldset>
      </div>

      <SyncSummary :lines="syncLines" />

      <DeleteButton
        v-if="existing || rule"
        :label="t(rule ? 'recurring.stop' : 'addMoney.deleteEntry')"
        :hint="
          rule
            ? t('recurring.stopHint')
            : ruleOfEntry
              ? t('recurring.deleteHint')
              : existing?.gig_id
                ? t('addMoney.deleteGigHint')
                : undefined
        "
        :busy="saving"
        @confirm="remove"
      />
    </form>

    <NumberPad @key="press" />
  </main>
</template>

<style scoped>
.add-money .page-body {
  padding-bottom: 12px;
}

.recurring {
  gap: 10px;
}

.recurring-text {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.amount-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
}

.badge {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 14px;
  background: var(--c-fill);
  color: var(--c-text);
  font-size: 14px;
  font-weight: 700;
}

.amount {
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: right;
  font-family: var(--font-display);
  font-size: 32px;
  color: var(--ink);
}

.amount.income {
  color: var(--paid-fg);
}

.grid-cats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.money-cat {
  height: 72px;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 2px solid transparent;
  border-radius: 16px;
  background: var(--surface);
  color: var(--ink-2);
  font-weight: 500;
}

.money-cat.on {
  border-color: var(--c-text);
  background: var(--c-fill);
  color: var(--c-text);
  font-weight: 700;
}

.cat-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--c-fill);
  color: var(--c-text);
}

.money-cat.on .cat-icon {
  background: var(--surface);
}

.cat-name {
  font-size: 12px;
}
</style>
