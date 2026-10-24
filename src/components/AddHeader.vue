<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

defineProps<{ title: string; canSave?: boolean }>()
const emit = defineEmits<{ save: [] }>()

const { t } = useI18n()
const router = useRouter()

function cancel() {
  if (window.history.state?.back) router.back()
  else router.replace('/')
}
</script>

<template>
  <header class="add-header">
    <button type="button" class="text-btn" @click="cancel">{{ t('common.cancel') }}</button>
    <h1 class="title">{{ title }}</h1>
    <button type="button" class="save-btn" :disabled="!canSave" @click="emit('save')">
      {{ t('common.save') }}
    </button>
  </header>
</template>

<style scoped>
.add-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 12px 8px;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 400;
}

.text-btn {
  justify-self: start;
  min-height: var(--tap);
  padding: 0 8px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 15px;
}

.save-btn {
  justify-self: end;
  min-height: var(--tap);
  padding: 0 20px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: var(--on-primary);
  font-size: 15px;
  font-weight: 700;
}

.save-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
