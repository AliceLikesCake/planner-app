<script setup lang="ts">
import { computed } from 'vue'
import { buildCake, type DessertId } from './desserts'
import type { CakeSegment } from './layers'

const props = defineProps<{
  dessert: DessertId
  /** Bottom to top, from computeLayers(). */
  layers: CakeSegment[]
  allDone: boolean
  label: string
}>()

const view = computed(() => buildCake(props.dessert, props.layers, props.allDone))
</script>

<template>
  <div class="cake-stage" role="img" :aria-label="label">
    <div :key="dessert" class="cake" :class="{ celebrate: allDone && layers.length > 0 }">
      <div v-if="view.deco.length" :style="view.decoBox">
        <span v-for="(d, i) in view.deco" :key="i" :style="d" />
      </div>
      <div v-for="layer in view.layers" :key="layer.key" :style="layer.style">
        <span :style="layer.cream" />
      </div>
      <div v-for="(b, i) in view.base" :key="'base' + i" :style="b" />
      <div :style="view.plate" />
    </div>
  </div>
</template>

<style scoped>
/* The cake is the one place that gets gradients and shadows (SPEC 1). */
.cake-stage {
  width: 148px;
  height: 150px;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding-bottom: 4px;
  border-radius: 18px;
  background: radial-gradient(ellipse at 50% 85%, #fbf3e8 0%, #ffffff 70%);
}

.cake {
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: bottom center;
  scale: 0.56;
}

.cake.celebrate {
  animation: cake-celebrate 700ms ease-out forwards;
}

@keyframes cake-celebrate {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1.03);
  }
}
</style>

<style>
/* Referenced from inline styles built in desserts.ts, so these stay global. */
@keyframes cake-drop {
  0% {
    transform: translateY(-40px);
    opacity: 0;
  }
  70% {
    transform: translateY(3px);
    opacity: 1;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes cake-flicker {
  0%,
  100% {
    transform: scale(1) rotate(-3deg);
  }
  50% {
    transform: scale(0.85) rotate(3deg);
  }
}

@keyframes cake-fadein {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cake,
  .cake * {
    animation: none !important;
  }
}
</style>
