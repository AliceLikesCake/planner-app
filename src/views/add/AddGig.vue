<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AddHeader from '@/components/AddHeader.vue'
import DeleteButton from '@/components/DeleteButton.vue'
import Toggle from '@/components/Toggle.vue'
import { addDays, fromKey, todayKey } from '@/services/dates'
import { formatMoney } from '@/services/money'
import { GIG_EVENT_COLORS, GIG_FORMATS, knownFormats, PRODUCTS } from '@/services/products'
import { createGig, deleteGig, gigIncome, updateGig } from '@/services/sync'
import { useGigsStore } from '@/stores/gigs'
import { useSettingsStore } from '@/stores/settings'
import { paletteVars } from '@/styles/palette'
import type { ProductCategory } from '@/types/db'

/** Set on /edit/gig/:id; the form then edits that gig instead of adding one. */
const props = defineProps<{ id?: string }>()

const { t, locale } = useI18n()
const router = useRouter()
const settings = useSettingsStore()
const existing = props.id ? useGigsStore().items.find((g) => g.id === props.id) : undefined

function leave() {
  if (window.history.state?.back) router.back()
  else router.replace('/gigs')
}

if (props.id && !existing) router.replace('/gigs')

const brand = ref(existing?.brand ?? '')
const amountText = ref(existing ? String(existing.amount) : '')
const contact = ref(existing?.contact ?? '')
const productCategory = ref<ProductCategory>(existing?.product_category ?? 'beauty')
const formats = ref<string[]>(existing ? knownFormats(existing.formats) : [])
const deliverDate = ref(existing?.deliver_date ?? '')
const liveDate = ref(existing?.live_date ?? '')
const dueDate = ref(existing?.due_date ?? '')
const paidAt = ref(existing?.paid_at ?? '')
const contractSigned = ref(existing?.contract_signed ?? false)
const laborSigned = ref(existing?.labor_signed ?? false)
const syncCalendar = ref(existing?.sync_calendar ?? true)
const syncTodo = ref(existing?.sync_todo ?? true)
const syncDocs = ref(existing?.sync_docs ?? true)
const syncMoney = ref(existing?.sync_money ?? true)
const note = ref(existing?.note ?? '')
const saving = ref(false)
const failed = ref(false)

const amount = computed(() => Number(amountText.value.replace(/[^\d]/g, '')) || 0)
function onAmountInput(e: Event) {
  amountText.value = (e.target as HTMLInputElement).value.replace(/[^\d]/g, '')
}

function toggleFormat(f: string) {
  formats.value = formats.value.includes(f)
    ? formats.value.filter((x) => x !== f)
    : GIG_FORMATS.filter((x) => x === f || formats.value.includes(x))
}

const dateRows = computed(() => [
  {
    key: 'deliver',
    label: t('addGig.deliver'),
    model: deliverDate,
    color: GIG_EVENT_COLORS.deliver,
  },
  { key: 'live', label: t('addGig.live'), model: liveDate, color: GIG_EVENT_COLORS.live },
  { key: 'due', label: t('addGig.due'), model: dueDate, color: GIG_EVENT_COLORS.due },
])

// ---- auto sync previews (SPEC 6, rules 1–4) ----
const md = (key: string) =>
  new Intl.DateTimeFormat(locale.value, { month: '2-digit', day: '2-digit' }).format(fromKey(key))
const sep = ' · '

const syncRows = computed(() => {
  const calendarOff = !(settings.row?.auto_sync_calendar ?? true)
  const moneyOff = !(settings.row?.auto_sync_money ?? true)
  const calParts = [
    deliverDate.value && t('addGig.calDeliver', { date: md(deliverDate.value) }),
    liveDate.value && t('addGig.calLive', { date: md(liveDate.value) }),
    dueDate.value && t('addGig.calDue', { date: md(dueDate.value) }),
  ].filter(Boolean)
  const todoParts = [
    deliverDate.value && t('addGig.todoPrep', { date: md(addDays(deliverDate.value, -1)) }),
    liveDate.value && t('addGig.todoLive', { date: md(liveDate.value) }),
  ].filter(Boolean)
  const missing = [
    !contractSigned.value && t('gigs.docContract'),
    !laborSigned.value && t('gigs.docLabor'),
  ].filter(Boolean)
  return [
    {
      key: 'calendar',
      where: t('addGig.whereCalendar'),
      color: 'blue',
      title: t('addGig.syncCalTitle'),
      detail: calendarOff ? t('addGig.calOffSetting') : calParts.join(sep) || t('addGig.noDates'),
      model: syncCalendar,
    },
    {
      key: 'todo',
      where: t('addGig.whereTodo'),
      color: 'butter',
      title: t('addGig.syncTodoTitle'),
      detail: todoParts.join(sep) || t('addGig.noDates'),
      model: syncTodo,
    },
    {
      key: 'docs',
      where: t('addGig.whereTodo'),
      color: 'butter',
      title: missing.length
        ? t('addGig.syncDocsTitle', { docs: missing.join(t('gigs.docsJoin')) })
        : t('addGig.syncDocsDone'),
      detail: missing.length ? t('addGig.syncDocsSub') : t('addGig.syncDocsDoneSub'),
      model: syncDocs,
    },
    {
      key: 'money',
      where: t('addGig.whereMoney'),
      color: 'mint',
      title: t('addGig.syncMoneyTitle'),
      detail: moneyOff
        ? t('addGig.moneyOffSetting')
        : t('addGig.syncMoneySub', { amount: formatMoney(amount.value) }),
      model: syncMoney,
    },
  ]
})

