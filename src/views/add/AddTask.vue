<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AddHeader from '@/components/AddHeader.vue'
import Toggle from '@/components/Toggle.vue'
import { fromKey, minutesToTime, timeToMinutes, todayKey } from '@/services/dates'
import { useCategoriesStore } from '@/stores/categories'
import { useGigsStore } from '@/stores/gigs'
import { useTasksStore } from '@/stores/tasks'
import { paletteVars } from '@/styles/palette'
import type { TaskRow } from '@/types/db'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const categories = useCategoriesStore()
const gigs = useGigsStore()
const tasks = useTasksStore()

const taskCategories = computed(() => categories.ofType('task'))

const title = ref('')
const categoryId = ref(taskCategories.value[0]?.id ?? null)
const gigId = ref<string | null>(null)
const date = ref(typeof route.query.date === 'string' ? route.query.date : todayKey())
const time = ref('')
const repeat = ref<TaskRow['repeat']>('none')
const remind = ref(false)
const showInCalendar = ref(true)
const note = ref('')
const saving = ref(false)
const failed = ref(false)

const category = computed(() => categories.byId(categoryId.value))
const isGigCategory = computed(() => category.value?.key === 'gig')
watch(isGigCategory, (gig) => {
  if (!gig) gigId.value = null
})

const repeats = computed(() => [
  { value: 'none' as const, label: t('addTask.repeatNone') },
  { value: 'day' as const, label: t('addTask.repeatDay') },
  { value: 'week' as const, label: t('addTask.repeatWeek') },
  { value: 'month' as const, label: t('addTask.repeatMonth') },
])

const shortDate = computed(() =>
  date.value
    ? new Intl.DateTimeFormat(locale.value, { month: 'numeric', day: 'numeric' }).format(
        fromKey(date.value),
      )
    : '',
)

// What the "儲存後會同步到" box lists, updated as the form changes (SPEC 4.6).
const syncLines = computed(() => {
  const lines: string[] = []
  const categoryName = categories.name(category.value)
  lines.push(
    repeat.value === 'none'
      ? t('addTask.syncToday', { date: shortDate.value, category: categoryName })
      : t('addTask.syncTodayRepeat', {
          date: shortDate.value,
          repeat: t(`addTask.every.${repeat.value}`),
          category: categoryName,
        }),
  )
  if (showInCalendar.value) lines.push(t('addTask.syncCalendar', { date: shortDate.value }))
  const gig = gigs.items.find((g) => g.id === gigId.value)
  if (gig) lines.push(t('addTask.syncGig', { brand: gig.brand }))
  if (remind.value && time.value) {
    lines.push(t('addTask.syncRemind', { time: minutesToTime(timeToMinutes(time.value) - 30) }))
  }
  return lines
})

const canSave = computed(() => !!title.value.trim() && !!date.value && !saving.value)

