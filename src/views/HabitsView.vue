<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Bubble from '@/components/habits/Bubble.vue'
import ErrorToast from '@/components/ErrorToast.vue'
import SoundToggle from '@/components/SoundToggle.vue'
import { useErrorToast } from '@/composables/useErrorToast'
import { useToday } from '@/composables/useToday'
import { addDays, fromKey, toKey } from '@/services/dates'
import {
  bestStreak,
  currentStreak,
  dayStatus,
  isScheduled,
  monthStats,
  type DayStatus,
} from '@/services/habits'
import { playAllDone, playPop } from '@/services/sound'
import { useHabitsStore } from '@/stores/habits'
import { useSettingsStore } from '@/stores/settings'
import { paletteVars } from '@/styles/palette'
import type { HabitRow } from '@/types/db'

const { t, locale } = useI18n()
const today = useToday()
const habits = useHabitsStore()
const settings = useSettingsStore()

const SIZES = [132, 118, 112, 120, 104]

const active = computed(() => habits.items.filter((h) => !h.archived))
const todays = computed(() => active.value.filter((h) => isScheduled(h, today.value)))
const doneCount = computed(
  () => todays.value.filter((h) => habits.isDone(h.id, today.value)).length,
)
const allDone = computed(() => todays.value.length > 0 && doneCount.value === todays.value.length)

const dateLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'long', day: 'numeric', weekday: 'long' }).format(
    fromKey(today.value),
  ),
)

function streakOf(h: HabitRow) {
  return currentStreak(habits.historyOf(h), today.value)
}

// ---- popping ----
const burstId = ref<string | null>(null)
const { error, showError } = useErrorToast()

async function tap(h: HabitRow) {
  const done = !habits.isDone(h.id, today.value)
  burstId.value = done ? h.id : null
  if (done && (settings.row?.sound ?? true)) {
    void playPop()
    if (doneCount.value + 1 === todays.value.length) void playAllDone()
  }
  try {
    await habits.setDone(h.id, today.value, done)
  } catch {
    burstId.value = null
    showError()
  }
}

// ---- monthly record ----
const selectedId = ref<string | null>(active.value[0]?.id ?? null)
watch(active, (list) => {
  if (!list.some((h) => h.id === selectedId.value)) selectedId.value = list[0]?.id ?? null
})
const selected = computed(() => active.value.find((h) => h.id === selectedId.value))

const year = computed(() => fromKey(today.value).getFullYear())
const monthIndex = computed(() => fromKey(today.value).getMonth())
const recordTitle = computed(() =>
  t('habits.monthRecord', {
    month:
      locale.value === 'en'
        ? new Intl.DateTimeFormat('en', { month: 'long' }).format(fromKey(today.value))
        : monthIndex.value + 1,
  }),
)

const weekStart = computed(() => settings.row?.week_start ?? 'mon')
const weekdays = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, {
    weekday: locale.value === 'en' ? 'short' : 'narrow',
  })
  // 2026-10-04 is a Sunday
  const offset = weekStart.value === 'sun' ? 0 : 1
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2026, 9, 4 + offset + i)))
})

const cells = computed(() => {
  const h = selected.value
  if (!h) return []
  const history = habits.historyOf(h)
  const first = toKey(new Date(year.value, monthIndex.value, 1))
  const dow = new Date(year.value, monthIndex.value, 1).getDay()
  const lead = weekStart.value === 'sun' ? dow : (dow + 6) % 7
  const out: ({ key: string; day: number; status: DayStatus } | null)[] = Array(lead).fill(null)
  for (let d = first; fromKey(d).getMonth() === monthIndex.value; d = addDays(d, 1)) {
    out.push({ key: d, day: fromKey(d).getDate(), status: dayStatus(history, d, today.value) })
  }
  return out
})

const stats = computed(() => {
  const h = selected.value
  if (!h) return null
  const history = habits.historyOf(h)
  const month = monthStats(history, year.value, monthIndex.value, today.value)
  return {
    monthDone: month.done,
    pct: month.scheduled ? Math.round((month.done / month.scheduled) * 100) : 0,
    current: currentStreak(history, today.value),
    best: bestStreak(history, today.value),
  }
})
</script>

