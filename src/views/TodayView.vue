<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Cake from '@/components/cake/Cake.vue'
import ErrorToast from '@/components/ErrorToast.vue'
import SoundToggle from '@/components/SoundToggle.vue'
import TaskRow from '@/components/TaskRow.vue'
import { computeLayers, type CakeTask } from '@/components/cake/layers'
import {
  DEFAULT_WEEK,
  DESSERT_HEIGHT,
  isDessertId,
  type DessertId,
} from '@/components/cake/desserts'
import { useErrorToast } from '@/composables/useErrorToast'
import { useToday } from '@/composables/useToday'
import { fromKey, shortTime, weekdayIndex, weekOf } from '@/services/dates'
import { playAllDone, playStack, playUndo } from '@/services/sound'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTasksStore, type TaskOccurrence } from '@/stores/tasks'
import { CAKE_TONES, isPaletteKey } from '@/styles/palette'

const { t, locale } = useI18n()
const router = useRouter()
const settings = useSettingsStore()
const tasks = useTasksStore()
const categories = useCategoriesStore()
const today = useToday()

const dateLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'long', day: 'numeric', weekday: 'long' }).format(
    fromKey(today.value),
  ),
)

// ---- dessert of the week ----
const selectedDay = ref(weekdayIndex(today.value))
watch(today, (key) => (selectedDay.value = weekdayIndex(key)))

function dessertOn(index: number): DessertId {
  const chosen = settings.row?.cakes_by_weekday[index]
  return isDessertId(chosen) ? chosen : DEFAULT_WEEK[index]!
}

const week = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, {
    weekday: locale.value === 'en' ? 'short' : 'narrow',
  })
  const todayIndex = weekdayIndex(today.value)
  return weekOf(today.value).map((key, i) => ({
    label: fmt.format(fromKey(key)),
    dessert: dessertOn(i),
    isToday: i === todayIndex,
  }))
})
const dessert = computed(() => dessertOn(selectedDay.value))
const dessertName = computed(() => t(`dessert.${dessert.value}`))

// ---- today's tasks and the cake ----
const items = computed(() => tasks.occurrencesOn(today.value))
const lastDoneId = ref<string | null>(null)

const cakeTasks = computed<CakeTask[]>(() =>
  items.value.map((o) => {
    const category = categories.byId(o.task.category_id)
    const tone = isPaletteKey(category?.color) ? CAKE_TONES[category.color] : CAKE_TONES.sand
    return {
      id: o.task.id,
      color: tone,
      group: category?.id ?? 'none',
      done: o.done,
      doneAt: o.doneAt,
    }
  }),
)
const layout = computed(() =>
  computeLayers(
    cakeTasks.value,
    DESSERT_HEIGHT[dessert.value],
    settings.row?.max_layers ?? 8,
    lastDoneId.value,
  ),
)
const allDone = computed(() => layout.value.total > 0 && layout.value.done === layout.value.total)
const progress = computed(() =>
  layout.value.total ? Math.round((layout.value.done / layout.value.total) * 100) : 0,
)
const message = computed(() => {
  if (!layout.value.total) return t('today.emptyCake')
  if (allDone.value) return t('today.allDone')
  return t('today.left', { n: layout.value.total - layout.value.done })
})

// ---- interactions ----
const soundOn = computed(() => settings.row?.sound ?? true)
const { error, showError } = useErrorToast()

// Only one row is swiped open at a time.
const openId = ref<string | null>(null)

async function remove(item: TaskOccurrence) {
  openId.value = null
  try {
    await tasks.remove(item.task.id)
  } catch {
    showError()
  }
}

async function toggle(item: TaskOccurrence) {
  const done = !item.done
  lastDoneId.value = done ? item.task.id : null
  if (soundOn.value) {
    if (done) {
      const layer = layout.value.done + 1
      void playStack(layer)
      if (layer === layout.value.total) void playAllDone()
    } else {
      playUndo()
    }
  }
  try {
    await tasks.setDone(item.task, today.value, done)
  } catch {
    lastDoneId.value = null
    showError()
  }
}
</script>

