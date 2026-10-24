import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

/** A save-failed message that clears itself after a few seconds. */
export function useErrorToast() {
  const { t } = useI18n()
  const error = ref('')
  let timer: ReturnType<typeof setTimeout> | undefined

  function showError() {
    error.value = t('today.saveError')
    clearTimeout(timer)
    timer = setTimeout(() => (error.value = ''), 4000)
  }

  onBeforeUnmount(() => clearTimeout(timer))
  return { error, showError }
}
