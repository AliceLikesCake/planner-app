<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AddHeader from '@/components/AddHeader.vue'
import DeleteButton from '@/components/DeleteButton.vue'
import SyncSummary from '@/components/SyncSummary.vue'
import Toggle from '@/components/Toggle.vue'
import { fromKey, minutesToTime, shortTime, timeToMinutes, todayKey } from '@/services/dates'
import { useCategoriesStore } from '@/stores/categories'
import { useGigsStore } from '@/stores/gigs'
import { useTasksStore } from '@/stores/tasks'
import { paletteVars } from '@/styles/palette'
import type { TaskRow } from '@/types/db'

/** Set on /edit/task/:id; the form then edits that task instead of adding one. */
const props = defineProps<{ id?: string }>()

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const categories = useCategoriesStore()
const gigs = useGigsStore()
const tasks = useTasksStore()

const taskCategories = computed(() => categories.ofType('task'))
const existing = props.id ? tasks.items.find((t) => t.id === props.id) : undefined

function leave() {
  if (window.history.state?.back) router.back()
  else router.replace('/')
}

// A to-do made from an event is edited through its event (rule 7 keeps them in step).
if (existing?.source === 'event' && existing.event_id) {
  router.replace(`/edit/event/${existing.event_id}`)
} else if (props.id && !existing) {
  router.replace('/')
}

const title = ref(existing?.title ?? '')
const categoryId = ref(existing ? existing.category_id : (taskCategories.value[0]?.id ?? null))
const gigId = ref<string | null>(existing?.gig_id ?? null)
const date = ref(
  existing?.date ?? (typeof route.query.date === 'string' ? route.query.date : todayKey()),
)
const time = ref(shortTime(existing?.time))
const repeat = ref<TaskRow['repeat']>(existing?.repeat ?? 'none')
const remind = ref(existing?.remind ?? false)
const showInCalendar = ref(existing?.show_in_calendar ?? true)
const note = ref(existing?.note ?? '')
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

async function remove() {
  if (!existing) return
  saving.value = true
  failed.value = false
  try {
    await tasks.remove(existing.id)
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
    gig_id: gigId.value,
    date: date.value,
    time: time.value || null,
    repeat: repeat.value,
    remind: remind.value,
    show_in_calendar: showInCalendar.value,
    note: note.value.trim() || null,
  }
  try {
    if (existing) await tasks.update(existing.id, fields)
    else await tasks.add(fields)
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
      :title="t(existing ? 'today.editTask' : 'today.addTask')"
      :can-save="canSave"
      @save="save"
    />

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
          :autofocus="!existing"
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
          <div class="grid-4">
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

      <SyncSummary :lines="syncLines" />

      <DeleteButton
        v-if="existing"
        :label="t('addTask.deleteTask')"
        :hint="existing.repeat !== 'none' ? t('addTask.deleteRepeatHint') : undefined"
        :busy="saving"
        @confirm="remove"
      />

      <p v-if="failed" class="error" role="alert">{{ t('today.saveError') }}</p>
    </form>
  </main>
</template>
