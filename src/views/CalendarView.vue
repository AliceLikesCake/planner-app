<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MonthGrid, { type CalendarEvent } from '@/components/MonthGrid.vue'
import { layoutMonth } from '@/components/monthLayout'
import { useToday } from '@/composables/useToday'
import { fromKey, shortTime, toKey, type DateKey } from '@/services/dates'
import { calendarTodos, eventDays } from '@/services/sync'
import { useCategoriesStore } from '@/stores/categories'
import { useEventsStore } from '@/stores/events'
import { useSettingsStore } from '@/stores/settings'
import { paletteVars } from '@/styles/palette'
import type { EventRow } from '@/types/db'

const { t, locale } = useI18n()
const today = useToday()
const settings = useSettingsStore()
const categories = useCategoriesStore()
const events = useEventsStore()

// ---- month and selected day ----
const cursor = ref(new Date(fromKey(today.value).getFullYear(), fromKey(today.value).getMonth(), 1))
const selected = ref<DateKey>(today.value)

function shiftMonth(delta: number) {
  const c = cursor.value
  cursor.value = new Date(c.getFullYear(), c.getMonth() + delta, 1)
}
watch(cursor, (c) => {
  const inMonth = (key: DateKey) => {
    const d = fromKey(key)
    return d.getFullYear() === c.getFullYear() && d.getMonth() === c.getMonth()
  }
  if (!inMonth(selected.value)) selected.value = inMonth(today.value) ? today.value : toKey(c)
})

const title = computed(() => {
  const c = cursor.value
  const month =
    locale.value === 'en'
      ? new Intl.DateTimeFormat('en', { month: 'long' }).format(c)
      : c.getMonth() + 1
  return t('calendar.title', { year: c.getFullYear(), month })
})

// ---- category filter ----
const filter = ref<string>('all')
const eventCategories = computed(() => categories.ofType('event'))
const filters = computed(() => [
  { id: 'all', label: t('common.all'), color: null },
  ...eventCategories.value.map((c) => ({ id: c.id, label: categories.name(c), color: c.color })),
])
const shownEvents = computed(() =>
  events.items.filter((e) => filter.value === 'all' || e.category_id === filter.value),
)

// ---- grid ----
const weekStart = computed(() => settings.row?.week_start ?? 'mon')
const weekdays = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, {
    weekday: locale.value === 'en' ? 'short' : 'narrow',
  })
  // 2026-10-04 is a Sunday
  const offset = weekStart.value === 'sun' ? 0 : 1
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2026, 9, 4 + offset + i)))
})

const gridEvents = computed<CalendarEvent[]>(() =>
  shownEvents.value.map((e) => ({
    id: e.id,
    start: e.start_date,
    end: e.end_date,
    title: e.title,
    color: categories.byId(e.category_id)?.color ?? 'sand',
  })),
)
const weeks = computed(() =>
  layoutMonth(
    cursor.value.getFullYear(),
    cursor.value.getMonth(),
    weekStart.value,
    gridEvents.value,
  ),
)

// ---- selected day panel ----
const selectedLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'long', day: 'numeric', weekday: 'short' }).format(
    fromKey(selected.value),
  ),
)

function eventMeta(e: EventRow) {
  const parts: string[] = []
  if (e.end_date > e.start_date) {
    parts.push(
      t('calendar.dayN', {
        n: eventDays({ start_date: e.start_date, end_date: selected.value }).length,
      }),
    )
  }
  if (e.all_day) parts.push(t('calendar.allDay'))
  else if (e.start_time) {
    parts.push(
      e.end_time ? `${shortTime(e.start_time)}–${shortTime(e.end_time)}` : shortTime(e.start_time),
    )
  }
  if (e.place) parts.push(e.place)
  return parts.join(' · ')
}

const dayEvents = computed(() =>
  shownEvents.value
    .filter((e) => e.start_date <= selected.value && selected.value <= e.end_date)
    .sort((a, b) =>
      a.all_day === b.all_day
        ? (a.start_time ?? '').localeCompare(b.start_time ?? '')
        : a.all_day
          ? -1
          : 1,
    )
    .map((e) => {
      const category = categories.byId(e.category_id)
      return { event: e, meta: eventMeta(e), category, name: categories.name(category) }
    }),
)

const todos = computed(() => calendarTodos(selected.value))
const todoDone = computed(() => todos.value.filter((o) => o.done).length)
const isPast = computed(() => selected.value < today.value)
</script>

