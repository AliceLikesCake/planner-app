// Excel / CSV export: gig income and money entries, one sheet each, headers in the current
// language (DECISIONS 41: the same two everywhere, no to-do or habit history).
// buildSheets() is pure over the stores; exportFile() writes the download.
import { i18n } from '@/i18n'
import type { DateKey } from './dates'
import { knownFormats } from './products'
import { useCategoriesStore } from '@/stores/categories'
import { useGigsStore } from '@/stores/gigs'
import { useMoneyStore } from '@/stores/money'
import type { GigRow } from '@/types/db'

export const EXPORT_CONTENTS = ['gigs', 'money'] as const
export type ExportContent = (typeof EXPORT_CONTENTS)[number]

export interface DateRange {
  start: DateKey
  /** Inclusive. */
  end: DateKey
}

export interface Sheet {
  content: ExportContent
  name: string
  header: string[]
  rows: (string | number)[][]
}

const t = (key: string, values: Record<string, unknown> = {}) => i18n.global.t(key, values)
const inRange = (day: string | null | undefined, r: DateRange) =>
  !!day && day >= r.start && day <= r.end

/**
 * A gig belongs to a range when it was paid in it; an unpaid gig when any of its dates falls in
 * it (or, with no dates at all, when it was created in it).
 */
function gigInRange(g: GigRow, r: DateRange) {
  if (g.paid_at) return inRange(g.paid_at, r)
  const dates = [g.deliver_date, g.live_date, g.due_date].filter(Boolean)
  return dates.length ? dates.some((d) => inRange(d, r)) : inRange(g.created_at.slice(0, 10), r)
}

function moneySheet(r: DateRange): Sheet {
  const categories = useCategoriesStore()
  const gigs = useGigsStore()
  const rows = useMoneyStore()
    .items.filter((tx) => inRange(tx.date, r))
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    .map((tx) => {
      const gig = gigs.items.find((g) => g.id === tx.gig_id)
      return [
        tx.date,
        t(tx.type === 'income' ? 'money.income' : 'money.expense'),
        categories.name(categories.byId(tx.category_id)),
        tx.type === 'income' ? tx.amount : -tx.amount,
        tx.note ?? '',
        gig?.brand ?? '',
        // Gig income also carries the gig's product category (彩妝, 保養, …).
        gig ? t(`product.${gig.product_category}`) : '',
      ]
    })
  return {
    content: 'money',
    name: t('export.sheet.money'),
    header: ['date', 'type', 'category', 'amount', 'note', 'gig', 'product'].map((c) =>
      t(`export.col.${c}`),
    ),
    rows,
  }
}

function gigsSheet(r: DateRange, today: DateKey): Sheet {
  const yesNo = (v: boolean) => t(v ? 'export.yes' : 'export.no')
  const join = i18n.global.locale.value === 'en' ? ', ' : '、'
  const rows = useGigsStore()
    .items.filter((g) => gigInRange(g, r))
    .sort((a, b) =>
      (a.paid_at ?? a.due_date ?? '9999').localeCompare(b.paid_at ?? b.due_date ?? '9999'),
    )
    .map((g) => {
      const overdue = !g.paid_at && !!g.due_date && g.due_date < today
      return [
        g.brand,
        t(`product.${g.product_category}`),
        knownFormats(g.formats)
          .map((f) => t(`gigs.formats.${f}`))
          .join(join),
        g.amount,
        g.deliver_date ?? '',
        g.live_date ?? '',
        g.due_date ?? '',
        g.paid_at ?? '',
        t(g.paid_at ? 'gigs.paid' : overdue ? 'gigs.overdue' : 'gigs.unpaid'),
        yesNo(g.contract_signed),
        yesNo(g.delivered),
        yesNo(g.is_live),
        yesNo(g.labor_signed),
        g.contact ?? '',
        g.note ?? '',
      ]
    })
  return {
    content: 'gigs',
    name: t('export.sheet.gigs'),
    header: [
      'brand',
      'product',
      'formats',
      'fee',
      'deliver',
      'live',
      'due',
      'paidAt',
      'payStatus',
      'contract',
      'delivered',
      'isLive',
      'labor',
      'contact',
      'note',
    ].map((c) => t(`export.col.${c}`)),
    rows,
  }
}

/** The sheets for the chosen contents and range, in the order of EXPORT_CONTENTS. */
export function buildSheets(contents: ExportContent[], range: DateRange, today: DateKey): Sheet[] {
  const build: Record<ExportContent, () => Sheet> = {
    money: () => moneySheet(range),
    gigs: () => gigsSheet(range, today),
  }
  return EXPORT_CONTENTS.filter((c) => contents.includes(c)).map((c) => build[c]())
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Downloads the sheets: one .xlsx with a sheet each, or one .csv per sheet (a CSV file holds a
 * single table). CSV gets a byte-order mark so Excel reads the Chinese text correctly.
 */
export async function exportFile(sheets: Sheet[], baseName: string, format: 'xlsx' | 'csv') {
  const XLSX = await import('xlsx')
  const toSheet = (s: Sheet) => XLSX.utils.aoa_to_sheet([s.header, ...s.rows])

  if (format === 'xlsx') {
    const book = XLSX.utils.book_new()
    for (const s of sheets) XLSX.utils.book_append_sheet(book, toSheet(s), s.name.slice(0, 31))
    XLSX.writeFile(book, `${baseName}.xlsx`, { compression: true })
    return
  }
  for (const s of sheets) {
    const csv = XLSX.utils.sheet_to_csv(toSheet(s))
    const name = sheets.length > 1 ? `${baseName}_${s.name}.csv` : `${baseName}.csv`
    download(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }), name)
  }
}
