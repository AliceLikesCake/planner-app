<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BackHeader from '@/components/BackHeader.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { useSettingsStore } from '@/stores/settings'
import type { Locale } from '@/i18n'

const { t } = useI18n()
const settings = useSettingsStore()

const lang = computed<Locale>({
  get: () => settings.lang,
  set: (value) => settings.setLang(value),
})

const langOptions = computed(() => [
  { value: 'zh-TW' as const, label: t('settings.langZh') },
  { value: 'en' as const, label: t('settings.langEn') },
])

// Remaining rows (toggles, values) arrive with their features; phase 8 fills this page out.
const sections = [
  {
    title: 'settings.todayCake',
    links: [
      { label: 'settings.categories', to: '/settings/categories' },
      { label: 'settings.cakes', to: '/settings/cakes' },
    ],
  },
  {
    title: 'settings.money',
    links: [
      { label: 'settings.budget', to: '/settings/budget' },
      { label: 'settings.export', to: '/settings/export' },
    ],
  },
  {
    title: 'settings.data',
    links: [{ label: 'settings.backup', to: '/settings/backup' }],
  },
]
</script>

<template>
  <main class="page">
    <BackHeader :title="t('settings.title')" fallback="/" />
    <div class="page-body">
      <RouterLink to="/settings/backup" class="account card">
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
          <span class="account-name">{{ t('settings.account') }}</span>
        </span>
        <svg class="chevron" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </RouterLink>

      <section class="section">
        <h2 class="section-title">{{ t('settings.general') }}</h2>
        <div class="card rows">
          <div class="row">
            <span class="row-label">{{ t('settings.language') }}</span>
            <SegmentedControl
              v-model="lang"
              :options="langOptions"
              :label="t('settings.language')"
            />
          </div>
        </div>
      </section>

      <section v-for="sec in sections" :key="sec.title" class="section">
        <h2 class="section-title">{{ t(sec.title) }}</h2>
        <div class="card rows">
          <RouterLink v-for="link in sec.links" :key="link.to" :to="link.to" class="row">
            <span class="row-label">{{ t(link.label) }}</span>
            <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.page-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card {
  background: var(--surface);
  border-radius: 20px;
}

.account {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 8px;
  text-decoration: none;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--rose-fill);
  color: var(--rose-text);
}

.account-text {
  flex: 1;
  min-width: 0;
}

.account-name {
  font-size: 16px;
  font-weight: 700;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.section-title {
  margin: 0;
  padding: 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}

.rows {
  padding: 0 16px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 6px 0;
  text-decoration: none;
}

.row + .row {
  border-top: 1px solid var(--divider);
}

.row-label {
  flex: 1;
  min-width: 0;
  font-size: 15px;
}

.chevron {
  flex-shrink: 0;
  fill: none;
  stroke: var(--done-dot);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
