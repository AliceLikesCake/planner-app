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
  <div v-if="auth.demo" class="demo-bar" role="status">
    <span>{{ t('demo.banner') }}</span>
    <button type="button" class="demo-leave" @click="auth.leaveDemo()">
      {{ t('demo.leave') }}
    </button>
  </div>

  <LoginView v-if="auth.status === 'signedOut' || (!isSupabaseConfigured && !auth.demo)" />

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
/* Demo mode notice, above every page (DECISIONS 57). */
.demo-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: calc(env(safe-area-inset-top) + 4px) 12px 4px 16px;
  background: var(--butter-fill);
  color: var(--butter-text);
  font-size: 12px;
  font-weight: 700;
}

.demo-leave {
  min-height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  position: relative;
}

.demo-leave::after {
  content: '';
  position: absolute;
  inset: -6px 0;
}

/* The bar already clears the status bar. */
.demo-bar ~ :deep(.page) {
  padding-top: 12px;
}

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
