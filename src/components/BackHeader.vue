<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const props = defineProps<{ title: string; fallback?: string }>()

const { t } = useI18n()
const router = useRouter()

function back() {
  if (window.history.state?.back) router.back()
  else router.replace(props.fallback ?? '/')
}
</script>

<template>
  <header class="back-header">
    <button type="button" class="icon-btn plain" :aria-label="t('common.back')" @click="back">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
    <h1 class="title">{{ title }}</h1>
  </header>
</template>

<style scoped>
.back-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px 6px;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 400;
}
</style>
