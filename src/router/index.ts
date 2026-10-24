import { createRouter, createWebHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Main tab pages show the bottom nav. */
    tab?: boolean
    /** Where the page's ＋ button goes. */
    fab?: string
    /** i18n key for the ＋ button's label. */
    fabLabel?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'today',
      component: () => import('@/views/TodayView.vue'),
      meta: { tab: true, fab: '/add/task', fabLabel: 'today.addTask' },
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@/views/CalendarView.vue'),
      meta: { tab: true, fab: '/add/event', fabLabel: 'calendar.addEvent' },
    },
    {
      path: '/habits',
      name: 'habits',
      component: () => import('@/views/HabitsView.vue'),
      meta: { tab: true, fab: '/add/habit', fabLabel: 'habits.addHabit' },
    },
    {
      path: '/gigs',
      name: 'gigs',
      component: () => import('@/views/GigsView.vue'),
      meta: { tab: true, fab: '/add/gig', fabLabel: 'gigs.addGig' },
    },
    {
      path: '/money',
      name: 'money',
      component: () => import('@/views/MoneyView.vue'),
      meta: { tab: true, fab: '/add/money', fabLabel: 'money.addEntry' },
    },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },

    { path: '/add/task', name: 'add-task', component: () => import('@/views/add/AddTask.vue') },
    { path: '/add/event', name: 'add-event', component: () => import('@/views/add/AddEvent.vue') },
    { path: '/add/habit', name: 'add-habit', component: () => import('@/views/add/AddHabit.vue') },
    { path: '/add/gig', name: 'add-gig', component: () => import('@/views/add/AddGig.vue') },
    { path: '/add/money', name: 'add-money', component: () => import('@/views/add/AddMoney.vue') },
    {
      path: '/edit/task/:id',
      name: 'edit-task',
      component: () => import('@/views/add/AddTask.vue'),
      props: true,
    },
    {
      path: '/edit/habit/:id',
      name: 'edit-habit',
      component: () => import('@/views/add/AddHabit.vue'),
      props: true,
    },
    {
      path: '/edit/event/:id',
      name: 'edit-event',
      component: () => import('@/views/add/AddEvent.vue'),
      props: true,
    },

    {
      path: '/settings/categories',
      name: 'settings-categories',
      component: () => import('@/views/settings/Categories.vue'),
    },
    {
      path: '/settings/cakes',
      name: 'settings-cakes',
      component: () => import('@/views/settings/Cakes.vue'),
    },
    {
      path: '/settings/budget',
      name: 'settings-budget',
      component: () => import('@/views/settings/Budget.vue'),
    },
    {
      path: '/settings/export',
      name: 'settings-export',
      component: () => import('@/views/settings/Export.vue'),
    },
    {
      path: '/settings/backup',
      name: 'settings-backup',
      component: () => import('@/views/settings/Backup.vue'),
    },

    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
