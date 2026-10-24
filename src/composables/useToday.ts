import { onBeforeUnmount, onMounted, ref } from 'vue'
import { todayKey } from '@/services/dates'

/** Today's date key, kept current across midnight and when the app comes back to the foreground. */
export function useToday() {
  const today = ref(todayKey())
  const refresh = () => {
    const now = todayKey()
    if (now !== today.value) today.value = now
  }
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    timer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
  })
  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', refresh)
  })

  return today
}
