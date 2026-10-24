// Cross-module sync rules (SPEC section 6). Pages call these functions; components hold no
// sync logic. Every rule is idempotent: running it twice leaves the same rows.
import { addDays, todayKey, type DateKey } from './dates'
import { i18n } from '@/i18n'
import { useCategoriesStore } from '@/stores/categories'
import { useEventsStore, type NewEvent } from '@/stores/events'
import { useGigsStore, type NewGig } from '@/stores/gigs'
import { useMoneyStore, type NewTransaction } from '@/stores/money'
import { useRecurringStore, type NewRecurring } from '@/stores/recurring'
import { dueDates } from './recurring'
import { useSettingsStore } from '@/stores/settings'
import { useTasksStore, type TaskOccurrence } from '@/stores/tasks'
import type {
  CategoryRow,
  EventRow,
  GigRow,
  RecurringRow,
  TaskRow,
  TransactionRow,
} from '@/types/db'

// ---- Rule 6: to-dos with a date show on that day in the calendar (read directly, no copies) ----

/** The calendar's to-do list for a day: unfinished first, finished after (SPEC 4.2). */
export function calendarTodos(day: DateKey): TaskOccurrence[] {
  const list = useTasksStore()
    .occurrencesOn(day)
    .filter((o) => o.task.show_in_calendar)
  return [...list.filter((o) => !o.done), ...list.filter((o) => o.done)]
}

// ---- Rule 9: unfinished to-dos move to today (setting: 沒做完的自動移到明天) ----

/**
 * Moves unfinished one-off to-dos dated before today to today. Repeating to-dos stay (each
 * day is its own), and so do generated ones: their dates come from their event or gig, whose
 * rules would move them back (DECISIONS 47). Returns how many moved.
 */
export async function rolloverTasks(today: DateKey): Promise<number> {
  if (!(useSettingsStore().row?.rollover_tasks ?? true)) return 0
  const tasks = useTasksStore()
  const stale = tasks.items.filter(
    (task) => !task.done && task.repeat === 'none' && task.source === 'manual' && task.date < today,
  )
  for (const task of stale) await tasks.update(task.id, { date: today })
  return stale.length
}

const ROLLOVER_KEY = 'planner.rollover.'

/** Runs rule 9 once per user per day: on the first time the app opens that day. */
export async function rolloverOncePerDay(userId: string, today: DateKey) {
  const key = ROLLOVER_KEY + userId
  try {
    if (localStorage.getItem(key) === today) return
  } catch {
    // No storage: running again is harmless, the rule is idempotent.
  }
  await rolloverTasks(today)
  try {
    localStorage.setItem(key, today)
  } catch {
    // ignore
  }
}

// ---- Rule 7: an event with "同時加到今日待辦" gets a to-do on each of its days ----

/** Every day an event covers, start to end inclusive. */
export function eventDays(event: Pick<EventRow, 'start_date' | 'end_date'>): DateKey[] {
  const days: DateKey[] = []
  for (let d = event.start_date; d <= event.end_date; d = addDays(d, 1)) days.push(d)
  return days
}

/**
 * The to-do category for an event's tasks: the task category with the same key
 * (work, gig, study, health); events without one (dates & meals, travel) go under life.
 */
export function taskCategoryForEvent(eventCategory: CategoryRow | undefined) {
  const categories = useCategoriesStore()
  const taskCats = categories.ofType('task')
  return (
    taskCats.find((c) => eventCategory?.key && c.key === eventCategory.key) ??
    taskCats.find((c) => c.key === 'life') ??
    taskCats[0]
  )
}

/**
 * Brings an event's generated to-dos in line with the event: one per day while
 * add_to_today is on, none when it is off. Ticks on days that stay are kept.
 */
export async function syncEventTasks(event: EventRow) {
  const tasks = useTasksStore()
  const categories = useCategoriesStore()
  const existing = tasks.items.filter((t) => t.event_id === event.id && t.source === 'event')
  const wanted = event.add_to_today ? eventDays(event) : []
  const categoryId = taskCategoryForEvent(categories.byId(event.category_id))?.id ?? null

  for (const task of existing) {
    if (!wanted.includes(task.date)) await tasks.remove(task.id)
  }
  for (const day of wanted) {
    const time = day === event.start_date && !event.all_day ? event.start_time : null
    const fields: Partial<TaskRow> = { title: event.title, category_id: categoryId, time }
    const task = existing.find((t) => t.date === day)
    if (!task) {
      // The calendar already shows the event, so its to-dos stay off the calendar's to-do list.
      await tasks.add({
        ...fields,
        title: event.title,
        date: day,
        source: 'event',
        event_id: event.id,
        show_in_calendar: false,
      })
    } else if (
      task.title !== fields.title ||
      task.category_id !== fields.category_id ||
      task.time !== fields.time
    ) {
      await tasks.update(task.id, fields)
    }
  }
}

