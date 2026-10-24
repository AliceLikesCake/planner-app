<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { playSoundOn } from '@/services/sound'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits<{ error: [] }>()

const { t } = useI18n()
const settings = useSettingsStore()
const on = computed(() => settings.row?.sound ?? true)

async function toggle() {
  const next = !on.value
  if (next) playSoundOn()
  try {
    await settings.update({ sound: next })
  } catch {
    emit('error')
  }
}
</script>

<template>
  <button
    type="button"
    class="icon-btn sound"
    :class="{ off: !on }"
    :aria-pressed="on"
    :aria-label="t(on ? 'common.soundOn' : 'common.soundOff')"
    @click="toggle"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      <path v-if="on" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
      <path v-else d="M16 10l5 5M21 10l-5 5" />
    </svg>
  </button>
</template>

<style scoped>
.sound.off {
  background: var(--surface);
  color: var(--muted);
  border: 1px solid var(--chip);
}
</style>
