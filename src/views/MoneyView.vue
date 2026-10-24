<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <main class="page">
    <h1 class="page-title">{{ t('money.title') }}</h1>
    <div class="page-body" />
  </main>
</template>
