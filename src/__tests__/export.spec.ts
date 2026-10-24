import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as XLSX from 'xlsx'
import { fakeDb } from './fakeSupabase'
import { loadUserData } from '../services/session'
import { buildSheets } from '../services/export'
import { createGig, recordTransaction, updateGig } from '../services/sync'
import { useCategoriesStore } from '../stores/categories'
import { useSettingsStore } from '../stores/settings'

vi.mock('@/services/supabase', () => import('./fakeSupabase'))

const OCT = { start: '2026-10-01', end: '2026-10-31' }
const TODAY = '2026-10-24'

beforeEach(async () => {
  localStorage.clear()
  fakeDb.reset('user-1')
  setActivePinia(createPinia())
  await loadUserData('user-1')
  await useSettingsStore().setLang('zh-TW')
})

const cat = (type: 'expense' | 'income' | 'task', key: string) =>
  useCategoriesStore()
    .ofType(type)
    .find((c) => c.key === key)!.id

describe('export sheets', () => {
  it('builds only the chosen sheets, gigs first, with translated headers', async () => {
    expect(buildSheets(['money', 'gigs'], OCT, TODAY).map((s) => s.name)).toEqual([
      '接案收入',
      '記帳明細',
    ])
    const sheets = buildSheets(['money'], OCT, TODAY)
    expect(sheets.map((s) => s.name)).toEqual(['記帳明細'])
    expect(sheets[0]!.header).toEqual(['日期', '收支', '分類', '金額', '備註', '接案', '產品類別'])
  })

  it('money: entries in range, spending negative', async () => {
    await recordTransaction({
      type: 'expense',
      amount: 150,
      date: '2026-10-22',
      category_id: cat('expense', 'food'),
      note: '午餐',
    })
    await recordTransaction({
      type: 'income',
      amount: 33500,
      date: '2026-10-05',
      category_id: cat('income', 'salary'),
    })
    await recordTransaction({
      type: 'expense',
      amount: 99,
      date: '2026-09-30',
      category_id: cat('expense', 'food'),
    })
    const [money] = buildSheets(['money'], OCT, TODAY)
    expect(money!.rows).toEqual([
      ['2026-10-05', '收入', '薪資', 33500, '', '', ''],
      ['2026-10-22', '支出', '餐飲', -150, '午餐', '', ''],
    ])
  })

  it('money: gig income shows the gig and its product category', async () => {
    const gig = await createGig({ brand: '品牌 A', product_category: 'skin', amount: 8000 })
    await updateGig(gig.id, { paid_at: '2026-10-18' })
    const [money] = buildSheets(['money'], OCT, TODAY)
    expect(money!.rows).toEqual([['2026-10-18', '收入', '接案', 8000, '品牌 A', '品牌 A', '保養']])
  })

  it('gigs: paid in range, or unpaid with a date in range; with paperwork status', async () => {
    const paid = await createGig({
      brand: '品牌 A',
      product_category: 'skin',
      amount: 8000,
      formats: ['ig_post', 'threads'],
      contract_signed: true,
    })
    await updateGig(paid.id, { paid_at: '2026-10-18' })
    await createGig({
      brand: '品牌 B',
      product_category: 'food',
      amount: 12000,
      due_date: '2026-10-20',
    })
    await createGig({
      brand: '品牌 C',
      product_category: 'tech',
      amount: 5000,
      due_date: '2026-12-15',
    })

    const [gigs] = buildSheets(['gigs'], OCT, TODAY)
    expect(gigs!.rows.map((r) => [r[0], r[3], r[7], r[8], r[9], r[10]])).toEqual([
      ['品牌 A', 8000, '2026-10-18', '已入帳', '是', '否'],
      ['品牌 B', 12000, '', '逾期未入帳', '否', '否'],
    ])
    expect(gigs!.rows[0]![2]).toBe('IG 貼文、Threads')
  })

  it('survives a round trip through SheetJS', async () => {
    await createGig({
      brand: '品牌 A',
      product_category: 'skin',
      amount: 8000,
      due_date: '2026-10-30',
    })
    const [gigs] = buildSheets(['gigs'], OCT, TODAY)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([gigs!.header, ...gigs!.rows]),
      gigs!.name,
    )
    const back = XLSX.read(XLSX.write(book, { type: 'array', bookType: 'xlsx' }))
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(back.Sheets['接案收入']!, {
      header: 1,
    })
    expect(rows[0]![0]).toBe('品牌')
    expect(rows[1]!.slice(0, 4)).toEqual(['品牌 A', '保養', '', 8000])
  })
})
