<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BackHeader from '@/components/BackHeader.vue'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const busy = ref(false)

// Sync status, devices and backups come in phase 8; signing out is needed now.
async function signOut() {
  busy.value = true
  try {
    await auth.signOut()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="page">
    <BackHeader :title="t('settings.accountBackup')" fallback="/settings" />
    <div class="page-body">
      <div class="card account">
        <span class="avatar">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="9" r="3.5" />
            <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
          </svg>
        </span>
        <span class="account-text">
          <span class="account-name">{{ auth.user?.email ?? t('settings.account') }}</span>
          <span class="account-sub">{{ t('auth.signedInWithGoogle') }}</span>
        </span>
      </div>

      <button type="button" class="sign-out" :disabled="busy" @click="signOut">
        {{ t('auth.signOut') }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.page-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: var(--surface);
  border-radius: 20px;
}

.account {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--rose-fill);
  color: var(--rose-text);
}

.account-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.account-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 700;
}

.account-sub {
  font-size: 12px;
  color: var(--muted);
}

.sign-out {
  min-height: 52px;
  border: none;
  border-radius: 20px;
  background: var(--surface);
  color: var(--overdue-fg);
  font-size: 15px;
  font-weight: 700;
}

.sign-out:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
