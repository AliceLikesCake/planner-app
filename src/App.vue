<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import Fab from '@/components/Fab.vue'

const route = useRoute()
const { t } = useI18n()
</script>

<template>
  <RouterView />
  <div v-if="route.meta.tab" class="dock">
    <Fab
      v-if="route.meta.fab"
      class="dock-fab"
      :to="route.meta.fab"
      :label="t(route.meta.fabLabel ?? 'common.add')"
    />
    <BottomNav />
  </div>
</template>

<style scoped>
.dock {
  position: relative;
  flex-shrink: 0;
}

.dock-fab {
  position: absolute;
  right: 20px;
  bottom: calc(100% + 16px);
  z-index: 5;
}
</style>
