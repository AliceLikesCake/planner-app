<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{ key: [key: string] }>()
const { t } = useI18n()

// 1–9, 00, 0, ⌫ (SPEC 4.6)
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del']
</script>

<template>
  <div class="pad">
    <button
      v-for="k in KEYS"
      :key="k"
      type="button"
      class="key num"
      :aria-label="k === 'del' ? t('addMoney.keyDelete') : k"
      @click="emit('key', k)"
    >
      {{ k === 'del' ? '⌫' : k }}
    </button>
  </div>
</template>

<style scoped>
.pad {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 10px 12px max(24px, env(safe-area-inset-bottom));
  border-radius: 24px 24px 0 0;
  background: var(--surface);
}

.key {
  height: 48px;
  border: none;
  border-radius: 14px;
  background: var(--surface-muted);
  color: var(--ink);
  font-size: 20px;
  font-weight: 700;
}

.key:active {
  background: var(--chip);
}
</style>
