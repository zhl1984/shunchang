<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LockOutlined,
} from "@ant-design/icons-vue";
import type { SceneDefinition } from "../types";

defineProps<{ scenes: readonly SceneDefinition[] }>();
const emit = defineEmits<{
  (event: "select-scene", scene: SceneDefinition): void;
}>();
const { t } = useI18n();
const rail = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
// 单次切换距离由卡片宽度 282px 与卡片间距 24px 组成。
const SCENE_CARD_STEP = 282 + 24;

/** 根据横向滚动位置计算左右是否仍有可滚动内容。 */
function handleRailScroll(): void {
  const element = rail.value;
  if (!element) return;
  canScrollLeft.value = element.scrollLeft > 1;
  canScrollRight.value =
    element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
}

/** 按单张卡片宽度加间距平滑切换横向滚动位置。 */
function handleRailSwitch(direction: -1 | 1): void {
  rail.value?.scrollBy({
    // 滚动容器初始左右各有 24px padding，需要将初始偏移计入滚动距离。
    left: 24 + direction * SCENE_CARD_STEP,
    behavior: "smooth",
  });
}

/** 统一处理鼠标和键盘触发的场景选择。 */
function handleSceneSelect(scene: SceneDefinition): void {
  emit("select-scene", scene);
}

onMounted(() => {
  nextTick(handleRailScroll);
  window.addEventListener("resize", handleRailScroll);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleRailScroll);
});
</script>

<template>
  <section class="scene-card-rail-wrapper">
    <a-tooltip
      v-if="canScrollLeft"
      :title="t('sceneDashboard.scenes.previous')"
    >
      <a-button
        class="scene-card-rail__switch-button"
        style="left: 8px"
        type="text"
        :aria-label="t('sceneDashboard.scenes.previous')"
        @click="handleRailSwitch(-1)"
      >
        <ArrowLeftOutlined />
      </a-button>
    </a-tooltip>
    <div
      ref="rail"
      class="scene-card-rail"
      :aria-label="t('sceneDashboard.scenes.ariaLabel')"
      @scroll="handleRailScroll"
    >
      <a-card
        v-for="scene in scenes"
        :key="scene.key"
        class="scene-card-rail__card"
        role="button"
        tabindex="0"
        :aria-label="scene.title"
        @click="handleSceneSelect(scene)"
        @keydown.enter.prevent="handleSceneSelect(scene)"
        @keydown.space.prevent="handleSceneSelect(scene)"
      >
        <img
          class="scene-card-rail__image"
          :src="scene.image"
          :alt="t('sceneDashboard.scenes.imageAlt', { title: scene.title })"
        />
        <div class="scene-card-rail__overlay">
          <div class="scene-card-rail__header">
            <span class="scene-card-kicker">{{ scene.kicker }}</span>
            <LockOutlined
              v-if="scene.status === 'coming-soon'"
              class="scene-card-rail__lock"
              :aria-label="t('sceneDashboard.scenes.comingSoon')"
            />
          </div>
          <div class="scene-card-rail__text">
            <h3 class="scene-card-rail__title">{{ scene.title }}</h3>
            <p class="scene-card-rail__description">{{ scene.description }}</p>
          </div>
          <span
            v-if="scene.status === 'coming-soon'"
            class="scene-card-rail__status"
          >
            {{ t("sceneDashboard.scenes.comingSoon") }}
          </span>
        </div>
      </a-card>
    </div>
    <a-tooltip v-if="canScrollRight" :title="t('sceneDashboard.scenes.next')">
      <a-button
        class="scene-card-rail__switch-button"
        style="right: 8px"
        type="text"
        :aria-label="t('sceneDashboard.scenes.next')"
        @click="handleRailSwitch(1)"
      >
        <ArrowRightOutlined />
      </a-button>
    </a-tooltip>
  </section>
</template>

<style scoped>
.scene-card-rail-wrapper {
  position: relative;
}
.scene-card-rail {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  height: 424px;
  min-height: 424px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
  gap: 24px;
  scroll-behavior: smooth;
  padding: 24px;
  scrollbar-width: none;
}
.scene-card-rail::-webkit-scrollbar {
  display: none;
}
.scene-card-rail__card {
  position: relative;
  width: 282px;
  min-width: 282px;
  flex: 0 0 282px;
  height: 400px;
  min-height: 400px;
  overflow: hidden;
  border: 0;
  border-radius: 5px;
  background: #13233d;
  box-shadow: none;
  cursor: pointer;
  isolation: isolate;
  transition: box-shadow 0.18s ease;
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgba(10, 27, 57, 0),
      rgba(10, 27, 57, 1)
    );
    transition: background-color 0.26s ease;
  }
}
.scene-card-rail__card:hover::before {
  background: rgba(10, 27, 57, 0.86);
}
.scene-card-rail__card :deep(.ant-card-body) {
  height: 100%;
  padding: 0;
}
.scene-card-rail__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.scene-card-rail__card:hover .scene-card-rail__image {
  transform: scale(1.04);
}
.scene-card-rail__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 18px;
  color: #fff;
  z-index: 2;
  background: transparent;
  isolation: auto;
  &:hover {
    box-shadow: 0 12px 24px rgba(18, 39, 67, 0.19);
  }
}
.scene-card-rail__header {
  display: flex;
  align-items: center;
}
.scene-card-kicker {
  flex: 1;
  font-size: 12px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.68);
}
.scene-card-rail__lock {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.84);
  background: rgba(8, 20, 38, 0.44);
  border-radius: 4px;
}
.scene-card-rail__overlay .scene-card-rail__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #fff;
}
.scene-card-rail__overlay .scene-card-rail__description {
  font-size: 13px;
  font-weight: 400;
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  line-height: 18px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.scene-card-rail__overlay .scene-card-rail__text {
  position: absolute;
  top: calc(100% - 142px);
  right: 18px;
  left: 18px;
  z-index: 1;
  transition: top 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.scene-card-rail__overlay:hover .scene-card-rail__text {
  top: 54px;
}
.scene-card-rail__status {
  font-size: 12px;
  font-weight: bold;
  position: absolute;
  bottom: 18px;
  left: 18px;
  z-index: 1;
  color: rgba(255, 255, 255, 0.48);
}
.scene-card-rail__switch-button {
  position: absolute;
  top: 50%;
  z-index: 4;
  border-radius: 50%;
  padding: 0;
  transform: translateY(-50%);
  transition: opacity 0.16s ease;
  color: #fff;
  width: 44px;
  height: 44px;
  font-size: 16px;
  background: rgba(10, 27, 57, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(3px);
  &:hover {
    color: #fff;
  }
  &::before {
    content: "";
  }
}
</style>
