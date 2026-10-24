<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BackHeader from '@/components/BackHeader.vue'
import ErrorToast from '@/components/ErrorToast.vue'
import Toggle from '@/components/Toggle.vue'
import Cake from '@/components/cake/Cake.vue'
import { computeLayers } from '@/components/cake/layers'
import {
  DEFAULT_WEEK,
  DESSERT_HEIGHT,
  DESSERT_IDS,
  isDessertId,
  weeklyDesserts,
  type DessertId,
} from '@/components/cake/desserts'
import { useErrorToast } from '@/composables/useErrorToast'
import { useToday } from '@/composables/useToday'
import { fromKey, weekdayIndex, weekOf } from '@/services/dates'
import { useSettingsStore } from '@/stores/settings'
import { CAKE_TONES } from '@/styles/palette'

const { t, locale } = useI18n()
const today = useToday()
const settings = useSettingsStore()
const { error, showError } = useErrorToast()

function save(patch: Parameters<typeof settings.update>[0]) {
  settings.update(patch).catch((e) => {
    console.error(e)
    showError()
  })
}

const random = computed({
  get: () => !!settings.row?.cakes_random_weekly,
  set: (v: boolean) => save({ cakes_random_weekly: v }),
})
const glitter = computed({
  get: () => settings.row?.cake_glitter !== false,
  set: (v: boolean) => save({ cake_glitter: v }),
})

// ---- dessert of each weekday ----
const week = computed(() => weekOf(today.value))
const picks = computed<DessertId[]>(() => {
  if (random.value) return weeklyDesserts(week.value[0]!)
  const chosen = settings.row?.cakes_by_weekday ?? []
  return DEFAULT_WEEK.map((d, i) => (isDessertId(chosen[i]) ? (chosen[i] as DessertId) : d))
})
const dayNames = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, { weekday: 'long' })
  const short = new Intl.DateTimeFormat(locale.value, {
    weekday: locale.value === 'en' ? 'short' : 'narrow',
  })
  return week.value.map((d) => ({ long: fmt.format(fromKey(d)), short: short.format(fromKey(d)) }))
})
const todayIndex = computed(() => weekdayIndex(today.value))

const open = ref<number | null>(null)
function pick(index: number, dessert: DessertId) {
  const next = [...picks.value]
  next[index] = dessert
  save({ cakes_by_weekday: next })
}

// A finished five-layer cake in the task colors, to show what each dessert looks like.
const sample = computed(() => {
  const tones = [
    CAKE_TONES.blue,
    CAKE_TONES.lav,
    CAKE_TONES.green,
    CAKE_TONES.butter,
    CAKE_TONES.rose,
  ]
  return (dessert: DessertId) =>
    computeLayers(
      tones.map((color, i) => ({ id: `${i}`, color, group: `${i}`, done: true, doneAt: `${i}` })),
      DESSERT_HEIGHT[dessert],
    ).segments
})

// ---- layers ----
const maxLayers = computed(() => settings.row?.max_layers ?? 8)
</script>

<template>
  <main class="page">
    <BackHeader :title="t('settings.cakes')" fallback="/settings" />
    <div class="page-body list">
      <section class="card">
        <h2 class="card-title">{{ t('cakes.week') }}</h2>
        <p v-if="random" class="sub note">{{ t('cakes.randomNote') }}</p>
        <div v-for="(d, i) in picks" :key="i" class="day">
          <button
            type="button"
            class="day-head"
            :aria-expanded="open === i"
            :aria-label="t('cakes.pickFor', { day: dayNames[i]!.long })"
            :disabled="random"
            @click="open = open === i ? null : i"
          >
            <span class="day-box" :class="{ today: i === todayIndex }">{{
              dayNames[i]!.short
            }}</span>
            <span class="day-name">{{ t(`dessert.${d}`) }}</span>
            <svg
              v-if="!random"
              class="chevron"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path :d="open === i ? 'M5 9l7 7 7-7' : 'M9 5l7 7-7 7'" />
            </svg>
          </button>
          <div v-if="open === i && !random" class="picker">
            <Cake
              :dessert="d"
              :layers="sample(d)"
              all-done
              :label="t(`dessert.${d}`)"
              class="preview"
            />
            <div class="chips">
              <button
                v-for="id in DESSERT_IDS"
                :key="id"
                type="button"
                class="chip"
                :class="{ on: id === d }"
                :aria-pressed="id === d"
                @click="pick(i, id)"
              >
                {{ t(`dessert.${id}`) }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="row tall">
          <span class="text">
            <span>{{ t('cakes.randomWeekly') }}</span>
            <span class="sub">{{ t('cakes.randomSub') }}</span>
          </span>
          <Toggle v-model="random" :label="t('cakes.randomWeekly')" />
        </div>
        <div class="row tall">
          <span class="text">
            <span>{{ t('cakes.glitter') }}</span>
            <span class="sub">{{ t('cakes.glitterSub') }}</span>
          </span>
          <Toggle v-model="glitter" :label="t('cakes.glitter')" />
        </div>
      </section>

      <section class="card layers">
        <div class="text">
          <span>{{ t('cakes.maxLayers') }}</span>
          <span class="sub">{{ t('cakes.maxLayersSub') }}</span>
        </div>
        <div class="grid-4">
          <button
            v-for="n in [6, 8, 10, 12]"
            :key="n"
            type="button"
            class="chip"
            :class="{ on: n === maxLayers }"
            :aria-pressed="n === maxLayers"
            @click="save({ max_layers: n })"
          >
            {{ t('cakes.layersN', { n }) }}
          </button>
        </div>
      </section>
    </div>
    <ErrorToast :message="error" />
  </main>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  padding: 4px 16px;
  border-radius: 20px;
  background: var(--surface);
}

.card-title {
  margin: 0;
  padding: 12px 0 4px;
  font-size: 15px;
  font-weight: 700;
}

.note {
  padding-bottom: 6px;
}

.day + .day {
  border-top: 1px solid var(--divider);
}

.day-head {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ink);
  text-align: left;
}

.day-head:disabled {
  cursor: default;
}

.day-box {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--surface-muted);
  font-size: 13px;
  font-weight: 700;
}

.day-box.today {
  background: var(--primary);
  color: var(--on-primary);
}

.day-name {
  flex: 1;
  font-size: 15px;
}

.chevron {
  flex-shrink: 0;
  fill: none;
  stroke: var(--done-dot);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  min-height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: 18px;
  background: var(--surface-muted);
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 500;
  position: relative;
}

.chip::after {
  content: '';
  position: absolute;
  inset: -4px 0;
}

.chip.on {
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 700;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
}

.row + .row {
  border-top: 1px solid var(--divider);
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 15px;
}

.sub {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.layers {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.grid-4 .chip {
  padding: 0;
}
</style>
