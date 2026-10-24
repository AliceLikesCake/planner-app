<script setup lang="ts">
defineProps<{ label: string; disabled?: boolean }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <button
    type="button"
    role="switch"
    class="toggle"
    :class="{ on: model }"
    :aria-checked="model"
    :aria-label="label"
    :disabled="disabled"
    @click="model = !model"
  >
    <span class="track"><span class="knob" /></span>
  </button>
</template>

<style scoped>
/* A 52 × 32 switch inside a 44px-tall hit area. */
.toggle {
  flex-shrink: 0;
  width: 52px;
  height: var(--tap);
  padding: 0;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
}

.track {
  width: 52px;
  height: 32px;
  padding: 3px;
  border-radius: 16px;
  background: var(--switch-off);
  transition: background 160ms ease;
}

.knob {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--surface);
  transition: transform 160ms ease;
}

.on .track {
  background: var(--switch-on);
}

.on .knob {
  transform: translateX(20px);
}

.toggle:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
