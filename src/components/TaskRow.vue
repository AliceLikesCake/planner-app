<script setup lang="ts">
import { computed } from 'vue'
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
defineEmits<{ toggle: [] }>()

const { t } = useI18n()
const vars = computed(() => paletteVars(props.category?.color))
const aria = computed(() =>
  t(props.done ? 'today.markUndo' : 'today.markDone', { title: props.title }),
)
</script>

<template>
  <button
    type="button"
    class="task-row"
    :class="{ done }"
    :style="vars"
    :aria-pressed="done"
    :aria-label="aria"
    @click="$emit('toggle')"
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
</template>

<style scoped>
.task-row {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 10px 10px;
  border: none;
  border-radius: 20px;
  background: var(--surface);
  color: var(--ink);
  text-align: left;
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
