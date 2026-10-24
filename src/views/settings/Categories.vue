<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import BackHeader from '@/components/BackHeader.vue'
import CategoryIcon from '@/components/CategoryIcon.vue'
import DeleteButton from '@/components/DeleteButton.vue'
import ErrorToast from '@/components/ErrorToast.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { useErrorToast } from '@/composables/useErrorToast'
import { useToday } from '@/composables/useToday'
import { formatMoney } from '@/services/money'
import { useCategoriesStore } from '@/stores/categories'
import { useEventsStore } from '@/stores/events'
import { useMoneyStore } from '@/stores/money'
import { useTasksStore } from '@/stores/tasks'
import { PALETTE_KEYS, paletteVars } from '@/styles/palette'
import type { CategoryRow, CategoryType, PaletteKey } from '@/types/db'

const { t, locale } = useI18n()
const route = useRoute()
const today = useToday()
const categories = useCategoriesStore()
const tasks = useTasksStore()
const events = useEventsStore()
const money = useMoneyStore()
const { error, showError } = useErrorToast()

type Tab = 'task' | 'event' | 'money'
const tab = ref<Tab>(
  route.query.tab === 'money' ? 'money' : route.query.tab === 'event' ? 'event' : 'task',
)
const tabs = computed(() => [
  { value: 'task' as const, label: t('cats.tabTask') },
  { value: 'event' as const, label: t('cats.tabEvent') },
  { value: 'money' as const, label: t('cats.tabMoney') },
])

const groups = computed<{ type: CategoryType; title: string }[]>(() =>
  tab.value === 'money'
    ? [
        { type: 'expense', title: t('cats.expense') },
        { type: 'income', title: t('cats.income') },
      ]
    : [{ type: tab.value, title: '' }],
)
const hint = computed(() =>
  t(
    tab.value === 'task'
      ? 'cats.hintTask'
      : tab.value === 'event'
        ? 'cats.hintEvent'
        : 'cats.hintMoney',
  ),
)

// What each category holds this month, as in the mockup ("本月 42 件", "$6,420").
const month = computed(() => today.value.slice(0, 7))
function meta(c: CategoryRow) {
  const inMonth = (d: string) => d.startsWith(month.value)
  if (c.type === 'task') {
    return t('cats.countTasks', {
      n: tasks.items.filter((x) => x.category_id === c.id && inMonth(x.date)).length,
    })
  }
  if (c.type === 'event') {
    return t('cats.countEvents', {
      n: events.items.filter((x) => x.category_id === c.id && inMonth(x.start_date)).length,
    })
  }
  return formatMoney(
    money.items
      .filter((x) => x.category_id === c.id && inMonth(x.date))
      .reduce((s, x) => s + x.amount, 0),
  )
}

// ---- editing: one row open at a time ----
const openId = ref<string | null>(null)
const draft = ref('')

function toggleOpen(c: CategoryRow) {
  if (openId.value === c.id) {
    openId.value = null
    return
  }
  openId.value = c.id
  draft.value = categories.name(c)
}

async function run(work: () => Promise<unknown>) {
  try {
    await work()
  } catch (e) {
    console.error(e)
    showError()
  }
}

/** Renames in the current language; a category the user added gets the name in both. */
function saveName(c: CategoryRow) {
  const name = draft.value.trim()
  if (!name || name === categories.name(c)) return
  const patch = c.key
    ? locale.value === 'en'
      ? { name_en: name }
      : { name_zh: name }
    : { name_zh: name, name_en: name }
  void run(() => categories.update(c.id, patch))
}

function setColor(c: CategoryRow, color: PaletteKey) {
  if (c.color !== color) void run(() => categories.update(c.id, { color }))
}

function remove(c: CategoryRow) {
  openId.value = null
  void run(async () => {
    await categories.remove(c.id)
    // The database sets category_id to null on rows that used it; the stores follow.
    for (const list of [tasks.items, events.items, money.items] as {
      category_id: string | null
    }[][]) {
      for (const row of list) if (row.category_id === c.id) row.category_id = null
    }
  })
}

function add(type: CategoryType) {
  const same = categories.ofType(type)
  const used = new Set(same.map((c) => c.color))
  const color = PALETTE_KEYS.find((k) => !used.has(k)) ?? 'sand'
  const name = t('cats.newName')
  void run(async () => {
    const created = await categories.add({
      type,
      name_zh: name,
      name_en: name,
      color,
      sort: Math.max(-1, ...same.map((c) => c.sort)) + 1,
    })
    openId.value = created.id
    draft.value = name
    await nextTick()
    document.getElementById(`cat-name-${created.id}`)?.focus()
  })
}
</script>