<template>
  <main class="page">
    <div class="page-body habits">
      <header class="top">
        <div class="titles">
          <div class="date">{{ dateLabel }}</div>
          <h1 class="title">{{ t('habits.title') }}</h1>
        </div>
        <div class="actions">
          <span v-if="todays.length" class="count num" :aria-label="t('habits.todayDone')"
            >{{ doneCount }} / {{ todays.length }}</span
          >
          <SoundToggle @error="showError" />
        </div>
      </header>

      <section class="bubbles-card">
        <div v-if="todays.length" class="bubbles">
          <Bubble
            v-for="(h, i) in todays"
            :key="h.id"
            :name="h.name"
            :goal="h.goal ?? ''"
            :color="h.color"
            :size="SIZES[i % SIZES.length]!"
            :index="i"
            :popped="habits.isDone(h.id, today)"
            :streak="streakOf(h)"
            :burst="burstId === h.id"
            @tap="tap(h)"
          />
        </div>
        <p v-else class="empty">{{ t(active.length ? 'habits.noneToday' : 'habits.noHabits') }}</p>
        <p v-if="todays.length" class="message" :class="{ celebrate: allDone }">
          {{ allDone ? t('habits.allDone') : t('habits.hint') }}
        </p>
      </section>

      <section v-if="selected && stats" class="record">
        <div class="record-head">
          <h2 class="record-title">{{ recordTitle }}</h2>
          <span class="summary num">{{
            t('habits.summary', { name: selected.name, pct: stats.pct })
          }}</span>
        </div>

        <div class="tabs-row">
          <div class="tabs" role="group" :aria-label="t('habits.recordTabs')">
            <button
              v-for="h in active"
              :key="h.id"
              type="button"
              class="tab"
              :class="{ on: h.id === selectedId }"
              :style="paletteVars(h.color)"
              :aria-pressed="h.id === selectedId"
              @click="selectedId = h.id"
            >
              {{ h.name }}
            </button>
          </div>
          <RouterLink
            :to="`/edit/habit/${selected.id}`"
            class="edit"
            :aria-label="t('habits.editHabit')"
          >
            {{ t('habits.edit') }}
          </RouterLink>
        </div>

        <div class="grid head">
          <span v-for="(w, i) in weekdays" :key="i">{{ w }}</span>
        </div>
        <div class="grid" :style="paletteVars(selected.color)">
          <span v-for="(c, i) in cells" :key="i" class="cell">
            <span v-if="c" class="day num" :class="[c.status, { today: c.key === today }]">{{
              c.day
            }}</span>
          </span>
        </div>

        <div class="stats">
          <div class="stat">
            <span class="stat-label">{{ t('habits.monthDone') }}</span>
            <span class="stat-value num">{{
              t('habits.days', { n: stats.monthDone }, stats.monthDone)
            }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">{{ t('habits.currentStreak') }}</span>
            <span class="stat-value num">{{
              t('habits.days', { n: stats.current }, stats.current)
            }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">{{ t('habits.bestStreak') }}</span>
            <span class="stat-value num">{{
              t('habits.days', { n: stats.best }, stats.best)
            }}</span>
          </div>
        </div>
      </section>
    </div>

    <ErrorToast :message="error" />
  </main>
</template>

<style scoped>
.habits {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 16px 110px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date {
  font-size: 13px;
  color: var(--muted);
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 400;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.count {
  font-family: var(--font-display);
  font-size: 22px;
}

.bubbles-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 10px 16px;
  border-radius: 26px;
  background: var(--surface);
}

.bubbles {
  min-height: 300px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 6px 10px;
}

.empty {
  margin: 0;
  padding: 40px 16px;
  text-align: center;
  font-size: 14px;
  color: var(--muted);
}

.message {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}

.message.celebrate {
  align-self: center;
  padding: 6px 12px;
  border-radius: 12px;
  background: var(--green-fill);
  color: var(--green-text);
  font-size: 13px;
  font-weight: 700;
  animation: message-pop 400ms ease-out;
}

@keyframes message-pop {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  60% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

/* ---- monthly record ---- */
.record {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background: var(--surface);
}

.record-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.record-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 400;
}

.summary {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--muted);
}

.tabs-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tabs {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  flex-shrink: 0;
  min-height: var(--tap);
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 500;
}

.tab.on {
  background: var(--c-fill);
  color: var(--c-text);
  font-weight: 700;
  outline: 1.5px solid var(--c-deep);
  outline-offset: -1.5px;
}

.edit {
  flex-shrink: 0;
  min-height: var(--tap);
  padding: 0 12px;
  display: flex;
  align-items: center;
  border-radius: var(--radius-pill);
  background: var(--chip);
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
}

.grid.head {
  text-align: center;
  font-size: 11px;
  color: var(--muted);
}

.cell {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.day {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
}

.day.done {
  border: 2px solid var(--c-deep);
  background: var(--c-fill);
  color: var(--c-text);
  font-weight: 700;
}

.day.missed {
  background: var(--surface-muted);
  color: var(--muted);
}

.day.off {
  color: var(--done-dot);
}

.day.future {
  border: 1.5px dashed var(--dashed);
  color: var(--done-dot);
}

.day.today {
  outline: 1.5px solid var(--ink);
  outline-offset: 2px;
}

.stats {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px dashed var(--dashed);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 12px;
  color: var(--muted);
}

.stat-value {
  font-size: 17px;
  font-weight: 700;
}
</style>
