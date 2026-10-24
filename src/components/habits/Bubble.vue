<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { paletteVars } from '@/styles/palette'

const props = defineProps<{
  name: string
  /** Shown under the name while the bubble is whole. */
  goal: string
  color: string
  /** 104–132px. */
  size: number
  /** Position in the row; odd bubbles sit 22px lower and float on a different beat. */
  index: number
  popped: boolean
  streak: number
  /** Play the ring and droplets (popped just now). */
  burst?: boolean
  /** Static preview, as on the add-habit screen. */
  preview?: boolean
}>()
defineEmits<{ tap: [] }>()

const { t } = useI18n()

const style = computed(() => ({
  ...paletteVars(props.color),
  width: `${props.size}px`,
  height: `${props.size}px`,
  marginTop: props.index % 2 ? '22px' : '0',
  '--float-duration': `${3.4 + props.index * 0.4}s`,
  '--float-delay': `${props.index * 0.3}s`,
}))

// Eight droplets flying out evenly around the bubble.
const drops = computed(() =>
  Array.from({ length: 8 }, (_, k) => {
    const angle = (k / 8) * Math.PI * 2
    return {
      '--dx': `${Math.round(Math.cos(angle) * props.size * 0.62)}px`,
      '--dy': `${Math.round(Math.sin(angle) * props.size * 0.62)}px`,
    }
  }),
)
</script>

<template>
  <div class="wrap" :style="style">
    <template v-if="burst && popped">
      <span class="ring" />
      <span v-for="(d, i) in drops" :key="i" class="drop" :style="d" />
    </template>
    <component
      :is="preview ? 'div' : 'button'"
      :type="preview ? undefined : 'button'"
      class="bubble"
      :class="{ popped, big: size >= 118 }"
      :aria-pressed="preview ? undefined : popped"
      :aria-label="preview ? undefined : t(popped ? 'habits.undoAria' : 'habits.popAria', { name })"
      @click="$emit('tap')"
    >
      <span v-if="!popped" class="shine" />
      <svg
        v-else
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12l5 5 9-10" />
      </svg>
      <span class="name">{{ name }}</span>
      <span class="sub num">{{ popped ? t('habits.streak', { n: streak }) : goal }}</span>
    </component>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
  flex-shrink: 0;
}

.bubble {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  overflow: hidden;
  border-radius: 50%;
  border: 2px solid var(--c-deep);
  background: var(--c-fill);
  color: var(--c-text);
  /* hard-edged highlight from the mockup (no blur) */
  box-shadow: inset -8px -10px 0 rgba(255, 255, 255, 0.35);
  animation: bubble-float var(--float-duration) ease-in-out var(--float-delay) infinite;
}

.bubble.popped {
  border: 2px dashed var(--dashed);
  background: transparent;
  color: var(--faint);
  box-shadow: none;
  transform: scale(0.72);
  animation: bubble-ghost 360ms ease-out;
}

.shine {
  position: absolute;
  top: 14%;
  left: 20%;
  width: 22%;
  height: 14%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  transform: rotate(-30deg);
}

.name {
  font-family: var(--font-display);
  font-size: 15px;
  line-height: 1.2;
  text-align: center;
  overflow-wrap: anywhere;
}

.big .name {
  font-size: 17px;
}

.sub {
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.ring {
  position: absolute;
  inset: 0;
  border: 3px solid var(--c-deep);
  border-radius: 50%;
  pointer-events: none;
  animation: bubble-burst 520ms ease-out forwards;
}

.drop {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: var(--c-deep);
  pointer-events: none;
  animation: bubble-drop 520ms ease-out forwards;
}

@keyframes bubble-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}

@keyframes bubble-ghost {
  0% {
    transform: scale(1.15);
    opacity: 0;
  }
  100% {
    transform: scale(0.72);
    opacity: 1;
  }
}

@keyframes bubble-burst {
  0% {
    transform: scale(0.6);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes bubble-drop {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--dx), var(--dy)) scale(0.3);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bubble,
  .ring,
  .drop {
    animation: none;
  }
}
</style>
