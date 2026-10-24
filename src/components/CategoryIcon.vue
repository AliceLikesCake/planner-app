<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string | null | undefined; size?: number }>(), {
  size: 20,
})

// Icon paths from design/mockups/Main.dc.html (SPEC 4.1: 工作＝公事包, 接案＝相機, ...).
const ICONS: Record<string, string> = {
  work: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5h6v2M3 12.5h18"/>',
  gig: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  study:
    '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
  life: '<path d="M4 11l8-6 8 6v8H4zM10 19v-5h4v5"/>',
  health: '<path d="M12 19s-7-4.5-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 2.5C19 14.5 12 19 12 19z"/>',
}
// Categories the user adds themselves have no key: a plain tag.
const FALLBACK = '<path d="M4 12.5V5h7.5l8.5 8.5-7.5 7.5z"/><circle cx="8.5" cy="9" r="1.4"/>'

const paths = computed(() => (props.name && ICONS[props.name]) || FALLBACK)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="paths"
  />
</template>
