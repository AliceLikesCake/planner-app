// Cross-module sync rules (SPEC section 6). Pages call these functions; components hold no
// sync logic. Every rule is idempotent: running it twice leaves the same rows.
import { addDays, type DateKey } from './dates'
import { useCategoriesStore } from '@/stores/categories'
import { useEventsStore, type NewEvent } from '@/stores/events'
import { useTasksStore, type TaskOccurrence } from '@/stores/tasks'
import type { CategoryRow, EventRow, TaskRow } from '@/types/db'

// ---- Rule 6: to-dos with a date show on that day in the calendar (read directly, no copies) ----

/** The calendar's to-do list for a day: unfinished first, finished after (SPEC 4.2). */
export function calendarTodos(day: DateKey): TaskOccurrence[] {
  const list = useTasksStore()
    .occurrencesOn(day)
    .filter((o) => o.task.show_in_calendar)
  return [...list.filter((o) => !o.done), ...list.filter((o) => o.done)]
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
