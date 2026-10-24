import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fakeDb } from './fakeSupabase'
import { loadUserData } from '../services/session'
import { addDays, todayKey } from '../services/dates'
import {
  createGig,
  deleteGig,
  gigIncome,
  recordTransaction,
  syncGig,
  updateGig,
  updateTransaction,
} from '../services/sync'
import { useCategoriesStore } from '../stores/categories'
import { useEventsStore } from '../stores/events'
import { useGigsStore } from '../stores/gigs'
import { useMoneyStore } from '../stores/money'
import { useSettingsStore } from '../stores/settings'
import { useTasksStore } from '../stores/tasks'

vi.mock('@/services/supabase', () => import('./fakeSupabase'))

beforeEach(async () => {
  localStorage.clear()
  fakeDb.reset('user-1')
  setActivePinia(createPinia())
  await loadUserData('user-1')
  await useSettingsStore().setLang('zh-TW')
})

const gigEvents = (id: string) => useEventsStore().items.filter((e) => e.gig_id === id)
const gigTasks = (id: string) =>
  useTasksStore().items.filter((t) => t.gig_id === id && t.source === 'gig')
const task = (id: string, kind: string) => gigTasks(id).find((t) => t.gig_kind === kind)
const catKey = (id: string | null) => useCategoriesStore().byId(id)?.key

const full = {
  brand: '品牌 A',
  product_category: 'beauty' as const,
  amount: 8000,
  deliver_date: '2026-10-30',
  live_date: '2026-11-05',
  due_date: '2026-12-15',
}

describe('rule 1: gig dates → calendar', () => {
  it('creates one all-day event per date, in the 接案 event category', async () => {
    const gig = await createGig(full)
    const events = gigEvents(gig.id)
    expect(events.map((e) => [e.gig_kind, e.start_date, e.title])).toEqual([
      ['deliver', '2026-10-30', '品牌 A 交稿'],
      ['live', '2026-11-05', '品牌 A 上線'],
      ['due', '2026-12-15', '品牌 A 入帳'],
    ])
    expect(events.every((e) => e.source === 'gig' && catKey(e.category_id) === 'gig')).toBe(true)
  })

  it('is idempotent, follows date changes and removes cleared dates', async () => {
    const gig = await createGig(full)
    await syncGig(gig)
    expect(gigEvents(gig.id)).toHaveLength(3)

    await updateGig(gig.id, { deliver_date: '2026-10-31', live_date: null })
    expect(gigEvents(gig.id).map((e) => [e.gig_kind, e.start_date])).toEqual([
      ['deliver', '2026-10-31'],
      ['due', '2026-12-15'],
    ])
  })

  it('respects the per-gig switch and the setting', async () => {
    const a = await createGig({ ...full, sync_calendar: false })
    expect(gigEvents(a.id)).toHaveLength(0)

    await useSettingsStore().update({ auto_sync_calendar: false })
    const b = await createGig(full)
    expect(gigEvents(b.id)).toHaveLength(0)
  })
})

describe('rules 2 and 3: gig → to-dos', () => {
  it('adds 準備交稿 the day before delivery and 確認上線 on the live day', async () => {
    const gig = await createGig(full)
    expect(task(gig.id, 'prep_deliver')).toMatchObject({
      date: '2026-10-29',
      title: '準備 品牌 A 交稿',
    })
    expect(task(gig.id, 'check_live')).toMatchObject({
      date: '2026-11-05',
      title: '確認 品牌 A 貼文上線',
    })
    expect(catKey(task(gig.id, 'prep_deliver')!.category_id)).toBe('gig')
  })

  it('ticks those to-dos when 交稿 / 上線 are ticked on the card', async () => {
    const gig = await createGig(full)
    await updateGig(gig.id, { delivered: true })
    expect(task(gig.id, 'prep_deliver')!.done).toBe(true)
    expect(task(gig.id, 'check_live')!.done).toBe(false)
  })

  it('one sign-docs to-do tomorrow that follows what is still unsigned', async () => {
    const gig = await createGig(full)
    const sign = () => task(gig.id, 'sign_docs')!
    expect(sign()).toMatchObject({
      title: '簽 品牌 A 合約、勞報單',
      date: addDays(todayKey(), 1),
      done: false,
    })

    await updateGig(gig.id, { contract_signed: true })
    expect(sign()).toMatchObject({ title: '簽 品牌 A 勞報單', done: false })

    await updateGig(gig.id, { labor_signed: true })
    expect(sign().done).toBe(true)

    await updateGig(gig.id, { labor_signed: false })
    expect(sign().done).toBe(false)
    expect(gigTasks(gig.id).filter((t) => t.gig_kind === 'sign_docs')).toHaveLength(1)
  })

  it('no sign-docs to-do when both are signed from the start', async () => {
    const gig = await createGig({ ...full, contract_signed: true, labor_signed: true })
    expect(task(gig.id, 'sign_docs')).toBeUndefined()
  })

  it('switches off per gig', async () => {
    const gig = await createGig({ ...full, sync_todo: false, sync_docs: false })
    expect(gigTasks(gig.id)).toHaveLength(0)
  })
})

