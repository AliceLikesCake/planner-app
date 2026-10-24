<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ lines: string[] }>()
const { t } = useI18n()
</script>

<template>
  <div class="sync" aria-live="polite">
    <div class="sync-title">{{ t('common.syncTo') }}</div>
    <div v-for="line in lines" :key="line" class="sync-line">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12l5 5 9-10" />
      </svg>
      <span>{{ line }}</span>
    </div>
  </div>
</template>

<style scoped>
.sync {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--chip);
  color: var(--ink-2);
}

.sync-title {
  font-size: 12px;
  font-weight: 700;
}

.sync-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.sync-line svg {
  flex-shrink: 0;
  margin-top: 3px;
}
</style>
