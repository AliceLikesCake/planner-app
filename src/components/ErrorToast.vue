<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <p v-if="message" class="toast" role="alert">{{ message }}</p>
</template>

<style scoped>
/* Floats just above the ＋ button. */
.toast {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: calc(var(--nav-height) + 88px);
  margin: 0;
  padding: 12px 16px;
  border-radius: 16px;
  background: var(--overdue-bg);
  color: var(--overdue-fg);
  font-size: 14px;
  text-align: center;
  z-index: 10;
}
</style>
