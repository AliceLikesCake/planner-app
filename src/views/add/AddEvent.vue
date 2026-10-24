<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AddHeader from '@/components/AddHeader.vue'
import DeleteButton from '@/components/DeleteButton.vue'
import SyncSummary from '@/components/SyncSummary.vue'
import Toggle from '@/components/Toggle.vue'
import { fromKey, shortTime, todayKey } from '@/services/dates'
import { createEvent, deleteEvent, updateEvent } from '@/services/sync'
import { useCategoriesStore } from '@/stores/categories'
import { useEventsStore } from '@/stores/events'
import { paletteVars } from '@/styles/palette'
import type { EventRow } from '@/types/db'

/** Set on /edit/event/:id; the form then edits that event instead of adding one. */
const props = defineProps<{ id?: string }>()

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const categories = useCategoriesStore()

const eventCategories = computed(() => categories.ofType('event'))
const existing = props.id ? useEventsStore().items.find((e) => e.id === props.id) : undefined
const initialDate = typeof route.query.date === 'string' ? route.query.date : todayKey()

function leave() {
  if (window.history.state?.back) router.back()
  else router.replace('/calendar')
}

// A gig's dates live on the gig (rule 1 keeps the events in step).
if (existing?.source === 'gig' && existing.gig_id) router.replace(`/edit/gig/${existing.gig_id}`)
else if (props.id && !existing) router.replace('/calendar')

const title = ref(existing?.title ?? '')
const categoryId = ref(existing ? existing.category_id : (eventCategories.value[0]?.id ?? null))
const allDay = ref(existing?.all_day ?? true)
const startDate = ref(existing?.start_date ?? initialDate)
const endDate = ref(existing?.end_date ?? initialDate)
const startTime = ref(shortTime(existing?.start_time))
const endTime = ref(shortTime(existing?.end_time))
const place = ref(existing?.place ?? '')
const remind = ref<EventRow['remind']>(existing?.remind ?? 'none')
const addToToday = ref(existing?.add_to_today ?? false)
const saving = ref(false)
const failed = ref(false)

// Keep the range valid: moving the start past the end drags the end along.
watch(startDate, (start) => {
  if (start && endDate.value < start) endDate.value = start
})

const reminds = computed(() => [
  { value: 'none' as const, label: t('addEvent.remindNone') },
  { value: 'hour' as const, label: t('addEvent.remindHour') },
  { value: 'day' as const, label: t('addEvent.remindDay') },
  { value: 'week' as const, label: t('addEvent.remindWeek') },
])

const fmt = (key: string) =>
  key
    ? new Intl.DateTimeFormat(locale.value, { month: 'numeric', day: 'numeric' }).format(
        fromKey(key),
      )
    : ''

const syncLines = computed(() => {
  const category = categories.name(categories.byId(categoryId.value))
  const multi = endDate.value > startDate.value
  const name = title.value.trim() || t('addEvent.untitled')
  const lines = [
    multi
      ? t('addEvent.syncRange', {
          range: `${fmt(startDate.value)} – ${fmt(endDate.value)}`,
          category,
        })
      : t('addEvent.syncDay', { date: fmt(startDate.value), category }),
  ]
  if (remind.value !== 'none') {
    const label = reminds.value.find((r) => r.value === remind.value)!.label
    lines.push(t('addEvent.syncRemind', { remind: label }))
  }
  if (addToToday.value) {
    lines.push(
      multi
        ? t('addEvent.syncTodayRange', { title: name })
        : t('addEvent.syncTodayDay', { date: fmt(startDate.value), title: name }),
    )
  }
  return lines
})

const canSave = computed(
  () =>
    !!title.value.trim() &&
    !!startDate.value &&
    !!endDate.value &&
    endDate.value >= startDate.value &&
    !saving.value,
)

async function remove() {
  if (!existing) return
  saving.value = true
  failed.value = false
  try {
    await deleteEvent(existing.id)
    leave()
  } catch (error) {
    console.error(error)
    failed.value = true
  } finally {
    saving.value = false
  }
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  failed.value = false
  const fields = {
    title: title.value.trim(),
    category_id: categoryId.value,
    start_date: startDate.value,
    end_date: endDate.value,
    all_day: allDay.value,
    start_time: allDay.value ? null : startTime.value || null,
    end_time: allDay.value ? null : endTime.value || null,
    place: place.value.trim() || null,
    remind: remind.value,
    add_to_today: addToToday.value,
  }
  try {
    if (existing) await updateEvent(existing.id, fields)
    else await createEvent(fields)
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
      :title="t(existing ? 'calendar.editEvent' : 'calendar.addEvent')"
      :can-save="canSave"
      @save="save"
    />

    <form class="page-body form" @submit.prevent="save">
      <div class="card field">
        <label for="event-title" class="field-label">{{ t('addEvent.name') }}</label>
        <input
          id="event-title"
          v-model="title"
          class="title-input"
          type="text"
          enterkeyhint="done"
          :placeholder="t('addEvent.placeholder')"
          :autofocus="!existing"
        />
      </div>

      <fieldset class="group">
        <legend class="group-label">{{ t('addEvent.category') }}</legend>
        <div class="cats">
          <button
            v-for="c in eventCategories"
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

      <div class="card rows">
        <div class="row">
          <span>{{ t('addEvent.allDay') }}</span>
          <Toggle v-model="allDay" :label="t('addEvent.allDay')" />
        </div>
        <div class="row">
          <label for="event-start">{{ t('addEvent.start') }}</label>
          <span class="time-wrap">
            <input id="event-start" v-model="startDate" class="value-input" type="date" required />
            <input
              v-if="!allDay"
              v-model="startTime"
              class="value-input"
              type="time"
              :aria-label="t('addEvent.startTime')"
            />
          </span>
        </div>
        <div class="row">
          <label for="event-end">{{ t('addEvent.end') }}</label>
          <span class="time-wrap">
            <input
              id="event-end"
              v-model="endDate"
              class="value-input"
              type="date"
              :min="startDate"
              required
            />
            <input
              v-if="!allDay"
              v-model="endTime"
              class="value-input"
              type="time"
              :aria-label="t('addEvent.endTime')"
            />
          </span>
        </div>
        <div class="row">
          <label for="event-place">{{ t('addEvent.place') }}</label>
          <input
            id="event-place"
            v-model="place"
            class="value-input plain"
            type="text"
            :placeholder="t('addEvent.placePlaceholder')"
          />
        </div>
      </div>

      <div class="card rows">
        <fieldset class="row stacked">
          <legend class="row-legend">{{ t('addEvent.remind') }}</legend>
          <div class="grid-4">
            <button
              v-for="r in reminds"
              :key="r.value"
              type="button"
              class="chip"
              :class="{ on: remind === r.value }"
              :aria-pressed="remind === r.value"
              @click="remind = r.value"
            >
              {{ r.label }}
            </button>
          </div>
        </fieldset>
      </div>

      <div class="card rows">
        <div class="row tall">
          <span class="row-text">
            <span>{{ t('addEvent.addToToday') }}</span>
            <span class="sub">{{ t('addEvent.addToTodaySub') }}</span>
          </span>
          <Toggle v-model="addToToday" :label="t('addEvent.addToToday')" />
        </div>
      </div>

      <SyncSummary :lines="syncLines" />

      <DeleteButton
        v-if="existing"
        :label="t('addEvent.deleteEvent')"
        :hint="existing.add_to_today ? t('addEvent.deleteHint') : undefined"
        :busy="saving"
        @confirm="remove"
      />

      <p v-if="failed" class="error" role="alert">{{ t('today.saveError') }}</p>
    </form>
  </main>
</template>
