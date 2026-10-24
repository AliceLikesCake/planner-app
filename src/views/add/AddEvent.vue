<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AddHeader from '@/components/AddHeader.vue'

const { t } = useI18n()
</script>

<template>
  <main class="page">
    <AddHeader :title="t('calendar.addEvent')" />
    <div class="page-body" />
  </main>
</template>
