<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BackHeader from '@/components/BackHeader.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { useToday } from '@/composables/useToday'
import {
  buildSheets,
  EXPORT_CONTENTS,
  exportFile,
  type DateRange,
  type ExportContent,
} from '@/services/export'
import { periodContaining, periodOf } from '@/services/money'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const today = useToday()
const settings = useSettingsStore()

// ---- range ----
type RangeKind = 'month' | 'last' | 'year' | 'custom'
// The year by default: the export is mostly for taxes (DECISIONS 41).
const rangeKind = ref<RangeKind>('year')
const customStart = ref(`${today.value.slice(0, 7)}-01`)
const customEnd = ref(today.value)

const range = computed<DateRange>(() => {
  const startDay = settings.row?.month_start_day ?? 1
  const current = periodContaining(today.value, startDay)
  switch (rangeKind.value) {
    case 'month':
      return { start: current.start, end: current.end }
    case 'last': {
      const p = periodOf(current.year, current.monthIndex - 1, startDay)
      return { start: p.start, end: p.end }
    }
    case 'year': {
      const y = today.value.slice(0, 4)
      return { start: `${y}-01-01`, end: `${y}-12-31` }
    }
    default:
      return customStart.value <= customEnd.value
        ? { start: customStart.value, end: customEnd.value }
        : { start: customEnd.value, end: customStart.value }
  }
})

const ranges = computed(() => [
  { value: 'month' as const, label: t('export.rangeMonth') },
  { value: 'last' as const, label: t('export.rangeLast') },
  { value: 'year' as const, label: t('export.rangeYear') },
  { value: 'custom' as const, label: t('export.rangeCustom') },
])

// ---- contents ----
const chosen = ref<ExportContent[]>([...EXPORT_CONTENTS])
function flip(c: ExportContent) {
  chosen.value = chosen.value.includes(c)
    ? chosen.value.filter((x) => x !== c)
    : [...chosen.value, c]
}

// Row counts for every item, so unticked ones show what they would add.
const allSheets = computed(() => buildSheets([...EXPORT_CONTENTS], range.value, today.value))
const countOf = (c: ExportContent) => allSheets.value.find((s) => s.content === c)?.rows.length ?? 0
const sheets = computed(() => allSheets.value.filter((s) => chosen.value.includes(s.content)))
const totalRows = computed(() => sheets.value.reduce((n, s) => n + s.rows.length, 0))

// ---- format and file name ----
const format = ref<'xlsx' | 'csv'>('xlsx')
const formats = computed(() => [
  { value: 'xlsx' as const, label: t('export.excel') },
  { value: 'csv' as const, label: t('export.csv') },
])

const baseName = computed(() => {
  const label = sheets.value.length === 1 ? sheets.value[0]!.name : t('export.fileBase')
  const r = range.value
  const span =
    rangeKind.value === 'year'
      ? r.start.slice(0, 4)
      : rangeKind.value === 'custom'
        ? `${r.start}_${r.end}`
        : r.start.slice(0, 7)
  return `${label}_${span}`
})

const fileMeta = computed(() => {
  if (!sheets.value.length) return t('export.pickOne')
  const rows = t('export.rows', { n: totalRows.value })
  if (format.value === 'csv')
    return sheets.value.length > 1 ? `${t('export.csvFiles')} · ${rows}` : rows
  return `${t('export.sheets', { n: sheets.value.length })} · ${rows}`
})

// ---- export ----
const busy = ref(false)
const status = ref<'idle' | 'done' | 'failed'>('idle')
watch([rangeKind, chosen, format, customStart, customEnd], () => (status.value = 'idle'))

async function run() {
  if (!sheets.value.length || busy.value) return
  busy.value = true
  try {
    await exportFile(sheets.value, baseName.value, format.value)
    status.value = 'done'
  } catch (error) {
    console.error(error)
    status.value = 'failed'
  } finally {
    busy.value = false
  }
}

const rangeText = computed(() => `${range.value.start} – ${range.value.end}`.replaceAll('-', '/'))
</script>