// ---- save / delete ----
const income = existing ? gigIncome(existing.id) : undefined
const deleteIncome = ref(true)

const canSave = computed(() => !!brand.value.trim() && !saving.value)

async function save() {
  if (!canSave.value) return
  saving.value = true
  failed.value = false
  const fields = {
    brand: brand.value.trim(),
    amount: amount.value,
    contact: contact.value.trim() || null,
    product_category: productCategory.value,
    formats: formats.value,
    deliver_date: deliverDate.value || null,
    live_date: liveDate.value || null,
    due_date: dueDate.value || null,
    contract_signed: contractSigned.value,
    labor_signed: laborSigned.value,
    sync_calendar: syncCalendar.value,
    sync_todo: syncTodo.value,
    sync_docs: syncDocs.value,
    sync_money: syncMoney.value,
    note: note.value.trim() || null,
    ...(existing?.paid_at ? { paid_at: paidAt.value || todayKey() } : {}),
  }
  try {
    if (existing) await updateGig(existing.id, fields)
    else await createGig(fields)
    leave()
  } catch (error) {
    console.error(error)
    failed.value = true
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!existing) return
  saving.value = true
  failed.value = false
  try {
    await deleteGig(existing.id, { deleteIncome: !!income && deleteIncome.value })
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
      :title="t(existing ? 'gigs.editGig' : 'gigs.addGig')"
      :can-save="canSave"
      @save="save"
    />

    <form class="page-body form" @submit.prevent="save">
      <p v-if="failed" class="error" role="alert">{{ t('today.saveError') }}</p>

      <div class="card rows">
        <div class="field stacked-field">
          <label for="gig-brand" class="field-label">{{ t('addGig.brand') }}</label>
          <input
            id="gig-brand"
            v-model="brand"
            class="title-input"
            type="text"
            enterkeyhint="next"
            :placeholder="t('addGig.brandPlaceholder')"
            :autofocus="!existing"
          />
        </div>
        <div class="row">
          <label for="gig-amount">{{ t('addGig.amount') }}</label>
          <input
            id="gig-amount"
            :value="amountText ? formatMoney(amount) : ''"
            class="value-input"
            type="text"
            inputmode="numeric"
            :placeholder="formatMoney(0)"
            :aria-description="t('addGig.amountAria')"
            @input="onAmountInput"
          />
        </div>
        <div class="row">
          <label for="gig-contact">{{ t('addGig.contact') }}</label>
          <input
            id="gig-contact"
            v-model="contact"
            class="value-input plain"
            type="text"
            :placeholder="t('addGig.contactPlaceholder')"
          />
        </div>
      </div>

      <fieldset class="group">
        <legend class="group-label">{{ t('addGig.product') }}</legend>
        <div class="cats">
          <button
            v-for="p in PRODUCTS"
            :key="p.key"
            type="button"
            class="cat"
            :class="{ on: productCategory === p.key }"
            :style="paletteVars(p.color)"
            :aria-pressed="productCategory === p.key"
            @click="productCategory = p.key"
          >
            {{ t(`product.${p.key}`) }}
          </button>
        </div>
      </fieldset>

      <fieldset class="group">
        <legend class="group-label">{{ t('addGig.formats') }}</legend>
        <div class="chips">
          <button
            v-for="f in GIG_FORMATS"
            :key="f"
            type="button"
            class="chip outline"
            :class="{ on: formats.includes(f) }"
            :aria-pressed="formats.includes(f)"
            @click="toggleFormat(f)"
          >
            {{ t(`gigs.formats.${f}`) }}
          </button>
        </div>
      </fieldset>

      <div class="card rows">
        <div class="section-label">{{ t('addGig.dates') }}</div>
        <div v-for="d in dateRows" :key="d.key" class="row">
          <label :for="`gig-${d.key}`" class="date-label" :style="paletteVars(d.color)">
            <span class="dot" />{{ d.label }}
          </label>
          <span class="time-wrap">
            <input :id="`gig-${d.key}`" v-model="d.model.value" class="value-input" type="date" />
            <button
              v-if="d.model.value"
              type="button"
              class="clear"
              :aria-label="t('addGig.clearDate', { label: d.label })"
              @click="d.model.value = ''"
            >
              ×
            </button>
          </span>
        </div>
        <div v-if="existing?.paid_at" class="row">
          <label for="gig-paid" class="date-label" :style="paletteVars('green')">
            <span class="dot" />{{ t('gigs.paid') }}
          </label>
          <input id="gig-paid" v-model="paidAt" class="value-input" type="date" required />
        </div>
      </div>

      <fieldset class="card field">
        <legend class="row-legend field-label">{{ t('addGig.docs') }}</legend>
        <div class="docs">
          <button
            type="button"
            class="doc"
            :class="{ on: contractSigned }"
            :aria-pressed="contractSigned"
            @click="contractSigned = !contractSigned"
          >
            <span class="box"
              ><svg
                v-if="contractSigned"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M5 12l5 5 9-10" /></svg></span
            >{{ t('addGig.contractSigned') }}
          </button>
          <button
            type="button"
            class="doc"
            :class="{ on: laborSigned }"
            :aria-pressed="laborSigned"
            @click="laborSigned = !laborSigned"
          >
            <span class="box"
              ><svg
                v-if="laborSigned"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M5 12l5 5 9-10" /></svg></span
            >{{ t('addGig.laborSigned') }}
          </button>
        </div>
      </fieldset>

      <div class="card sync-card">
        <div class="sync-head">{{ t('addGig.autoSync') }}</div>
        <div class="sub">{{ t('addGig.autoSyncSub') }}</div>
        <div v-for="s in syncRows" :key="s.key" class="sync-row">
          <span class="tag" :style="paletteVars(s.color)">{{ s.where }}</span>
          <span class="row-text">
            <span class="sync-title">{{ s.title }}</span>
            <span class="sub">{{ s.detail }}</span>
          </span>
          <Toggle v-model="s.model.value" :label="s.title" />
        </div>
      </div>

      <div class="card field">
        <label for="gig-note" class="field-label">{{ t('common.note') }}</label>
        <textarea id="gig-note" v-model="note" class="note" rows="2" />
      </div>

      <template v-if="existing">
        <div v-if="income" class="card rows">
          <div class="row tall">
            <span class="row-text">
              <span>{{ t('addGig.deleteIncome', { amount: formatMoney(income.amount) }) }}</span>
              <span class="sub">{{ t('addGig.deleteIncomeSub') }}</span>
            </span>
            <Toggle
              v-model="deleteIncome"
              :label="t('addGig.deleteIncome', { amount: formatMoney(income.amount) })"
            />
          </div>
        </div>
        <DeleteButton
          :label="t('addGig.deleteGig')"
          :hint="t('addGig.deleteHint')"
          :busy="saving"
          @confirm="remove"
        />
      </template>
    </form>
  </main>
</template>

<style scoped>
.stacked-field {
  padding: 12px 0;
  border-bottom: 1px solid var(--divider);
}

.section-label {
  padding: 12px 0 2px;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}

.section-label + .row {
  border-top: none;
}

.date-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chip.outline:not(.on) {
  background: var(--surface);
  outline: 1px solid var(--divider);
  outline-offset: -1px;
}

.docs {
  clear: both;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.doc {
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--divider);
  border-radius: 14px;
  background: var(--surface);
  color: var(--ink);
  font-size: 14px;
}

.doc.on {
  border-color: transparent;
  background: var(--surface-muted);
}

.box {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--dashed);
  border-radius: 6px;
}

.doc.on .box {
  border: none;
  background: var(--switch-on);
}

.box svg {
  fill: none;
  stroke: var(--on-primary);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sync-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px 6px;
}

.sync-head {
  font-size: 15px;
  font-weight: 700;
}

.sync-card > .sub {
  padding-bottom: 6px;
}

.sync-row {
  min-height: 62px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--divider);
}

.tag {
  flex-shrink: 0;
  width: 44px;
  padding: 4px 0;
  border-radius: 10px;
  background: var(--c-fill);
  color: var(--c-text);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.row-text {
  flex: 1;
  min-width: 0;
}

.sync-title {
  font-size: 14px;
  font-weight: 500;
}
</style>
