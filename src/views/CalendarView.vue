<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const title = computed(() => {
  const now = new Date()
  const month =
    locale.value === 'en'
      ? new Intl.DateTimeFormat('en', { month: 'long' }).format(now)
      : now.getMonth() + 1
  return t('calendar.title', { year: now.getFullYear(), month })
})
</script>

<template>
  <main class="page">
    <h1 class="page-title">{{ title }}</h1>
    <div class="page-body" />
  </main>
</template>
