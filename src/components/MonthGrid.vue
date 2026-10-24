<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { paletteVars } from '@/styles/palette'
import { fromKey, type DateKey } from '@/services/dates'
import type { DayCell, MonthWeek } from './monthLayout'

export interface CalendarEvent {
  id: string
  start: DateKey
  end: DateKey
  title: string
  /** Palette key of the event's category. */
  color: string
}

defineProps<{
  weeks: MonthWeek<CalendarEvent>[]
  /** Column headers, in grid order. */
  weekdays: string[]
  selected: DateKey
  today: DateKey
}>()
defineEmits<{ select: [key: DateKey] }>()

const { t, locale } = useI18n()

function aria(cell: DayCell<CalendarEvent>) {
  const date = new Intl.DateTimeFormat(locale.value, { month: 'long', day: 'numeric' }).format(
    fromKey(cell.key),
  )
  const events = cell.events.length
    ? cell.events.map((e) => e.title).join(locale.value === 'en' ? ', ' : '、')
    : t('calendar.noEvents')
  return t('calendar.dayAria', { date, events })
}

function isWeekend(key: DateKey) {
  const dow = fromKey(key).getDay()
  return dow === 0 || dow === 6
}
</script>

<template>
  <div class="month">
    <div class="head">
      <div v-for="(w, i) in weekdays" :key="i">{{ w }}</div>
    </div>
    <div v-for="(week, wi) in weeks" :key="wi" class="week">
      <div v-for="(cell, ci) in week.cells" :key="ci" class="slot">
        <button
          v-if="cell"
          type="button"
          class="day"
          :class="{ selected: cell.key === selected }"
          :aria-pressed="cell.key === selected"
          :aria-label="aria(cell)"
          @click="$emit('select', cell.key)"
        >
          <span class="num" :class="{ today: cell.key === today, weekend: isWeekend(cell.key) }">{{
            cell.day
          }}</span>
          <span
            v-for="(s, li) in cell.slots"
            :key="li"
            class="bar"
            :class="{ empty: !s, 'join-left': s?.joinLeft, 'join-right': s?.joinRight }"
            :style="s ? paletteVars(s.event.color) : undefined"
            >{{ s?.showText ? s.event.title : '\u00a0' }}</span
          >
          <span v-if="cell.more" class="more">{{ t('calendar.more', { n: cell.more }) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.month {
  padding: 8px 4px 4px;
  border-radius: 22px;
  background: var(--surface);
}

.head {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  padding-bottom: 6px;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}

.week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.slot {
  min-height: 78px;
  display: flex;
  border-top: 1px solid var(--chip);
}

.day {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  padding: 3px 0 4px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--ink);
}

.day.selected {
  background: var(--surface-muted);
}

.num {
  align-self: center;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.num.weekend {
  color: var(--missed-fg);
}

.selected .num {
  font-weight: 700;
}

.num.today {
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 700;
}

.bar {
  display: block;
  height: 16px;
  margin: 0 2px;
  padding: 0 3px;
  overflow: hidden;
  border-radius: 5px;
  background: var(--c-fill);
  color: var(--c-text);
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: left;
  white-space: nowrap;
}

.bar.empty {
  background: transparent;
}

/* A bar that carries on into the neighboring cell meets it edge to edge. */
.bar.join-left {
  margin-left: -1px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.bar.join-right {
  margin-right: -1px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.more {
  padding-left: 3px;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-align: left;
}
</style>
