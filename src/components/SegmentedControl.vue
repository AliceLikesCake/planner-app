<script setup lang="ts" generic="T extends string">
defineProps<{
  options: { value: T; label: string }[]
  label?: string
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="segmented" role="group" :aria-label="label">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="seg"
      :class="{ on: model === opt.value }"
      :aria-pressed="model === opt.value"
      @click="model = opt.value"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  flex-shrink: 0;
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 14px;
  background: var(--chip);
}

.seg {
  min-height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 11px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  position: relative;
}

/* The pill row is 38px tall; extend the hit area to 44px without changing the look. */
.seg::after {
  content: '';
  position: absolute;
  inset: -6px 0;
}

.seg.on {
  background: var(--surface);
  color: var(--ink);
  font-weight: 700;
}
</style>
