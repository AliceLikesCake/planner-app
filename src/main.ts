import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { useSettingsStore } from './stores/settings'

import './styles/tokens.css'
import './styles/base.css'
import './styles/form.css'

const app = createApp(App)

app.use(createPinia())
app.use(i18n)
app.use(router)

// Applies the saved language (and <html lang>) before the first render.
useSettingsStore()

app.mount('#app')

// Service worker for offline use; a new version activates on the next launch.
registerSW({ immediate: true })
