<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { isSupabaseConfigured } from '@/services/supabase'

const { t } = useI18n()
const auth = useAuthStore()
const busy = ref(false)
const failed = ref(false)

async function signIn() {
  busy.value = true
  failed.value = false
  try {
    // On success the browser leaves for Google, so `busy` stays on.
    await auth.signInWithGoogle()
  } catch (error) {
    console.error(error)
    failed.value = true
    busy.value = false
  }
}
</script>

<template>
  <main class="login">
    <div class="brand">
      <img class="app-icon" src="/icons/icon.svg" alt="" width="112" height="112" />
      <h1 class="app-name">{{ t('common.appName') }}</h1>
      <p class="tagline">{{ t('auth.tagline') }}</p>
    </div>

    <div class="actions">
      <p v-if="!isSupabaseConfigured" class="notice">{{ t('auth.notConfigured') }}</p>
      <template v-else>
        <button type="button" class="google-btn" :disabled="busy" @click="signIn">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.1L6.4 14zM12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z"
            />
          </svg>
          {{ t('auth.google') }}
        </button>
        <p v-if="failed" class="error" role="alert">{{ t('auth.signInError') }}</p>
      </template>

      <button type="button" class="demo-btn" @click="auth.startDemo()">
        <span class="demo-title">{{ t('demo.try') }}</span>
        <span class="demo-sub">{{ t('demo.trySub') }}</span>
      </button>
      <RouterLink to="/about" class="about-link">{{ t('about.link') }} →</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.login {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 40px;
  padding: calc(env(safe-area-inset-top) + 24px) 32px calc(env(safe-area-inset-bottom) + 48px);
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* Same corner shape as the home-screen icon (iOS rounds icons at about 22%). */
.app-icon {
  display: block;
  width: 112px;
  height: 112px;
  margin-bottom: 20px;
  border-radius: 25px;
}

.app-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 400;
}

.tagline {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.about-link {
  min-height: var(--tap);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
}

.demo-btn {
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 16px;
  border: 1.5px solid var(--dashed);
  border-radius: 20px;
  background: var(--surface);
  color: var(--ink);
}

.demo-title {
  font-size: 15px;
  font-weight: 700;
}

.demo-sub {
  font-size: 12px;
  color: var(--muted);
}

.google-btn {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: var(--on-primary);
  font-size: 16px;
  font-weight: 700;
}

.google-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.notice,
.error {
  margin: 0;
  padding: 14px 16px;
  border-radius: var(--radius-card);
  font-size: 14px;
  line-height: 1.6;
}

.notice {
  background: var(--surface);
  color: var(--ink-2);
}

.error {
  background: var(--overdue-bg);
  color: var(--overdue-fg);
}
</style>