describe('rule 4: gig paid → money', () => {
  it('records the income when paid and removes it when unpaid again', async () => {
    const gig = await createGig(full)
    expect(gigIncome(gig.id)).toBeUndefined()

    await updateGig(gig.id, { paid_at: '2026-10-24' })
    const income = gigIncome(gig.id)!
    expect(income).toMatchObject({
      type: 'income',
      amount: 8000,
      date: '2026-10-24',
      gig_id: gig.id,
    })
    expect(catKey(income.category_id)).toBe('gig')

    await syncGig(useGigsStore().items[0]!)
    expect(useMoneyStore().items).toHaveLength(1)

    await updateGig(gig.id, { paid_at: null })
    expect(useMoneyStore().items).toHaveLength(0)
  })

  it('follows the gig amount unless the entry was edited by hand', async () => {
    const gig = await createGig({ ...full, paid_at: '2026-10-24' })
    await updateGig(gig.id, { amount: 9000 })
    expect(gigIncome(gig.id)!.amount).toBe(9000)

    await useMoneyStore().update(gigIncome(gig.id)!.id, { amount: 8500 })
    await updateGig(gig.id, { amount: 10000 })
    expect(gigIncome(gig.id)!.amount).toBe(8500)
  })

  it('respects the per-gig switch and the setting', async () => {
    await createGig({ ...full, paid_at: '2026-10-24', sync_money: false })
    await useSettingsStore().update({ auto_sync_money: false })
    await createGig({ ...full, paid_at: '2026-10-24' })
    expect(useMoneyStore().items).toHaveLength(0)
  })
})

describe('rule 5: money → gig', () => {
  it('an income filed under a gig marks it paid on that date, without a second entry', async () => {
    const gig = await createGig(full)
    await recordTransaction({
      type: 'income',
      amount: 7800,
      date: '2026-10-20',
      gig_id: gig.id,
      category_id: useCategoriesStore()
        .ofType('income')
        .find((c) => c.key === 'gig')!.id,
    })
    expect(useGigsStore().items[0]!.paid_at).toBe('2026-10-20')
    expect(useMoneyStore().items).toHaveLength(1)
    expect(gigIncome(gig.id)!.amount).toBe(7800)
  })
})

describe('deleting a gig', () => {
  it('removes generated events and to-dos, keeps linked manual to-dos and asks about income', async () => {
    const gig = await createGig({ ...full, paid_at: '2026-10-24' })
    const manual = await useTasksStore().add({
      title: 'Reply to Brand A',
      date: '2026-10-25',
      gig_id: gig.id,
    })

    await deleteGig(gig.id, { deleteIncome: false })
    expect(useGigsStore().items).toHaveLength(0)
    expect(gigEvents(gig.id)).toHaveLength(0)
    expect(useTasksStore().items.map((t) => [t.id, t.gig_id])).toEqual([[manual.id, null]])
    expect(useMoneyStore().items.map((tx) => tx.gig_id)).toEqual([null])
  })

  it('can delete the income too', async () => {
    const gig = await createGig({ ...full, paid_at: '2026-10-24' })
    await deleteGig(gig.id, { deleteIncome: true })
    expect(useMoneyStore().items).toHaveLength(0)
  })
})

describe('rule 5 on edit', () => {
  it('editing an entry to point at a gig marks that gig paid; expenses never do', async () => {
    const gig = await createGig(full)
    const expense = await recordTransaction({
      type: 'expense',
      amount: 120,
      date: '2026-10-21',
      gig_id: null,
    })
    expect(useGigsStore().items[0]!.paid_at).toBeNull()

    const income = await recordTransaction({ type: 'income', amount: 8000, date: '2026-10-22' })
    await updateTransaction(income.id, { gig_id: gig.id })
    expect(useGigsStore().items[0]!.paid_at).toBe('2026-10-22')
    expect(
      useMoneyStore()
        .items.map((t) => t.id)
        .sort(),
    ).toEqual([expense.id, income.id].sort())
  })
})
