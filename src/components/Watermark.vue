<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

defineOptions({ name: "Watermark" });

interface WatermarkProps {
  text?: string;
}

withDefaults(defineProps<WatermarkProps>(), {
  text: "顺昌高质量数据生产平台",
});

/** 水印文字本身的占位尺寸，固定不变。 */
const TEXT_WIDTH = 300;
const TEXT_HEIGHT = 100;

/**
 * 每个水印模块（文字 + 周边留白）的目标间距，随容器大小在上下限间线性插值：
 * 小屏取下限保证不挤，大屏趋近上限保证不稀疏。
 */
const PITCH = {
  width: { min: 360, max: 460 },
  height: { min: 160, max: 360 },
};

/** 间距插值的基准：小于小屏尺寸取下限，大于大屏尺寸取上限。 */
const BASE = { width: { small: 1280, large: 1920 }, height: { small: 720, large: 1080 } };

/** 线性插值并将结果限制在 [min, max]。 */
function interpolatePitch(
  size: number,
  base: { small: number; large: number },
  pitch: { min: number; max: number },
): number {
  const ratio = (size - base.small) / (base.large - base.small);
  const t = Math.min(1, Math.max(0, ratio));
  return pitch.min + (pitch.max - pitch.min) * t;
}

const rootRef = ref<HTMLElement | null>(null);
const rootSize = ref({ width: 0, height: 0 });

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (!rootRef.value) return;
  resizeObserver = new ResizeObserver(([entry]) => {
    rootSize.value = {
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    };
  });
  resizeObserver.observe(rootRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

/** 按目标间距估算行列数，同时保证每格至少容得下文字（留白不为负、不重叠）。 */
const gridColumns = computed(() => {
  const byPitch = Math.round(
    rootSize.value.width /
      interpolatePitch(rootSize.value.width, BASE.width, PITCH.width),
  );
  const byText = Math.floor(rootSize.value.width / TEXT_WIDTH);
  return Math.max(1, Math.min(byPitch, Math.max(1, byText)));
});
const gridRows = computed(() => {
  const byPitch = Math.round(
    rootSize.value.height /
      interpolatePitch(rootSize.value.height, BASE.height, PITCH.height),
  );
  const byText = Math.floor(rootSize.value.height / TEXT_HEIGHT);
  return Math.max(1, Math.min(byPitch, Math.max(1, byText)));
});

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${gridColumns.value}, 1fr)`,
  gridTemplateRows: `repeat(${gridRows.value}, 1fr)`,
}));

const watermarkItems = computed(() =>
  Array.from(
    { length: gridColumns.value * gridRows.value },
    (_, index) => index,
  ),
);
</script>

<template>
  <div ref="rootRef" class="dm-watermark" :style="gridStyle" aria-hidden="true">
    <span v-for="item in watermarkItems" :key="item" class="dm-watermark-item">
      {{ text }}
    </span>
  </div>
</template>

<style scoped>
.dm-watermark {
  position: absolute;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  overflow: hidden;
  pointer-events: none;
}

.dm-watermark-item {
  color: var(--dm-text-color-secondary);
  white-space: nowrap;
  opacity: 0.12;
  transform: rotate(-22deg);
  transform-origin: center;
}
</style>