async function save() {
  if (!canSave.value) return
  saving.value = true
  failed.value = false
  try {
    await tasks.add({
      title: title.value.trim(),
      category_id: categoryId.value,
      gig_id: gigId.value,
      date: date.value,
      time: time.value || null,
      repeat: repeat.value,
      remind: remind.value,
      show_in_calendar: showInCalendar.value,
      note: note.value.trim() || null,
    })
    if (window.history.state?.back) router.back()
    else router.replace('/')
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
    <AddHeader :title="t('today.addTask')" :can-save="canSave" @save="save" />

    <form class="page-body form" @submit.prevent="save">
      <div class="card field">
        <label for="task-title" class="field-label">{{ t('addTask.what') }}</label>
        <input
          id="task-title"
          v-model="title"
          class="title-input"
          type="text"
          enterkeyhint="done"
          :placeholder="t('addTask.placeholder')"
          autofocus
        />
      </div>

      <fieldset class="group">
        <legend class="group-label">{{ t('addTask.category') }}</legend>
        <div class="cats">
          <button
            v-for="c in taskCategories"
            :key="c.id"
            type="button"
            class="cat"
            :class="{ on: c.id === categoryId }"
            :style="paletteVars(c.color)"
            :aria-pressed="c.id === categoryId"
            @click="categoryId = c.id"
          >
            <span class="dot" />{{ categories.name(c) }}
          </button>
        </div>
      </fieldset>

      <fieldset v-if="isGigCategory" class="card field">
        <legend class="field-label">{{ t('addTask.gig') }}</legend>
        <div class="chips">
          <button
            v-for="g in gigs.items"
            :key="g.id"
            type="button"
            class="chip"
            :class="{ on: gigId === g.id }"
            :aria-pressed="gigId === g.id"
            @click="gigId = g.id"
          >
            {{ g.brand }}
          </button>
          <button
            type="button"
            class="chip"
            :class="{ on: gigId === null }"
            :aria-pressed="gigId === null"
            @click="gigId = null"
          >
            {{ t('addTask.noGig') }}
          </button>
        </div>
      </fieldset>

      <div class="card rows">
        <div class="row">
          <label for="task-date">{{ t('addTask.date') }}</label>
          <input id="task-date" v-model="date" class="value-input" type="date" required />
        </div>
        <div class="row">
          <label for="task-time">{{ t('addTask.time') }}</label>
          <span class="time-wrap">
            <input id="task-time" v-model="time" class="value-input" type="time" />
            <button
              v-if="time"
              type="button"
              class="clear"
              :aria-label="t('addTask.clearTime')"
              @click="time = ''"
            >
              ×
            </button>
          </span>
        </div>
        <fieldset class="row stacked">
          <legend class="row-legend">{{ t('addTask.repeat') }}</legend>
          <div class="repeats">
            <button
              v-for="r in repeats"
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

      <div class="card rows">
        <div class="row tall">
          <span class="row-text">
            <span>{{ t('addTask.remind') }}</span>
            <span class="sub">{{ t('addTask.remindSub') }}</span>
          </span>
          <Toggle v-model="remind" :label="t('addTask.remind')" />
        </div>
        <div class="row tall">
          <span class="row-text">
            <span>{{ t('addTask.calendar') }}</span>
            <span class="sub">{{ t('addTask.calendarSub') }}</span>
          </span>
          <Toggle v-model="showInCalendar" :label="t('addTask.calendar')" />
        </div>
      </div>

      <div class="card field">
        <label for="task-note" class="field-label">{{ t('addTask.note') }}</label>
        <textarea id="task-note" v-model="note" class="note" rows="2" />
      </div>

      <div class="sync">
        <div class="sync-title">{{ t('common.syncTo') }}</div>
        <div v-for="line in syncLines" :key="line" class="sync-line">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12l5 5 9-10" />
          </svg>
          <span>{{ line }}</span>
        </div>
      </div>

      <p v-if="failed" class="error" role="alert">{{ t('today.saveError') }}</p>
    </form>
  </main>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

fieldset {
  margin: 0;
  padding: 0;
  border: none;
  min-width: 0;
}

.card {
  border-radius: 20px;
  background: var(--surface);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
}

.field-label {
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}

fieldset.field > .field-label {
  float: left;
  width: 100%;
  margin-bottom: 8px;
}

.title-input {
  padding: 4px 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-size: 18px;
  font-weight: 700;
}

.title-input::placeholder {
  color: var(--done-dot);
  font-weight: 500;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-label {
  float: left;
  width: 100%;
  margin-bottom: 8px;
  padding: 0 4px;
  font-size: 14px;
  font-weight: 700;
}

.cats {
  clear: both;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.cat {
  min-height: var(--tap);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 2px solid transparent;
  border-radius: 16px;
  background: var(--surface);
  color: var(--ink-2);
  font-size: 14px;
  font-weight: 500;
}

.cat.on {
  border-color: var(--c-deep);
  background: var(--c-fill);
  color: var(--c-text);
  font-weight: 700;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c-deep);
}

.chips {
  clear: both;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  min-height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 19px;
  background: var(--surface-muted);
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 500;
  position: relative;
}

/* 38px chips, 44px hit area */
.chip::after {
  content: '';
  position: absolute;
  inset: -3px 0;
}

.chip.on {
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 700;
}

.rows {
  padding: 4px 16px;
}

.row {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 15px;
}

.row + .row {
  border-top: 1px solid var(--divider);
}

.row.tall {
  min-height: 60px;
}

.row.stacked {
  display: block;
  padding: 12px 0 14px;
}

.row-legend {
  float: left;
  width: 100%;
  margin-bottom: 10px;
  padding: 0;
}

.repeats {
  clear: both;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.repeats .chip {
  padding: 0;
}

.row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sub {
  font-size: 12px;
  color: var(--muted);
}

.value-input {
  min-height: var(--tap);
  border: none;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-size: 15px;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.time-wrap {
  display: flex;
  align-items: center;
}

.clear {
  width: var(--tap);
  height: var(--tap);
  border: none;
  background: transparent;
  color: var(--faint);
  font-size: 20px;
}

.note {
  padding: 2px 0;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--ink);
  font-size: 15px;
}

.sync {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--chip);
  color: var(--ink-2);
}

.sync-title {
  font-size: 12px;
  font-weight: 700;
}

.sync-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.sync-line svg {
  flex-shrink: 0;
  margin-top: 3px;
}

.error {
  margin: 0;
  padding: 12px 16px;
  border-radius: 16px;
  background: var(--overdue-bg);
  color: var(--overdue-fg);
  font-size: 14px;
}
</style>