<template>
  <main class="page">
    <div class="page-body calendar">
      <header class="top">
        <h1 class="title">{{ title }}</h1>
        <div class="nav">
          <button
            type="button"
            class="icon-btn"
            :aria-label="t('calendar.prevMonth')"
            @click="shiftMonth(-1)"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            class="icon-btn"
            :aria-label="t('calendar.nextMonth')"
            @click="shiftMonth(1)"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </header>

      <div class="filters" role="group" :aria-label="t('calendar.filterLabel')">
        <button
          v-for="f in filters"
          :key="f.id"
          type="button"
          class="filter"
          :class="{ on: filter === f.id }"
          :style="f.color ? paletteVars(f.color) : undefined"
          :aria-pressed="filter === f.id"
          @click="filter = f.id"
        >
          <span v-if="f.color" class="dot" />{{ f.label }}
        </button>
      </div>

      <MonthGrid
        :weeks="weeks"
        :weekdays="weekdays"
        :selected="selected"
        :today="today"
        @select="selected = $event"
      />

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">{{ selectedLabel }}</h2>
          <span v-if="dayEvents.length" class="panel-count">{{
            t('calendar.events', { n: dayEvents.length })
          }}</span>
        </div>
        <RouterLink
          v-for="item in dayEvents"
          :key="item.event.id"
          :to="`/edit/event/${item.event.id}`"
          class="event"
          :style="paletteVars(item.category?.color)"
        >
          <span class="event-bar" />
          <span class="event-text">
            <span class="event-title">{{ item.event.title }}</span>
            <span v-if="item.meta" class="event-meta">{{ item.meta }}</span>
          </span>
          <span v-if="item.name" class="chip">{{ item.name }}</span>
        </RouterLink>
        <p v-if="!dayEvents.length" class="empty">{{ t('calendar.noEvents') }}</p>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">{{ t('calendar.todos') }}</h2>
          <span v-if="todos.length" class="panel-count num">{{
            t('calendar.todoDone', { done: todoDone, total: todos.length })
          }}</span>
        </div>
        <div v-if="todos.length" class="progress">
          <div
            class="progress-fill"
            :style="{ width: Math.round((todoDone / todos.length) * 100) + '%' }"
          />
        </div>
        <RouterLink
          v-for="o in todos"
          :key="o.task.id"
          :to="`/edit/task/${o.task.id}`"
          class="todo"
          :class="{ done: o.done }"
          :style="paletteVars(categories.byId(o.task.category_id)?.color)"
        >
          <span class="check">
            <svg
              v-if="o.done"
              width="12"
              height="12"
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
          <span class="todo-text">
            <span class="todo-title">{{ o.task.title }}</span>
            <span class="todo-meta" :class="{ missed: !o.done && isPast }">
              {{
                [
                  shortTime(o.task.time),
                  o.done ? t('calendar.done') : isPast ? t('calendar.missed') : '',
                ]
                  .filter(Boolean)
                  .join(' · ')
              }}
            </span>
          </span>
          <span class="chip">{{ categories.name(categories.byId(o.task.category_id)) }}</span>
        </RouterLink>
        <p v-if="!todos.length" class="empty">{{ t('calendar.noTodos') }}</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 12px 110px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 6px;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 400;
}

.nav {
  display: flex;
  gap: 6px;
}

.filters {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 2px;
  scrollbar-width: none;
}

.filters::-webkit-scrollbar {
  display: none;
}

.filter {
  flex-shrink: 0;
  min-height: var(--tap);
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 500;
}

.filter.on {
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 700;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-deep);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 22px;
  background: var(--surface);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.panel-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 400;
}

.panel-count {
  font-size: 13px;
  color: var(--muted);
}

.event,
.todo {
  color: inherit;
  text-decoration: none;
}

.event {
  min-height: 46px;
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.event-bar {
  width: 4px;
  flex-shrink: 0;
  border-radius: 2px;
  background: var(--c-deep);
}

.event-text,
.todo-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.event-title,
.todo-title {
  font-size: 15px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.event-meta,
.todo-meta {
  font-size: 12px;
  color: var(--muted);
}

.chip {
  align-self: center;
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 10px;
  background: var(--c-fill);
  color: var(--c-text);
  font-size: 11px;
  font-weight: 700;
}

.progress {
  height: 8px;
  border-radius: 4px;
  background: var(--divider);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--switch-on);
}

.todo {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.check {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--c-text);
  border-radius: 50%;
  background: var(--surface);
  color: var(--on-primary);
}

.todo-meta.missed {
  color: var(--missed-fg);
  font-weight: 700;
}

.todo.done .check {
  border: none;
  background: var(--done-dot);
}

.todo.done .todo-title {
  color: var(--faint);
  text-decoration: line-through;
}

.todo.done .chip {
  background: var(--done-chip);
  color: var(--muted);
}

.empty {
  margin: 0;
  padding: 6px 0;
  font-size: 14px;
  color: var(--muted);
}
</style>
