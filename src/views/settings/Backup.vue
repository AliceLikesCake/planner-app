<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BackHeader from '@/components/BackHeader.vue'
import { downloadBackup } from '@/services/backup'
import { useAuthStore } from '@/stores/auth'

const { t, locale } = useI18n()
const auth = useAuthStore()

const syncing = ref(false)
const syncFailed = ref(false)
const downloaded = ref(false)
const signingOut = ref(false)

const lastSync = computed(() =>
  auth.lastSyncedAt
    ? new Intl.DateTimeFormat(locale.value, {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(auth.lastSyncedAt)
    : '',
)

async function syncNow() {
  if (syncing.value) return
  syncing.value = true
  syncFailed.value = false
  try {
    await auth.syncNow()
  } catch (error) {
    console.error(error)
    syncFailed.value = true
  } finally {
    syncing.value = false
  }
}

function download() {
  downloadBackup()
  downloaded.value = true
}

async function signOut() {
  signingOut.value = true
  try {
    await auth.signOut()
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <main class="page">
    <BackHeader :title="t('settings.accountBackup')" fallback="/settings" />
    <div class="page-body list">
      <section class="card account">
        <div class="who">
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
          <span class="text">
            <span class="name ellipsis">{{ auth.user?.email ?? t('settings.account') }}</span>
            <span class="sub">{{ t('auth.signedInWithGoogle') }}</span>
          </span>
        </div>

        <div class="status" :class="{ busy: syncing, failed: syncFailed }" role="status">
          <span class="status-icon">
            <svg
              v-if="syncing"
              class="spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 4a8 8 0 1 1-8 8" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="syncFailed ? 'M12 7v6M12 17h.01' : 'M5 12l5 5 9-10'" />
            </svg>
          </span>
          <span class="text">
            <span class="status-title">{{
              syncing
                ? t('backup.syncing')
                : syncFailed
                  ? t('backup.syncFailed')
                  : t('backup.synced')
            }}</span>
            <span v-if="lastSync && !syncFailed" class="status-sub">{{
              t('backup.lastSync', { time: lastSync })
            }}</span>
          </span>
          <button type="button" class="sync-btn" :disabled="syncing" @click="syncNow">
            {{ t('backup.syncNow') }}
          </button>
        </div>
        <p class="sub note">{{ t('backup.liveNote') }}</p>
      </section>

      <button type="button" class="card action" @click="download">
        <span class="text">
          <span class="name">{{ t('backup.download') }}</span>
          <span class="sub">{{
            downloaded ? t('backup.downloaded') : t('backup.downloadSub')
          }}</span>
        </span>
        <svg class="icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
        </svg>
      </button>

      <button type="button" class="sign-out" :disabled="signingOut" @click="signOut">
        {{ t('auth.signOut') }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  border-radius: 20px;
  background: var(--surface);
}

.account {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.who {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--rose-fill);
  color: var(--rose-text);
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 16px;
  font-weight: 700;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.note {
  line-height: 1.6;
}

.status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 10px 12px;
  border-radius: 16px;
  background: var(--paid-bg);
  color: var(--paid-fg);
}

.status.busy {
  background: var(--pending-bg);
  color: var(--pending-fg);
}

.status.failed {
  background: var(--overdue-bg);
  color: var(--overdue-fg);
}

.status-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--paid-dot);
}

.busy .status-icon {
  background: var(--pending-dot);
}

.failed .status-icon {
  background: var(--overdue-dot);
}

.status-icon svg {
  fill: none;
  stroke: var(--on-primary);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.spin {
  animation: spin 900ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.status-title {
  font-size: 14px;
  font-weight: 700;
}

.status-sub {
  font-size: 12px;
}

.sync-btn {
  min-height: var(--tap);
  flex-shrink: 0;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 700;
}

.sync-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.action {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 16px;
  border: none;
  color: var(--ink);
  text-align: left;
}

.action .name {
  font-size: 15px;
  font-weight: 500;
}

.icon {
  flex-shrink: 0;
  fill: none;
  stroke: var(--muted);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
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