/** Creates an event and its to-dos (rule 7). */
export async function createEvent(row: NewEvent): Promise<EventRow> {
  const event = await useEventsStore().add(row)
  await syncEventTasks(event)
  return event
}

/** Saves changes to an event and brings its to-dos along (rule 7). */
export async function updateEvent(id: string, patch: Partial<NewEvent>): Promise<EventRow> {
  const event = await useEventsStore().update(id, patch)
  await syncEventTasks(event)
  return event
}

/** Deletes an event; the database cascades its generated to-dos, the store follows. */
export async function deleteEvent(id: string) {
  await useEventsStore().remove(id)
  useTasksStore().forget((t) => t.event_id === id)
}

// ---- Rules 1–5: gigs → calendar, to-dos and money; money → gigs ----

const t = (key: string, values: Record<string, unknown>) => i18n.global.t(key, values)

const categoryByKey = (type: CategoryRow['type'], key: string) =>
  useCategoriesStore()
    .ofType(type)
    .find((c) => c.key === key)

type GigEventKind = NonNullable<EventRow['gig_kind']>
type GigTaskKind = NonNullable<TaskRow['gig_kind']>

/** Rule 1: one all-day event per filled-in date (交稿 / 上線 / 預計入帳). */
async function syncGigEvents(gig: GigRow) {
  const events = useEventsStore()
  const enabled = (useSettingsStore().row?.auto_sync_calendar ?? true) && gig.sync_calendar
  const dates: Record<GigEventKind, string | null> = {
    deliver: gig.deliver_date,
    live: gig.live_date,
    due: gig.due_date,
  }
  const titles: Record<GigEventKind, string> = {
    deliver: 'gigs.eventDeliver',
    live: 'gigs.eventLive',
    due: 'gigs.eventDue',
  }
  const categoryId = categoryByKey('event', 'gig')?.id ?? null

  for (const kind of ['deliver', 'live', 'due'] as const) {
    const existing = events.items.find(
      (e) => e.gig_id === gig.id && e.gig_kind === kind && e.source === 'gig',
    )
    const date = enabled ? dates[kind] : null
    if (!date) {
      if (existing) await events.remove(existing.id)
      continue
    }
    const fields = {
      title: t(titles[kind], { brand: gig.brand }),
      start_date: date,
      end_date: date,
      category_id: categoryId,
    }
    if (!existing) {
      await events.add({ ...fields, all_day: true, source: 'gig', gig_id: gig.id, gig_kind: kind })
    } else if (
      existing.title !== fields.title ||
      existing.start_date !== date ||
      existing.end_date !== date
    ) {
      await events.update(existing.id, fields)
    }
  }
}

/** Creates, updates or removes one generated to-do of a gig. */
async function upsertGigTask(
  gig: GigRow,
  kind: GigTaskKind,
  want: { title: string; date: DateKey; done?: boolean } | null,
) {
  const tasks = useTasksStore()
  const existing = tasks.items.find(
    (task) => task.gig_id === gig.id && task.gig_kind === kind && task.source === 'gig',
  )
  if (!want) {
    if (existing) await tasks.remove(existing.id)
    return
  }
  const doneFields =
    want.done === undefined
      ? {}
      : {
          done: want.done,
          done_at: want.done ? (existing?.done_at ?? new Date().toISOString()) : null,
        }
  if (!existing) {
    await tasks.add({
      title: want.title,
      date: want.date,
      category_id: categoryByKey('task', 'gig')?.id ?? null,
      source: 'gig',
      gig_id: gig.id,
      gig_kind: kind,
      ...doneFields,
    })
    return
  }
  const patch: Partial<TaskRow> = {}
  if (existing.title !== want.title) patch.title = want.title
  if (existing.date !== want.date) patch.date = want.date
  if (want.done !== undefined && existing.done !== want.done) Object.assign(patch, doneFields)
  if (Object.keys(patch).length) await tasks.update(existing.id, patch)
}

