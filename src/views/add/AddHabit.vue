<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AddHeader from '@/components/AddHeader.vue'
import DeleteButton from '@/components/DeleteButton.vue'
import SyncSummary from '@/components/SyncSummary.vue'
import Toggle from '@/components/Toggle.vue'
import Bubble from '@/components/habits/Bubble.vue'
import { shortTime } from '@/services/dates'
import { useHabitsStore } from '@/stores/habits'
import { useSettingsStore } from '@/stores/settings'
import { paletteVars } from '@/styles/palette'
import type { PaletteKey } from '@/types/db'

/** Set on /edit/habit/:id; the form then edits that habit instead of adding one. */
const props = defineProps<{ id?: string }>()

const { t, locale } = useI18n()
const router = useRouter()
const habits = useHabitsStore()
const settings = useSettingsStore()

const existing = props.id ? habits.items.find((h) => h.id === props.id) : undefined

function leave() {
  if (window.history.state?.back) router.back()
  else router.replace('/habits')
}

if (props.id && !existing) router.replace('/habits')

// SPEC 4.6: seven bubble colors.
const COLORS: PaletteKey[] = ['blue', 'lav', 'green', 'peach', 'butter', 'rose', 'mint']

const name = ref(existing?.name ?? '')
const goal = ref(existing?.goal ?? '')
const color = ref<string>(existing?.color ?? 'rose')
const weekdays = ref<number[]>(existing ? [...existing.weekdays] : [1, 2, 3, 4, 5, 6, 7])
const remind = ref(existing?.remind ?? true)
const saving = ref(false)
const failed = ref(false)

// Monday-first buttons; 2026-10-05 is a Monday.
const dayButtons = computed(() => {
  const short = new Intl.DateTimeFormat(locale.value, {
    weekday: locale.value === 'en' ? 'short' : 'narrow',
  })
  const long = new Intl.DateTimeFormat(locale.value, { weekday: 'long' })
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2026, 9, 5 + i)
    return { iso: i + 1, label: short.format(d), aria: long.format(d) }
  })
})

function toggleDay(iso: number) {
  weekdays.value = weekdays.value.includes(iso)
    ? weekdays.value.filter((d) => d !== iso)
    : [...weekdays.value, iso].sort()
}

const dayHint = computed(() => {
  const n = weekdays.value.length
  if (n === 0) return t('addHabit.pickADay')
  return n === 7 ? t('addHabit.everyDay') : t('addHabit.perWeek', { n })
})

const remindTime = computed(() => shortTime(settings.row?.habit_remind_time) || '21:30')
const syncLines = computed(() => [t('addHabit.syncBubble'), t('addHabit.syncRecord')])

const canSave = computed(() => !!name.value.trim() && weekdays.value.length > 0 && !saving.value)

async function save() {
  if (!canSave.value) return
  saving.value = true
  failed.value = false
  const fields = {
    name: name.value.trim(),
    goal: goal.value.trim() || null,
    color: color.value as PaletteKey,
    weekdays: weekdays.value,
    remind: remind.value,
  }
  try {
    if (existing) await habits.update(existing.id, fields)
    else await habits.add({ ...fields, sort: habits.items.length })
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
    await habits.remove(existing.id)
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
      :title="t(existing ? 'habits.editHabit' : 'habits.addHabit')"
      :can-save="canSave"
      @save="save"
    />

    <form class="page-body form" @submit.prevent="save">
      <p v-if="failed" class="error" role="alert">{{ t('today.saveError') }}</p>

      <div class="preview">
        <Bubble
          :name="name.trim() || t('addHabit.namePlaceholder')"
          :goal="goal.trim()"
          :color="color"
          :size="130"
          :index="0"
          :popped="false"
          :streak="0"
          preview
        />
      </div>

      <div class="card rows">
        <div class="field stacked-field">
          <label for="habit-name" class="field-label">{{ t('addHabit.name') }}</label>
          <input
            id="habit-name"
            v-model="name"
            class="title-input"
            type="text"
            enterkeyhint="next"
            :placeholder="t('addHabit.namePlaceholder')"
            :autofocus="!existing"
          />
        </div>
        <div class="field stacked-field">
          <label for="habit-goal" class="field-label">{{ t('addHabit.goal') }}</label>
          <input
            id="habit-goal"
            v-model="goal"
            class="goal-input"
            type="text"
            enterkeyhint="done"
            :placeholder="t('addHabit.goalPlaceholder')"
          />
        </div>
      </div>

      <fieldset class="card field">
        <legend class="row-legend">{{ t('addHabit.color') }}</legend>
        <div class="swatches">
          <button
            v-for="c in COLORS"
            :key="c"
            type="button"
            class="swatch"
            :class="{ on: color === c }"
            :style="paletteVars(c)"
            :aria-pressed="color === c"
            :aria-label="t(`palette.${c}`)"
            @click="color = c"
          >
            <svg
              v-if="color === c"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12l5 5 9-10" />
            </svg>
          </button>
        </div>
      </fieldset>

      <fieldset class="card field">
        <legend class="row-legend days-legend">
          <span>{{ t('addHabit.days') }}</span>
          <span class="sub" :class="{ warn: !weekdays.length }">{{ dayHint }}</span>
        </legend>
        <div class="days" :style="paletteVars(color)">
          <button
            v-for="d in dayButtons"
            :key="d.iso"
            type="button"
            class="weekday"
            :class="{ on: weekdays.includes(d.iso) }"
            :aria-pressed="weekdays.includes(d.iso)"
            :aria-label="d.aria"
            @click="toggleDay(d.iso)"
          >
            {{ d.label }}
          </button>
        </div>
      </fieldset>

      <div class="card rows">
        <div class="row tall">
          <span class="row-text">
            <span>{{ t('addHabit.remind') }}</span>
            <span class="sub">{{ t('addHabit.remindSub', { time: remindTime }) }}</span>
          </span>
          <Toggle v-model="remind" :label="t('addHabit.remind')" />
        </div>
      </div>

      <SyncSummary :lines="syncLines" />

      <DeleteButton
        v-if="existing"
        :label="t('addHabit.deleteHabit')"
        :hint="t('addHabit.deleteHint')"
        :busy="saving"
        @confirm="remove"
      />
    </form>
  </main>
</template>

<style scoped>
.preview {
  display: flex;
  justify-content: center;
  padding: 6px 0;
}

.stacked-field {
  padding: 12px 0;
}

.stacked-field + .stacked-field {
  border-top: 1px solid var(--divider);
}

.goal-input {
  padding: 2px 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-size: 15px;
}

.swatches {
  clear: both;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.swatch {
  width: var(--tap);
  height: var(--tap);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--c-deep);
  border-radius: 50%;
  background: var(--c-fill);
  color: var(--ink);
}

.swatch.on {
  border-color: var(--ink);
}

.days-legend {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.warn {
  color: var(--overdue-fg);
}

.days {
  clear: both;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
}

.weekday {
  height: var(--tap);
  padding: 0;
  border: none;
  border-radius: 12px;
  background: var(--surface-muted);
  color: var(--done-dot);
  font-size: 14px;
  font-weight: 700;
}

.weekday.on {
  background: var(--c-fill);
  color: var(--c-text);
  outline: 1.5px solid var(--c-deep);
  outline-offset: -1.5px;
}
</style>
