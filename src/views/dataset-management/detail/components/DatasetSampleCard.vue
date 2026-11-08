<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import type { DatasetSample } from "@/api/dataset";
import { resolveSampleImageUrl } from "../utils";

const props = defineProps<{
  sample: DatasetSample;
  /** 样本在数据集内的全局编号，由页面按分页推导后传入。 */
  no: number;
}>();

const emit = defineEmits<{
  open: [sample: DatasetSample];
}>();

const { t } = useI18n();
/** 图片加载失败时切换为占位块，避免浏览器展示破图图标。 */
const imageFailed = ref(false);

const imageUrl = computed(() => resolveSampleImageUrl(props.sample.imagePath));
/** 地址为空或加载失败时都需要展示占位块。 */
const showPlaceholder = computed(() => !imageUrl.value || imageFailed.value);
/** 内容区按产品规则仅展示分页推导的样本编号。 */
const label = computed(() =>
  t("datasetManagement.detail.sampleNo", { no: props.no }),
);

/** 将有效图片交回页面，由详情页打开大尺寸预览。 */
function handleOpen(): void {
  // 空地址或加载失败的占位卡片没有可预览内容，点击时保持当前状态。
  if (showPlaceholder.value) return;
  emit("open", props.sample);
}
</script>

<template>
  <button type="button" class="dsc" :aria-label="label" @click="handleOpen">
    <div class="dsc-thumb">
      <img
        v-if="!showPlaceholder"
        class="dsc-thumb__image"
        :src="imageUrl"
        alt=""
        @error="imageFailed = true"
      />
      <div v-else class="dsc-thumb__placeholder font-sm">
        {{ t("datasetManagement.detail.thumbnailEmpty") }}
      </div>
    </div>
    <div class="dsc-body">
      <span class="dsc-body__label font-base">{{ label }}</span>
    </div>
  </button>
</template>

<style scoped lang="less">
.dsc {
  display: block;
  width: 100%;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: start;
}

/* 缩略图固定 16:9；图片居中不裁切，比例不符时露出浅灰底色。 */
.dsc-thumb {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  overflow: hidden;
  /* 静止态留白底色略深于内容区，形成上下两段式分层。 */
  background: var(--dm-fill-4);
}

.dsc-thumb__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.dsc-thumb__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dm-text-3);
}

.dsc-body {
  padding: 8px 12px;
  background: var(--dm-fill-3);
}

/* 悬停/聚焦时整块转为蓝底：背景由外层网格项提供，卡片自身置空透出。 */
.dsc:hover .dsc-thumb,
.dsc:focus-visible .dsc-thumb,
.dsc:hover .dsc-body,
.dsc:focus-visible .dsc-body {
  background: transparent;
}

.dsc:hover .dsc-body__label,
.dsc:focus-visible .dsc-body__label,
.dsc:hover .dsc-thumb__placeholder,
.dsc:focus-visible .dsc-thumb__placeholder {
  color: #fff;
}

/* 焦点态由外层的蓝色底块表达，不再叠加浏览器默认轮廓。 */
.dsc:focus-visible {
  outline: none;
}

.dsc-body__label {
  display: block;
  overflow: hidden;
  color: var(--dm-text-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