<template>
  <main class="page today">
    <header class="top">
      <h1 class="date">{{ dateLabel }}</h1>
      <div class="actions">
        <SoundToggle @error="showError" />
        <RouterLink to="/settings" class="icon-btn" :aria-label="t('common.settings')">
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
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
            />
          </svg>
        </RouterLink>
      </div>
    </header>

    <section class="cake-card">
      <div class="week">
        <button
          v-for="(day, i) in week"
          :key="i"
          type="button"
          class="day"
          :class="{ on: i === selectedDay, today: day.isToday }"
          :aria-pressed="i === selectedDay"
          :aria-label="t('today.previewDessert', { dessert: t(`dessert.${day.dessert}`) })"
          @click="selectedDay = i"
        >
          {{ day.label }}
        </button>
      </div>
      <div class="cake-row">
        <Cake
          :dessert="dessert"
          :layers="layout.segments"
          :all-done="allDone"
          :label="
            t('today.cakeAria', { dessert: dessertName, done: layout.done, total: layout.total })
          "
        />
        <div class="cake-info">
          <div class="dessert-name">{{ dessertName }}</div>
          <div class="count">
            <span class="count-num num">{{ layout.done }} / {{ layout.total }}</span>
            <span class="count-unit">{{ t('today.layers') }}</span>
          </div>
          <div class="bar"><div class="bar-fill" :style="{ width: progress + '%' }" /></div>
          <div class="message" :class="{ celebrate: allDone }">{{ message }}</div>
        </div>
      </div>
    </section>

    <div class="list-head">
      <h2 class="list-title">{{ t('today.title') }}</h2>
      <span class="list-count num">
        {{ t('today.doneCount', { done: layout.done, total: layout.total }) }}
      </span>
    </div>

    <div class="list">
      <TaskRow
        v-for="item in items"
        :key="item.task.id"
        :title="item.task.title"
        :time="shortTime(item.task.time)"
        :category="categories.byId(item.task.category_id)"
        :category-name="categories.name(categories.byId(item.task.category_id))"
        :done="item.done"
        :bounce="item.task.id === lastDoneId"
        :open="openId === item.task.id"
        @update:open="openId = $event ? item.task.id : null"
        @toggle="toggle(item)"
        @edit="router.push(`/edit/task/${item.task.id}`)"
        @delete="remove(item)"
      />
      <p v-if="!items.length" class="empty">{{ t('today.empty') }}</p>
    </div>

    <ErrorToast :message="error" />
  </main>
</template>

<style scoped>
.today {
  gap: 10px;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.date {
  margin: 0;
  font-family: var(--font-display);
  font-size: 23px;
  font-weight: 400;
}

.actions {
  display: flex;
  gap: 8px;
}

/* ---- dessert card (stays put while the list scrolls) ---- */
.cake-card {
  flex-shrink: 0;
  margin: 0 16px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 24px;
  background: var(--surface);
}

.week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
}

.day {
  min-width: 0;
  height: 42px;
  padding: 0;
  border: none;
  border-radius: 14px;
  background: var(--surface-muted);
  color: var(--ink-2);
  font-size: 15px;
  font-weight: 700;
}

.day.today:not(.on) {
  outline: 1.5px solid var(--budget-bar);
  outline-offset: -1.5px;
}

.day.on {
  background: var(--primary);
  color: var(--on-primary);
}

.cake-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.cake-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.dessert-name {
  font-family: var(--font-display);
  font-size: 17px;
  line-height: 1.25;
}

.count {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.count-num {
  font-family: var(--font-display);
  font-size: 24px;
}

.count-unit {
  font-size: 12px;
  color: var(--muted);
}

.bar {
  height: 8px;
  border-radius: 4px;
  background: var(--divider);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--budget-bar);
  transition: width 300ms ease;
}

.message {
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.message.celebrate {
  align-self: flex-start;
  padding: 4px 8px;
  border-radius: 10px;
  background: var(--rose-fill);
  color: var(--rose-text);
  font-weight: 700;
}

/* ---- to-do list (scrolls on its own) ---- */
.list-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 2px 20px 0;
}

.list-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 400;
}

.list-count {
  font-size: 12px;
  color: var(--muted);
}

.list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 20px 88px;
  -webkit-overflow-scrolling: touch;
}

.empty {
  margin: 24px 0 0;
  text-align: center;
  font-size: 14px;
  color: var(--muted);
}
</style>