<template>
  <main class="page">
    <BackHeader :title="t('settings.categories')" fallback="/settings" />
    <div class="page-body list">
      <SegmentedControl v-model="tab" class="tabs" :options="tabs" :label="t('cats.tabsLabel')" />
      <p class="hint">{{ hint }}</p>

      <section v-for="g in groups" :key="g.type" class="group">
        <h2 v-if="g.title" class="group-title">{{ g.title }}</h2>
        <div class="card">
          <div
            v-for="c in categories.ofType(g.type)"
            :key="c.id"
            class="item"
            :style="paletteVars(c.color)"
          >
            <button
              type="button"
              class="item-head"
              :aria-expanded="openId === c.id"
              :aria-label="t('cats.edit', { name: categories.name(c) })"
              @click="toggleOpen(c)"
            >
              <span class="swatch"><CategoryIcon :name="c.key" :size="16" /></span>
              <span class="item-name">{{ categories.name(c) }}</span>
              <span class="item-meta num">{{ meta(c) }}</span>
              <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="openId === c.id ? 'M5 9l7 7 7-7' : 'M9 5l7 7-7 7'" />
              </svg>
            </button>

            <div v-if="openId === c.id" class="editor">
              <label class="field">
                <span class="sub">{{ t('cats.name') }}</span>
                <input
                  :id="`cat-name-${c.id}`"
                  v-model="draft"
                  class="name-input"
                  type="text"
                  enterkeyhint="done"
                  @blur="saveName(c)"
                  @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
                />
              </label>
              <div class="field">
                <span class="sub">{{ t('cats.color') }}</span>
                <div class="palette">
                  <button
                    v-for="k in PALETTE_KEYS"
                    :key="k"
                    type="button"
                    class="color"
                    :class="{ on: c.color === k }"
                    :style="paletteVars(k)"
                    :aria-pressed="c.color === k"
                    :aria-label="t(`palette.${k}`)"
                    @click="setColor(c, k)"
                  >
                    <svg
                      v-if="c.color === k"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="field preview-row">
                <span class="sub">{{ t('cats.preview') }}</span>
                <span class="preview">{{ draft.trim() || categories.name(c) }}</span>
              </div>
              <DeleteButton
                v-if="categories.ofType(g.type).length > 1"
                :label="t('cats.delete')"
                :hint="t('cats.deleteHint')"
                @confirm="remove(c)"
              />
              <p v-else class="sub">{{ t('cats.lastOne') }}</p>
            </div>
          </div>
        </div>
        <button type="button" class="add" @click="add(g.type)">＋ {{ t('cats.add') }}</button>
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

.tabs {
  align-self: stretch;
}

.tabs :deep(.seg) {
  flex: 1;
}

.hint {
  margin: 0;
  padding: 0 6px;
  font-size: 12px;
  color: var(--muted);
}

.group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-title {
  margin: 0;
  padding: 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}

.card {
  padding: 0 16px;
  border-radius: 20px;
  background: var(--surface);
}

.item + .item {
  border-top: 1px solid var(--divider);
}

.item-head {
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

.swatch {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--c-fill);
  color: var(--c-text);
  outline: 2px solid var(--c-deep);
  outline-offset: -2px;
}

.item-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  overflow-wrap: anywhere;
}

.item-meta {
  font-size: 12px;
  color: var(--muted);
}

.chevron {
  flex-shrink: 0;
  fill: none;
  stroke: var(--done-dot);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sub {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.name-input {
  min-height: var(--tap);
  padding: 0 12px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  outline: none;
  background: var(--surface-muted);
  color: var(--ink);
  font-size: 15px;
}

.palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color {
  width: var(--tap);
  height: var(--tap);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--c-deep);
  border-radius: 50%;
  background: var(--c-fill);
}

.color.on {
  border-color: var(--ink);
}

.color svg {
  fill: none;
  stroke: var(--ink);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.preview-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.preview {
  padding: 4px 12px;
  border-radius: 12px;
  background: var(--c-fill);
  color: var(--c-text);
  font-size: 13px;
  font-weight: 700;
}

.add {
  min-height: var(--tap);
  border: 1.5px dashed var(--dashed);
  border-radius: 16px;
  background: transparent;
  color: var(--ink-2);
  font-size: 14px;
  font-weight: 700;
}
</style>
