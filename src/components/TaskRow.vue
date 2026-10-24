<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CategoryIcon from './CategoryIcon.vue'
import { paletteVars } from '@/styles/palette'
import type { CategoryRow } from '@/types/db'

const props = defineProps<{
  title: string
  time: string
  category: CategoryRow | undefined
  categoryName: string
  done: boolean
  /** Bounce the check mark (the task was just completed). */
  bounce?: boolean
}>()
const emit = defineEmits<{ toggle: []; edit: []; delete: [] }>()
/** Swiped open to show Edit / Delete; the parent keeps only one row open. */
const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const vars = computed(() => paletteVars(props.category?.color))
const aria = computed(() =>
  t(props.done ? 'today.markUndo' : 'today.markDone', { title: props.title }),
)

// ---- swipe left to reveal the actions ----
const ACTIONS_WIDTH = 152
const offset = ref(open.value ? -ACTIONS_WIDTH : 0)
const dragging = ref(false)
let startX = 0
let startY = 0
let base = 0
let tracking = false
let swallowClick = false

watch(open, (isOpen) => {
  if (!dragging.value) offset.value = isOpen ? -ACTIONS_WIDTH : 0
  if (!isOpen) armed.value = false
})

function onPointerDown(e: PointerEvent) {
  // Touch browsers often skip the click after a swipe, so a stale flag is cleared here.
  swallowClick = false
  tracking = true
  startX = e.clientX
  startY = e.clientY
  base = open.value ? -ACTIONS_WIDTH : 0
}

function onPointerMove(e: PointerEvent) {
  if (!tracking) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!dragging.value) {
    // Mostly vertical: leave it to the list's scrolling.
    if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) tracking = false
    else if (Math.abs(dx) > 8) {
      dragging.value = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    return
  }
  offset.value = Math.min(0, Math.max(-ACTIONS_WIDTH - 24, base + dx))
}

function onPointerEnd() {
  tracking = false
  if (!dragging.value) return
  dragging.value = false
  swallowClick = true
  const shouldOpen = offset.value < -ACTIONS_WIDTH / 2
  offset.value = shouldOpen ? -ACTIONS_WIDTH : 0
  open.value = shouldOpen
}

function onClick() {
  if (swallowClick) {
    swallowClick = false
    return
  }
  if (open.value) open.value = false
  else emit('toggle')
}

// Delete takes two taps.
const armed = ref(false)
function onDelete() {
  if (armed.value) emit('delete')
  else armed.value = true
}
</script>

<template>
  <div class="swipe">
    <div class="actions" role="group" :aria-label="t('today.actionsFor', { title })">
      <button type="button" class="action edit" @focus="open = true" @click="emit('edit')">
        {{ t('common.edit') }}
      </button>
      <button
        type="button"
        class="action delete"
        :class="{ armed }"
        @focus="open = true"
        @click="onDelete"
      >
        {{ armed ? t('common.deleteConfirm') : t('common.delete') }}
      </button>
    </div>
    <button
      type="button"
      class="task-row"
      :class="{ done, dragging }"
      :style="{ ...vars, transform: `translateX(${offset}px)` }"
      :aria-pressed="done"
      :aria-label="aria"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
      @click="onClick"
    >
      <span class="icon"><CategoryIcon :name="category?.key" /></span>
      <span class="text">
        <span class="title">{{ title }}</span>
        <span class="meta">
          <span v-if="time" class="time num">{{ time }}</span>
          <span class="chip">{{ categoryName }}</span>
        </span>
      </span>
      <span class="check" :class="{ bounce: done && bounce }">
        <svg
          v-if="done"
          width="14"
          height="14"
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
    </button>
  </div>
</template>

<style scoped>
.swipe {
  position: relative;
  flex-shrink: 0;
  border-radius: 20px;
  overflow: hidden;
}

.actions {
  position: absolute;
  inset: 0 0 0 auto;
  width: 152px;
  display: flex;
  gap: 6px;
  padding-left: 8px;
}

.action {
  flex: 1;
  border: none;
  border-radius: 18px;
  font-size: 14px;
  font-weight: 700;
}

.action.edit {
  background: var(--chip);
  color: var(--ink);
}

.action.delete {
  background: var(--overdue-bg);
  color: var(--overdue-fg);
  font-size: 13px;
}

.action.delete.armed {
  background: var(--overdue-fg);
  color: var(--on-primary);
}

.task-row {
  position: relative;
  width: 100%;
  touch-action: pan-y;
  transition: transform 220ms ease;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 10px 10px;
  border: none;
  border-radius: 20px;
  background: var(--surface);
  color: var(--ink);
  text-align: left;
  user-select: none;
  -webkit-user-select: none;
}

.task-row.dragging {
  transition: none;
}

.icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--c-fill);
  color: var(--c-text);
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.title {
  font-size: 15px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time {
  font-size: 12px;
  color: var(--muted);
}

.chip {
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--c-fill);
  color: var(--c-text);
  font-size: 12px;
  font-weight: 700;
}

.check {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--c-text) 55%, white);
  color: var(--on-primary);
}

.done {
  background: var(--done-row);
}

.done .icon {
  background: var(--done-chip);
  color: var(--faint);
}

.done .title {
  color: var(--faint);
  text-decoration: line-through;
}

.done .chip {
  background: var(--done-chip);
  color: var(--muted);
}

.done .check {
  background: var(--done-dot);
  border: none;
}

.bounce {
  animation: check-bounce 400ms ease-out;
}

@keyframes check-bounce {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}
</style>
