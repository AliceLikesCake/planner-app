<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BackHeader from '@/components/BackHeader.vue'

const { t } = useI18n()
</script>

<template>
  <main class="page">
    <BackHeader :title="t('settings.cakes')" fallback="/settings" />
    <div class="page-body" />
  </main>
</template>