<template>
  <main class="page export">
    <BackHeader :title="t('export.title')" fallback="/settings" />

    <div class="page-body form">
      <fieldset class="card field">
        <legend class="row-legend section">{{ t('export.range') }}</legend>
        <div class="grid-4">
          <button
            v-for="r in ranges"
            :key="r.value"
            type="button"
            class="chip"
            :class="{ on: rangeKind === r.value }"
            :aria-pressed="rangeKind === r.value"
            @click="rangeKind = r.value"
          >
            {{ r.label }}
          </button>
        </div>
        <div v-if="rangeKind === 'custom'" class="custom">
          <label class="custom-field">
            <span class="sub">{{ t('export.from') }}</span>
            <input v-model="customStart" class="value-input" type="date" />
          </label>
          <label class="custom-field">
            <span class="sub">{{ t('export.to') }}</span>
            <input v-model="customEnd" class="value-input" type="date" />
          </label>
        </div>
        <span class="sub num">{{ rangeText }}</span>
      </fieldset>

      <fieldset class="card contents">
        <legend class="row-legend section">{{ t('export.contents') }}</legend>
        <button
          v-for="c in EXPORT_CONTENTS"
          :key="c"
          type="button"
          class="item"
          :class="{ on: chosen.includes(c) }"
          :aria-pressed="chosen.includes(c)"
          @click="flip(c)"
        >
          <span class="box">
            <svg
              v-if="chosen.includes(c)"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M5 12l5 5 9-10" />
            </svg>
          </span>
          <span class="row-text">
            <span>{{ t(`export.item.${c}`) }}</span>
            <span class="sub">{{ t(`export.itemSub.${c}`) }}</span>
          </span>
          <span class="sub num">{{ t('export.count', { n: countOf(c) }) }}</span>
        </button>
      </fieldset>

      <div class="card format">
        <span class="section">{{ t('export.format') }}</span>
        <SegmentedControl v-model="format" :options="formats" :label="t('export.format')" />
      </div>

      <div class="file">
        <span class="file-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 3h8l4 4v14H6z" />
            <path d="M14 3v4h4M9 12l4 5M13 12l-4 5" />
          </svg>
        </span>
        <span class="row-text">
          <span class="file-name">{{ baseName }}.{{ format }}</span>
          <span class="sub">{{ fileMeta }}</span>
        </span>
      </div>

      <p v-if="status === 'done'" class="notice ok" role="status">{{ t('export.done') }}</p>
      <p v-if="status === 'failed'" class="error" role="alert">{{ t('export.failed') }}</p>
    </div>

    <div class="action">
      <button type="button" class="run" :disabled="!sheets.length || busy" @click="run">
        {{ status === 'done' ? t('export.again') : t('export.button') }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.section {
  font-size: 15px;
  font-weight: 700;
}

.field {
  gap: 10px;
}

.custom {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.custom-field {
  display: flex;
  flex-direction: column;
  padding: 6px 10px 2px;
  border-radius: 14px;
  background: var(--surface-muted);
}

.custom-field .value-input {
  text-align: left;
  min-height: 36px;
}

.custom-field .value-input::-webkit-date-and-time-value {
  text-align: left;
}

.contents {
  padding: 6px 16px;
}

.contents .row-legend {
  padding: 8px 0 4px;
}

.item {
  width: 100%;
  min-height: var(--tap);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border: none;
  background: transparent;
  color: var(--ink);
  font-size: 15px;
  text-align: left;
}

.item + .item {
  border-top: 1px solid var(--divider);
}

.box {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--dashed);
  border-radius: 7px;
}

.item.on .box {
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

.row-text {
  flex: 1;
  min-width: 0;
}

.format {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
}

.file {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--chip);
}

.file-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--green-fill);
  color: var(--green-text);
}

.file-name {
  font-size: 14px;
  font-weight: 700;
  word-break: break-all;
}

.notice.ok {
  margin: 0;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--green-fill);
  color: var(--green-text);
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

.action {
  flex-shrink: 0;
  padding: 10px 16px max(30px, env(safe-area-inset-bottom));
}

.run {
  width: 100%;
  height: 52px;
  border: none;
  border-radius: 26px;
  background: var(--primary);
  color: var(--on-primary);
  font-size: 16px;
  font-weight: 700;
}

.run:disabled {
  background: var(--done-chip);
  color: var(--faint);
  cursor: default;
}
</style>
