// Sample month for the demo mode (DECISIONS 57), built through the normal stores and sync
// rules so generated events, to-dos and income appear as they would for a real user.
// Dates are relative to today, so the demo always looks like "this month".
import { i18n } from '@/i18n'
import { addDays, fromKey, toKey, type DateKey } from './dates'
import { createEvent, createGig, createRecurring, recordTransaction } from './sync'
import { useCategoriesStore } from '@/stores/categories'
import { useHabitsStore } from '@/stores/habits'
import { useSettingsStore } from '@/stores/settings'
import { useTasksStore } from '@/stores/tasks'
import type { CategoryType, PaletteKey } from '@/types/db'

export async function seedDemo(today: DateKey) {
  const zh = i18n.global.locale.value !== 'en'
  const tr = (zhText: string, enText: string) => (zh ? zhText : enText)
  const day = (n: number) => addDays(today, n)
  const cat = (type: CategoryType, key: string) =>
    useCategoriesStore()
      .ofType(type)
      .find((c) => c.key === key)?.id ?? null
  const at = (date: DateKey, hour: number) => `${date}T${String(hour).padStart(2, '0')}:00:00`

  // ---- to-dos: half of today's done, so the cake is half stacked ----
  const tasks = useTasksStore()
  const todays: [string, string, string, string | null, boolean][] = [
    ['確認電子表單需求', 'Review the e-form spec', 'work', '08:30:00', true],
    ['品牌 A 貼文草稿送審', 'Send Brand A draft for review', 'gig', '12:30:00', true],
    ['背日文單字 30 分鐘', 'Japanese vocab, 30 min', 'study', '20:00:00', true],
    ['洗衣服', 'Do laundry', 'life', '21:00:00', false],
    ['整理接案作品集', 'Update portfolio', 'gig', '22:00:00', false],
  ]
  for (const [i, [z, e, key, time, done]] of todays.entries()) {
    const task = await tasks.add({
      title: tr(z, e),
      date: today,
      time,
      category_id: cat('task', key),
    })
    if (done) await tasks.update(task.id, { done: true, done_at: at(today, 9 + i) })
  }
  await tasks.add({
    title: tr('伸展 15 分鐘', 'Stretch, 15 min'),
    date: day(-14),
    time: '21:30:00',
    repeat: 'day',
    category_id: cat('task', 'health'),
  })
  for (const [n, z, e, key] of [
    [-3, '回覆主管信件', 'Reply to manager', 'work'],
    [-1, '英文課預習', 'Prep English class', 'study'],
    [2, '繳電話費', 'Pay the phone bill', 'life'],
  ] as const) {
    const task = await tasks.add({ title: tr(z, e), date: day(n), category_id: cat('task', key) })
    if (n < 0) await tasks.update(task.id, { done: true, done_at: at(day(n), 18) })
  }

  // ---- events, including a multi-day trip ----
  for (const [start, end, z, e, key, time] of [
    [-9, -9, '部門週會', 'Team meeting', 'work', '09:30:00'],
    [-6, -6, '英文會話課', 'English class', 'study', '18:30:00'],
    [-2, -2, '和朋友聚餐', 'Dinner with friends', 'date', '18:00:00'],
    [0, 0, '牙醫回診', 'Dentist', 'health', '19:00:00'],
    [5, 8, '東京旅行', 'Tokyo trip', 'travel', null],
    [11, 11, '生日聚會', 'Birthday party', 'date', '19:00:00'],
  ] as const) {
    await createEvent({
      title: tr(z, e),
      category_id: cat('event', key),
      start_date: day(start),
      end_date: day(end),
      all_day: !time,
      start_time: time,
    })
  }

  // ---- habits with three weeks of history; two popped today ----
  const habits = useHabitsStore()
  const habitDefs: [string, string, string, string, PaletteKey, (n: number) => boolean][] = [
    ['喝水', 'Water', '2000 ml', '2000 ml', 'blue', (n) => n % 5 !== 4],
    ['運動', 'Workout', '30 分鐘', '30 min', 'rose', (n) => n % 3 === 0],
    ['日文單字', 'Vocab', '20 個', '20 words', 'green', (n) => n < 9 || n % 2 === 0],
    ['早睡', 'Early night', '12 點前', 'Before 12', 'lav', (n) => n % 4 !== 1],
    ['維他命', 'Vitamins', '早餐後', 'After breakfast', 'butter', () => true],
  ]
  for (const [i, [z, e, gz, ge, color, didOn]] of habitDefs.entries()) {
    const habit = await habits.add({ name: tr(z, e), goal: tr(gz, ge), color, sort: i })
    await habits.update(habit.id, { created_at: at(day(-21), 8) })
    for (let n = 1; n <= 21; n++) if (didOn(n)) await habits.setDone(habit.id, day(-n), true)
    if (i === 2 || i === 4) await habits.setDone(habit.id, today, true)
  }

  // ---- gigs: one in progress, one overdue, one paid (rules 1–4 fill in the rest) ----
  await createGig({
    brand: tr('品牌 A', 'Brand A'),
    product_category: 'skin',
    formats: ['ig_post', 'story'],
    amount: 8000,
    contract_signed: true,
    delivered: true,
    deliver_date: day(-1),
    live_date: day(2),
    due_date: day(35),
  })
  await createGig({
    brand: tr('品牌 B', 'Brand B'),
    product_category: 'food',
    formats: ['ig_reels'],
    amount: 12000,
    contract_signed: true,
    labor_signed: true,
    delivered: true,
    is_live: true,
    deliver_date: day(-14),
    live_date: day(-10),
    due_date: day(-4),
  })
  await createGig({
    brand: tr('品牌 C', 'Brand C'),
    product_category: 'home',
    formats: ['threads'],
    amount: 5000,
    contract_signed: true,
    labor_signed: true,
    delivered: true,
    is_live: true,
    live_date: day(-20),
    due_date: day(-6),
    paid_at: day(-6),
  })

  // ---- money: fixed monthly entries plus everyday spending ----
  // Day `d` of the month `offset` months from this one.
  const now = fromKey(today)
  const dayOfMonth = (offset: number, d: number) =>
    toKey(new Date(now.getFullYear(), now.getMonth() + offset, d))
  await createRecurring(
    {
      type: 'income',
      amount: 33500,
      category_id: cat('income', 'salary'),
      note: tr('薪水', 'Salary'),
      frequency: 'month',
      start_date: dayOfMonth(-1, 5),
    },
    today,
  )
  await createRecurring(
    {
      type: 'expense',
      amount: 9800,
      category_id: cat('expense', 'life'),
      note: tr('房租', 'Rent'),
      frequency: 'month',
      start_date: dayOfMonth(-1, 1),
    },
    today,
  )
  await createRecurring(
    {
      type: 'expense',
      amount: 390,
      category_id: cat('expense', 'subscription'),
      note: 'Netflix',
      frequency: 'month',
      start_date: dayOfMonth(0, 15),
    },
    today,
  )
  for (const [n, amount, key, z, e] of [
    [0, 150, 'food', '午餐便當', 'Lunch box'],
    [0, 40, 'transit', '捷運', 'Metro'],
    [-1, 180, 'food', '咖啡廳', 'Café'],
    [-2, 620, 'life', '超市採買', 'Groceries'],
    [-3, 1280, 'shop', '網購保養品', 'Skincare order'],
    [-4, 320, 'fun', '電影', 'Movie'],
    [-5, 95, 'food', '早餐', 'Breakfast'],
    [-7, 450, 'medical', '看診', 'Clinic'],
  ] as const) {
    await recordTransaction({
      type: 'expense',
      amount,
      category_id: cat('expense', key),
      note: tr(z, e),
      date: day(n),
    })
  }

  await useSettingsStore().update({ savings_amount: 120000, savings_date: dayOfMonth(0, 1) })
}
