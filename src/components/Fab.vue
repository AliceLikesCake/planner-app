<script setup lang="ts">
defineProps<{ to: string; label: string }>()
</script>

<template>
  <RouterLink :to="to" class="fab" :aria-label="label">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  </RouterLink>
</template>

<style scoped>
/* Positioned by its parent: 16px above the bottom nav, 20px from the right. */
.fab {
  width: var(--fab-size);
  height: var(--fab-size);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: var(--on-primary);
}
</style>
