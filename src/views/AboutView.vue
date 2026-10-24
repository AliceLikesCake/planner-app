<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import BackHeader from '@/components/BackHeader.vue'
import { useAuthStore } from '@/stores/auth'

const i18n = useI18n()
// The About page is for CV readers, so it is always in English (DECISIONS 59).
const t = (key: string) => i18n.t(key, {}, { locale: 'en' })
const router = useRouter()
const auth = useAuthStore()

// A public page about the project, for people arriving from a CV (DECISIONS 58).
const GITHUB_URL = 'https://github.com/AliceLikesCake/planner-app'
const SCREENS = ['today', 'calendar', 'habits', 'gigs', 'money'] as const
const NAV_LABEL = {
  today: 'nav.today',
  calendar: 'nav.calendar',
  habits: 'nav.habits',
  gigs: 'nav.gigs',
  money: 'nav.money',
} as const
const FEATURES = [
  ['🍰', 'f1'],
  ['🫧', 'f2'],
  ['📋', 'f3'],
  ['💰', 'f4'],
  ['📱', 'f5'],
  ['🌏', 'f6'],
] as const
const SYNC = ['s1', 's2', 's3', 's4', 's5'] as const
const HOW = ['h1', 'h2', 'h3'] as const
const TECH = [
  'Vue 3',
  'TypeScript',
  'Pinia',
  'vue-i18n',
  'Supabase',
  'PostgreSQL + RLS',
  'PWA',
  'Vitest',
  'Vercel',
]

async function tryDemo() {
  await router.push('/')
  if (auth.status === 'signedOut') await auth.startDemo()
}
</script>

<template>
  <main class="page" lang="en">
    <BackHeader :title="t('about.title')" fallback="/" />
    <div class="page-body about">
      <section class="hero">
        <img class="icon" src="/icons/icon.svg" alt="" width="88" height="88" />
        <h2 class="name">{{ t('common.appName') }}</h2>
        <p class="intro">{{ t('about.intro') }}</p>
        <div class="actions">
          <button v-if="auth.status === 'signedOut'" type="button" class="primary" @click="tryDemo">
            {{ t('about.tryDemo') }}
          </button>
          <a class="secondary" :href="GITHUB_URL" target="_blank" rel="noopener">
            {{ t('about.github') }} ↗
          </a>
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">{{ t('about.screens') }}</h3>
        <div class="shots">
          <figure v-for="s in SCREENS" :key="s" class="shot">
            <img
              :src="`/screenshots/${s}.png`"
              :alt="t(NAV_LABEL[s])"
              loading="lazy"
              width="195"
              height="422"
            />
            <figcaption>{{ t(NAV_LABEL[s]) }}</figcaption>
          </figure>
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">{{ t('about.featuresTitle') }}</h3>
        <div class="features">
          <div v-for="[emoji, key] in FEATURES" :key="key" class="card feature">
            <span class="emoji" aria-hidden="true">{{ emoji }}</span>
            <span class="text">
              <span class="feature-title">{{ t(`about.${key}t`) }}</span>
              <span class="sub">{{ t(`about.${key}`) }}</span>
            </span>
          </div>
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">{{ t('about.syncTitle') }}</h3>
        <div class="card list">
          <p class="sub">{{ t('about.syncIntro') }}</p>
          <ul>
            <li v-for="key in SYNC" :key="key">{{ t(`about.${key}`) }}</li>
          </ul>
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">{{ t('about.howTitle') }}</h3>
        <div class="card list">
          <ul>
            <li v-for="key in HOW" :key="key">{{ t(`about.${key}`) }}</li>
          </ul>
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">{{ t('about.techTitle') }}</h3>
        <div class="tech">
          <span v-for="name in TECH" :key="name" class="tag">{{ name }}</span>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.about {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 40px;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 0;
  text-align: center;
}

.icon {
  border-radius: 20px;
}

.name {
  margin: 4px 0 0;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 400;
}

.intro {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--ink-2);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.primary,
.secondary {
  min-height: var(--tap);
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-pill);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.primary {
  border: none;
  background: var(--primary);
  color: var(--on-primary);
}

.secondary {
  background: var(--chip);
  color: var(--ink);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  margin: 0;
  padding: 0 4px;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 400;
}

.shots {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.shots::-webkit-scrollbar {
  display: none;
}

.shot {
  flex-shrink: 0;
  margin: 0;
  scroll-snap-align: start;
  text-align: center;
}

.shot img {
  display: block;
  width: 195px;
  height: auto;
  border: 1px solid var(--divider);
  border-radius: 18px;
}

.shot figcaption {
  padding-top: 6px;
  font-size: 12px;
  color: var(--muted);
}

.card {
  border-radius: 20px;
  background: var(--surface);
}

.features {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
}

.emoji {
  font-size: 22px;
  line-height: 1.2;
}

.text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feature-title {
  font-size: 15px;
  font-weight: 700;
}

.sub {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--muted);
}

.list {
  padding: 14px 16px;
}

.list ul {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  line-height: 1.6;
}

.list .sub + ul {
  margin-top: 10px;
}

.tech {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  font-size: 13px;
  color: var(--ink-2);
}
</style>