/**
 * Rule 2: "準備交稿" the day before delivery and "確認上線" on the live day.
 * Rule 3: one "簽合約／勞報單" to-do (DECISIONS 5), done once both are signed.
 * Ticking 交稿 / 上線 on the Gigs page ticks the matching to-do (DECISIONS 26).
 */
async function syncGigTasks(gig: GigRow, before?: GigRow) {
  const changed = (key: 'delivered' | 'is_live') => !before || before[key] !== gig[key]

  await upsertGigTask(
    gig,
    'prep_deliver',
    gig.sync_todo && gig.deliver_date
      ? {
          title: t('gigs.taskPrep', { brand: gig.brand }),
          date: addDays(gig.deliver_date, -1),
          done: changed('delivered') ? gig.delivered : undefined,
        }
      : null,
  )
  await upsertGigTask(
    gig,
    'check_live',
    gig.sync_todo && gig.live_date
      ? {
          title: t('gigs.taskCheckLive', { brand: gig.brand }),
          date: gig.live_date,
          done: changed('is_live') ? gig.is_live : undefined,
        }
      : null,
  )

  const missing = [
    !gig.contract_signed && t('gigs.docContract', {}),
    !gig.labor_signed && t('gigs.docLabor', {}),
  ].filter(Boolean)
  const tasks = useTasksStore()
  const existing = tasks.items.find(
    (task) => task.gig_id === gig.id && task.gig_kind === 'sign_docs' && task.source === 'gig',
  )
  if (!gig.sync_docs || (!existing && !missing.length)) {
    await upsertGigTask(gig, 'sign_docs', null)
    return
  }
  const allSigned = !missing.length
  // Shows up tomorrow; reopening a finished one moves it to tomorrow again.
  const date = !existing || (existing.done && !allSigned) ? addDays(todayKey(), 1) : existing.date
  const docs = allSigned
    ? [t('gigs.docContract', {}), t('gigs.docLabor', {})]
    : (missing as string[])
  await upsertGigTask(gig, 'sign_docs', {
    title: t('gigs.taskSign', { brand: gig.brand, docs: docs.join(t('gigs.docsJoin', {})) }),
    date,
    done: allSigned,
  })
}

/** The income entry recorded for a gig, if any (one per gig: transactions_gig_uniq). */
export function gigIncome(gigId: string): TransactionRow | undefined {
  return useMoneyStore().items.find((tx) => tx.gig_id === gigId)
}

/** Rule 4: marking a gig paid records the income; marking it unpaid again removes it. */
async function syncGigIncome(gig: GigRow, before?: GigRow) {
  const enabled = (useSettingsStore().row?.auto_sync_money ?? true) && gig.sync_money
  if (!enabled) return
  const money = useMoneyStore()
  const existing = gigIncome(gig.id)

  if (!gig.paid_at) {
    if (existing) await money.remove(existing.id)
    return
  }
  if (!existing) {
    await money.add({
      type: 'income',
      amount: gig.amount,
      date: gig.paid_at,
      category_id: categoryByKey('income', 'gig')?.id ?? null,
      gig_id: gig.id,
      note: gig.brand,
    })
    return
  }
  const patch: Partial<TransactionRow> = {}
  if (existing.date !== gig.paid_at) patch.date = gig.paid_at
  // Follow the gig's amount unless the entry was changed by hand (DECISIONS 27).
  if (before && before.amount !== gig.amount && existing.amount === before.amount) {
    patch.amount = gig.amount
  }
  if (Object.keys(patch).length) await money.update(existing.id, patch)
}

/** Runs rules 1–4 for one gig. Idempotent. */
export async function syncGig(gig: GigRow, before?: GigRow) {
  await syncGigEvents(gig)
  await syncGigTasks(gig, before)
  await syncGigIncome(gig, before)
}

export async function createGig(row: NewGig): Promise<GigRow> {
  const gig = await useGigsStore().add(row)
  await syncGig(gig)
  return gig
}

/**
 * Saves a change to a gig (the card's step circles, or the edit form) and runs the rules.
 * The card updates right away and goes back if saving fails.
 */
export async function updateGig(id: string, patch: Partial<NewGig>): Promise<GigRow> {
  const gigs = useGigsStore()
  const index = gigs.items.findIndex((g) => g.id === id)
  const before = gigs.items[index]
  if (before) gigs.items[index] = { ...before, ...patch }
  let gig: GigRow
  try {
    gig = await gigs.update(id, { ...patch, updated_at: new Date().toISOString() })
  } catch (error) {
    if (before) gigs.items[index] = before
    throw error
  }
  await syncGig(gig, before)
  return gig
}

