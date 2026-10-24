<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{ label: string; hint?: string; busy?: boolean }>()
const emit = defineEmits<{ confirm: [] }>()

const { t } = useI18n()
const armed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

// First tap arms the button, a second tap within a few seconds deletes.
function press() {
  if (armed.value) {
    clearTimeout(timer)
    armed.value = false
    emit('confirm')
    return
  }
  armed.value = true
  timer = setTimeout(() => (armed.value = false), 4000)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="delete">
    <button type="button" class="delete-btn" :class="{ armed }" :disabled="busy" @click="press">
      {{ armed ? t('common.deleteConfirm') : label }}
    </button>
    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.delete {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.delete-btn {
  min-height: 52px;
  border: none;
  border-radius: 20px;
  background: var(--surface);
  color: var(--overdue-fg);
  font-size: 15px;
  font-weight: 700;
}

.delete-btn.armed {
  background: var(--overdue-bg);
}

.delete-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.hint {
  margin: 0;
  padding: 0 6px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}
</style>
