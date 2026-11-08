<script setup lang="ts">
import {
  FullscreenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons-vue";
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

defineOptions({ name: "ImagePreview" });

const props = withDefaults(
  defineProps<{
    open: boolean;
    imageUrl: string;
    width?: number | string;
    title?: string;
  }>(),
  { width: "min(68vw, 1200px)", title: undefined },
);

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const scale = ref(1);
const imageWrapRef = ref<HTMLDivElement>();
const imageRef = ref<HTMLImageElement>();
const offsetX = ref(0);
const offsetY = ref(0);
const dragging = ref(false);
let dragPointerId: number | null = null;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
const SCALE_STEP = 0.25;
const SCALE_MIN = 0.5;
const SCALE_MAX = 3;
const maskStyle = { backgroundColor: "rgba(9, 30, 66, 0.64)" };

/** 未传业务标题时使用公共图片预览文案。 */
const dialogTitle = computed(
  () => props.title || t("components.imagePreview.title"),
);

/** 图片通过视觉缩放和位移展示，固定预览区域不会随操作改变高度。 */
const imageStyle = computed(() => ({
  transform: `translate3d(${offsetX.value}px, ${offsetY.value}px, 0) scale(${scale.value})`,
}));

/** 仅在图片放大后启用拖动手势和抓取光标。 */
const imageClass = computed(() => ({
  "ip-image--draggable": scale.value > 1,
  "ip-image--dragging": dragging.value,
}));

/** 缩放按钮的禁用状态由边界值统一计算。 */
const zoomOutDisabled = computed(() => scale.value <= SCALE_MIN);
const zoomInDisabled = computed(() => scale.value >= SCALE_MAX);

/** 将图片位移限制在当前缩放产生的有效溢出范围内。 */
function clampOffset(x: number, y: number): { x: number; y: number } {
  const wrap = imageWrapRef.value;
  const image = imageRef.value;
  // 图片尚未加载时没有可计算的显示尺寸，保持居中即可。
  if (!wrap || !image || scale.value <= 1) return { x: 0, y: 0 };

  const maxX = Math.max(
    0,
    (image.clientWidth * scale.value - wrap.clientWidth) / 2,
  );
  const maxY = Math.max(
    0,
    (image.clientHeight * scale.value - wrap.clientHeight) / 2,
  );
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

/** 重置拖动状态并让图片回到预览区域中央。 */
function resetPosition(): void {
  dragging.value = false;
  dragPointerId = null;
  offsetX.value = 0;
  offsetY.value = 0;
}

/** 缩放变化后收紧已有位移，避免图片边缘被拖出有效查看范围。 */
async function constrainPosition(): Promise<void> {
  await nextTick();
  const nextOffset = clampOffset(offsetX.value, offsetY.value);
  offsetX.value = nextOffset.x;
  offsetY.value = nextOffset.y;
}

/** 将图片缩小一级，最低保留 50% 以避免图片完全不可见。 */
function handleZoomOut(): void {
  scale.value = Math.max(SCALE_MIN, scale.value - SCALE_STEP);
  // 回到原始尺寸及以下时不再存在可拖动的溢出区域。
  if (scale.value <= 1) resetPosition();
  else void constrainPosition();
}

/** 将图片放大一级，最高限制为 300% 以避免过度占用渲染资源。 */
function handleZoomIn(): void {
  scale.value = Math.min(SCALE_MAX, scale.value + SCALE_STEP);
}

/** 恢复图片为适应预览窗口的 100% 缩放状态。 */
function handleFit(): void {
  scale.value = 1;
  resetPosition();
}

/** 在放大状态按住图片时记录拖动起点，并捕获指针保证移出图片后仍可继续。 */
function handlePointerDown(event: PointerEvent): void {
  if (scale.value <= 1 || event.button !== 0) return;
  dragging.value = true;
  dragPointerId = event.pointerId;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragOriginX = offsetX.value;
  dragOriginY = offsetY.value;
  imageRef.value?.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

/** 根据指针移动距离更新图片位置，并限制在有效溢出区域内。 */
function handlePointerMove(event: PointerEvent): void {
  if (!dragging.value || dragPointerId !== event.pointerId) return;
  const nextOffset = clampOffset(
    dragOriginX + event.clientX - dragStartX,
    dragOriginY + event.clientY - dragStartY,
  );
  offsetX.value = nextOffset.x;
  offsetY.value = nextOffset.y;
  event.preventDefault();
}

/** 松开或取消当前指针时结束拖动，但保留用户查看到的位置。 */
function handlePointerUp(event: PointerEvent): void {
  if (dragPointerId !== event.pointerId) return;
  imageRef.value?.releasePointerCapture?.(event.pointerId);
  dragging.value = false;
  dragPointerId = null;
}

/** 关闭弹窗的具体状态由调用方统一维护。 */
function handleClose(): void {
  emit("close");
}

watch(
  () => props.open,
  (open) => {
    // 每次重新打开都从适应窗口状态开始，避免沿用上一次的缩放比例。
    if (open) {
      scale.value = 1;
      resetPosition();
    }
  },
);

watch(
  () => props.imageUrl,
  () => {
    // 切换图片时不能沿用上一张图片的缩放位置。
    scale.value = 1;
    resetPosition();
  },
);
</script>

<template>
  <a-modal
    :open="open"
    :width="width"
    :title="dialogTitle"
    :footer="null"
    :mask-style="maskStyle"
    centered
    @cancel="handleClose"
  >
    <div class="image-preview">
      <div class="ip-stage">
        <div v-if="imageUrl" ref="imageWrapRef" class="ip-image-wrap">
          <img
            ref="imageRef"
            class="ip-image"
            :class="imageClass"
            :style="imageStyle"
            :src="imageUrl"
            :alt="dialogTitle"
            :draggable="false"
            @pointerdown="handlePointerDown"
            @pointermove="handlePointerMove"
            @pointerup="handlePointerUp"
            @pointercancel="handlePointerUp"
          />
          <div class="ip-toolbar">
            <a-button
              type="text"
              class="ip-action"
              :aria-label="t('components.imagePreview.zoomIn')"
              :title="t('components.imagePreview.zoomIn')"
              :disabled="zoomInDisabled"
              @click="handleZoomIn"
            >
              <ZoomInOutlined />
            </a-button>
            <a-button
              type="text"
              class="ip-action"
              :aria-label="t('components.imagePreview.zoomOut')"
              :title="t('components.imagePreview.zoomOut')"
              :disabled="zoomOutDisabled"
              @click="handleZoomOut"
            >
              <ZoomOutOutlined />
            </a-button>
            <a-button
              type="text"
              class="ip-action"
              :aria-label="t('components.imagePreview.fit')"
              :title="t('components.imagePreview.fit')"
              @click="handleFit"
            >
              <FullscreenOutlined />
            </a-button>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped lang="less">
.image-preview {
  width: 100%;
}

/* 初始高度随图片比例自适应；缩放仅使用 transform，不会改变弹窗高度。 */
.ip-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-height: min(calc(100vh - 220px), 760px);
  overflow: hidden;
  background: transparent;
}

.ip-image-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
}

.ip-image {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: clamp(240px, calc(100vh - 220px), 760px);
  object-fit: contain;
  transform-origin: center;
  transition: transform 0.2s ease;
  user-select: none;
  -webkit-user-drag: none;
  touch-action: none;
}

.ip-image--draggable {
  cursor: grab;
}

.ip-image--dragging {
  cursor: grabbing;
  transition: none;
}

.ip-toolbar {
  position: absolute;
  z-index: 1;
  bottom: clamp(12px, 2vh, 24px);
  left: 50%;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(9, 30, 66, 0.78);
  transform: translateX(-50%);
}

.ip-action {
  width: 32px;
  height: 32px;
  padding: 0;
  color: #fff;
}

.ip-action:hover,
.ip-action:focus-visible {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.16) !important;
}

.ip-action:disabled {
  color: rgba(255, 255, 255, 0.4) !important;
}
</style>
