<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import Fab from '@/components/Fab.vue'
import LoginView from '@/views/LoginView.vue'
import { useAuthStore } from '@/stores/auth'
import { isSupabaseConfigured } from '@/services/supabase'

const route = useRoute()
const { t } = useI18n()
const auth = useAuthStore()

auth.init()
</script>

<template>
  <LoginView v-if="!isSupabaseConfigured || auth.status === 'signedOut'" />

  <div v-else-if="auth.status === 'loading'" class="status">
    <p>{{ t('auth.loading') }}</p>
  </div>

  <div v-else-if="auth.status === 'error'" class="status">
    <p role="alert">{{ t('auth.loadError') }}</p>
    <button type="button" class="retry" @click="auth.retry()">{{ t('auth.retry') }}</button>
  </div>

  <template v-else>
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

.status {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
  color: var(--muted);
  font-size: 15px;
  text-align: center;
}

.status p {
  margin: 0;
}

.retry {
  min-height: var(--tap);
  padding: 0 24px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: var(--on-primary);
  font-size: 15px;
  font-weight: 700;
}
</style>