/**
 * Deletes a gig with its generated events and to-dos (the database cascades them).
 * To-dos the user made and only linked to the gig stay, unlinked. The income entry goes
 * only when `deleteIncome` is set; otherwise it stays as a plain income.
 */
export async function deleteGig(id: string, { deleteIncome }: { deleteIncome: boolean }) {
  const tasks = useTasksStore()
  const money = useMoneyStore()
  for (const task of tasks.items.filter((x) => x.gig_id === id && x.source !== 'gig')) {
    await tasks.update(task.id, { gig_id: null })
  }
  const income = gigIncome(id)
  if (income && deleteIncome) await money.remove(income.id)

  await useGigsStore().remove(id)
  useEventsStore().forget((e) => e.gig_id === id)
  tasks.forget((x) => x.gig_id === id)
  const kept = gigIncome(id)
  if (kept) {
    const index = money.items.indexOf(kept)
    money.items[index] = { ...kept, gig_id: null }
  }
}

/** Rule 5: an income filed under 接案 with a gig picked marks that gig paid on its date. */
async function markLinkedGigPaid(tx: TransactionRow) {
  if (tx.type !== 'income' || !tx.gig_id) return
  const gig = useGigsStore().items.find((g) => g.id === tx.gig_id)
  if (gig && gig.paid_at !== tx.date) await updateGig(gig.id, { paid_at: tx.date })
}

/** Records a money entry (the 記一筆 screen), running rule 5. */
export async function recordTransaction(row: NewTransaction): Promise<TransactionRow> {
  const tx = await useMoneyStore().add(row)
  await markLinkedGigPaid(tx)
  return tx
}

/** Saves an edited money entry, running rule 5 again (a new gig or date). */
export async function updateTransaction(
  id: string,
  patch: Partial<NewTransaction>,
): Promise<TransactionRow> {
  const tx = await useMoneyStore().update(id, patch)
  await markLinkedGigPaid(tx)
  return tx
}

// ---- 固定收支: recurring money entries (DECISIONS 53) ----

const isDuplicate = (error: unknown) => (error as { code?: string } | null)?.code === '23505'

/**
 * Records every occurrence of `rule` that is due by `today` and not recorded yet. A date
 * recorded on another device in the meantime is skipped (unique recurring_id + date).
 */
async function recordDue(rule: RecurringRow, today: DateKey) {
  const dates = dueDates(rule, today)
  if (!dates.length) return
  const money = useMoneyStore()
  for (const date of dates) {
    if (money.items.some((tx) => tx.recurring_id === rule.id && tx.date === date)) continue
    try {
      await money.add({
        type: rule.type,
        amount: rule.amount,
        category_id: rule.category_id,
        note: rule.note,
        date,
        recurring_id: rule.id,
      })
    } catch (error) {
      if (!isDuplicate(error)) throw error
    }
  }
  await useRecurringStore().update(rule.id, { last_date: dates[dates.length - 1]! })
}

/** Runs on every app open: records what came due since last time. */
export async function generateRecurring(today: DateKey) {
  for (const rule of useRecurringStore().items) await recordDue(rule, today)
}

/** A new entry set to repeat: the rule, plus every occurrence already due (the first one, if today or earlier). */
export async function createRecurring(row: NewRecurring, today: DateKey): Promise<RecurringRow> {
  const rule = await useRecurringStore().add({ ...row, last_date: null })
  await recordDue(rule, today)
  return rule
}

/** Turns an existing entry into the first occurrence of a new rule. */
export async function makeEntryRecurring(tx: TransactionRow, frequency: RecurringRow['frequency']) {
  const rule = await useRecurringStore().add({
    type: tx.type,
    amount: tx.amount,
    category_id: tx.category_id,
    note: tx.note,
    frequency,
    start_date: tx.date,
    last_date: tx.date,
  })
  await useMoneyStore().update(tx.id, { recurring_id: rule.id })
  return rule
}

/** Changes a rule; occurrences already recorded stay as they are. */
export async function updateRecurring(id: string, patch: Partial<NewRecurring>, today: DateKey) {
  const rule = await useRecurringStore().update(id, patch)
  await recordDue(rule, today)
  return rule
}

/** Stops a rule. Its recorded entries stay as plain entries. */
export async function deleteRecurring(id: string) {
  await useRecurringStore().remove(id)
  const money = useMoneyStore()
  money.items = money.items.map((tx) =>
    tx.recurring_id === id ? { ...tx, recurring_id: null } : tx,
  )
}
