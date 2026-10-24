<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Icon paths from design/mockups/Main.dc.html.
const tabs = [
  {
    to: '/',
    label: 'nav.today',
    icon: '<path d="M4 20h16M5 20v-6h14v6M7 14v-4h10v4M12 10V7"/><path d="M12 4.5c.8.6.8 1.6 0 2"/>',
  },
  {
    to: '/calendar',
    label: 'nav.calendar',
    icon: '<rect x="3.5" y="5" width="17" height="15" rx="4"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  },
  {
    to: '/habits',
    label: 'nav.habits',
    icon: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  },
  {
    to: '/gigs',
    label: 'nav.gigs',
    icon: '<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.5"/>',
  },
  {
    to: '/money',
    label: 'nav.money',
    icon: '<rect x="3" y="6" width="18" height="13" rx="4"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  },
]
</script>

<template>
  <nav class="bottom-nav" :aria-label="t('nav.label')">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="tab"
      exact-active-class="active"
    >
      <span class="pill">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          v-html="tab.icon"
        />
      </span>
      <span>{{ t(tab.label) }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  flex-shrink: 0;
  min-height: var(--nav-height);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  padding: 8px 6px max(14px, env(safe-area-inset-bottom));
  background: var(--surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.tab {
  min-height: var(--tap);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
}

.pill {
  width: 52px;
  height: 32px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab.active {
  color: var(--ink);
  font-weight: 700;
}

.tab.active .pill {
  background: var(--chip);
}
</style>
