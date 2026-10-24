// In-memory stand-in for the parts of supabase-js the app uses (from/select/insert/upsert/update/
// delete with eq/order/single). It backs the demo mode (DECISIONS 57) and the unit tests.
// Rows live only in this page; each user sees only their own rows, as with RLS.

type Row = Record<string, unknown>
type Result = { data: unknown; error: { message: string } | null; count?: number | null }

const PRIMARY_KEYS: Record<string, string[]> = {
  settings: ['user_id'],
  habit_logs: ['habit_id', 'date'],
  task_completions: ['task_id', 'date'],
}

// Column defaults from supabase/schema.sql that the app relies on.
const DEFAULTS: Record<string, Row> = {
  settings: {
    lang: 'zh-TW',
    week_start: 'mon',
    dark: false,
    sound: true,
    push: true,
    remind_deliver: true,
    remind_overdue: true,
    habit_remind_time: '21:30:00',
    auto_sync_calendar: true,
    auto_sync_money: true,
    rollover_tasks: true,
    budget_total: 25000,
    budget_by_category: {},
    budget_warn: true,
    month_start_day: 1,
    cakes_by_weekday: ['classic', 'crepe', 'cupcake', 'sundae', 'pudding', 'pancake', 'tier'],
    cakes_random_weekly: false,
    max_layers: 8,
    cake_glitter: true,
    savings_amount: null,
    savings_date: null,
    savings_set_at: null,
  },
  tasks: {
    category_id: null,
    time: null,
    repeat: 'none',
    remind: false,
    show_in_calendar: true,
    note: null,
    done: false,
    done_at: null,
    source: 'manual',
    gig_id: null,
    gig_kind: null,
    event_id: null,
  },
  gigs: {
    formats: [],
    amount: 0,
    contact: null,
    note: null,
    deliver_date: null,
    live_date: null,
    due_date: null,
    contract_signed: false,
    labor_signed: false,
    delivered: false,
    is_live: false,
    paid_at: null,
    sync_calendar: true,
    sync_todo: true,
    sync_docs: true,
    sync_money: true,
  },
  transactions: {
    category_id: null,
    note: null,
    gig_id: null,
    recurring_id: null,
  },
  recurring_transactions: {
    category_id: null,
    note: null,
    last_date: null,
  },
  habits: {
    goal: null,
    color: 'blue',
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    remind: true,
    sort: 0,
    archived: false,
  },
  events: {
    category_id: null,
    all_day: true,
    start_time: null,
    end_time: null,
    place: null,
    remind: 'none',
    add_to_today: false,
    source: 'manual',
    gig_id: null,
    gig_kind: null,
  },
}

let nextId = 1

export const memoryDb = {
  tables: {} as Record<string, Row[]>,
  userId: 'user-1' as string | null,
  reset(userId: string | null = 'user-1') {
    this.tables = {}
    this.userId = userId
    nextId = 1
  },
  rows(table: string): Row[] {
    return (this.tables[table] ??= [])
  },
}

function keyOf(table: string, row: Row) {
  return (PRIMARY_KEYS[table] ?? ['id']).map((k) => String(row[k])).join('|')
}

class Query implements PromiseLike<Result> {
  private filters: [string, unknown][] = []
  private orders: [string, boolean][] = []
  private action: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select'
  private payload: Row[] = []
  private patch: Row = {}
  private ignoreDuplicates = false
  private returning = false
  private singleMode: 'one' | 'maybe' | null = null
  private countMode = false
  private head = false

  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.action !== 'select') this.returning = true
    this.countMode = !!opts?.count
    this.head = !!opts?.head
    return this
  }
  insert(rows: Row | Row[]) {
    this.action = 'insert'
    this.payload = Array.isArray(rows) ? rows : [rows]
    return this
  }
  upsert(rows: Row | Row[], opts?: { ignoreDuplicates?: boolean }) {
    this.action = 'upsert'
    this.payload = Array.isArray(rows) ? rows : [rows]
    this.ignoreDuplicates = !!opts?.ignoreDuplicates
    return this
  }
  update(patch: Row) {
    this.action = 'update'
    this.patch = patch
    return this
  }
  delete() {
    this.action = 'delete'
    return this
  }
  eq(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }
  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push([column, opts?.ascending ?? true])
    return this
  }
  maybeSingle() {
    this.singleMode = 'maybe'
    return this
  }
  single() {
    this.singleMode = 'one'
    return this
  }

  private matches(row: Row) {
    // Row Level Security: only the signed-in user's rows.
    if (row.user_id !== memoryDb.userId) return false
    return this.filters.every(([c, v]) => row[c] === v)
  }

  private run(): Result {
    const rows = memoryDb.rows(this.table)
    let out: Row[] = []

    if (this.action === 'select') {
      out = rows.filter((r) => this.matches(r))
      for (const [col, asc] of [...this.orders].reverse()) {
        out = [...out].sort((a, b) => {
          const x = a[col] as string | number | null
          const y = b[col] as string | number | null
          if (x === y) return 0
          if (x === null || x === undefined) return 1
          if (y === null || y === undefined) return -1
          return (x < y ? -1 : 1) * (asc ? 1 : -1)
        })
      }
    } else if (this.action === 'insert' || this.action === 'upsert') {
      for (const input of this.payload) {
        if (input.user_id !== memoryDb.userId)
          return { data: null, error: { message: 'RLS violation' } }
        const row: Row = { ...DEFAULTS[this.table], created_at: new Date().toISOString(), ...input }
        if (!PRIMARY_KEYS[this.table] && row.id === undefined) row.id = `id-${nextId++}`
        const existing = rows.findIndex((r) => keyOf(this.table, r) === keyOf(this.table, row))
        if (existing >= 0) {
          if (this.action === 'insert') return { data: null, error: { message: 'duplicate key' } }
          if (this.ignoreDuplicates) continue
          rows[existing] = { ...rows[existing], ...row }
          out.push(rows[existing]!)
        } else {
          rows.push(row)
          out.push(row)
        }
      }
    } else if (this.action === 'update') {
      for (const r of rows) if (this.matches(r)) out.push(Object.assign(r, this.patch))
    } else {
      out = rows.filter((r) => this.matches(r))
      memoryDb.tables[this.table] = rows.filter((r) => !out.includes(r))
    }

    if (this.countMode && this.head) return { data: null, error: null, count: out.length }
    if (this.action !== 'select' && !this.returning) return { data: null, error: null }
    const copies = out.map((r) => ({ ...r }))
    if (this.singleMode === 'maybe') return { data: copies[0] ?? null, error: null }
    if (this.singleMode === 'one') {
      return copies.length === 1
        ? { data: copies[0], error: null }
        : { data: null, error: { message: `expected one row, got ${copies.length}` } }
    }
    return { data: copies, error: null }
  }

  // supabase-js query builders are awaitable; the fake has to be too.
  // oxlint-disable-next-line unicorn/no-thenable
  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }
}

/** `supabase.from(table)` against the in-memory rows. */
export function memoryFrom(table: string) {
  return new Query(table)
}
