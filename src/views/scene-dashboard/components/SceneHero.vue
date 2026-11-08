<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons-vue";
import type { SceneDefinition } from "../types";

const props = defineProps<{ scenes: readonly SceneDefinition[] }>();
const emit = defineEmits<{
  (event: "select-scene", scene: SceneDefinition): void;
}>();
const { t } = useI18n();

/** 将未开放场景交给页面统一处理。 */
function handleSceneSelect(scene: SceneDefinition): void {
  emit("select-scene", scene);
}
</script>

<template>
  <section
    v-if="props.scenes.length"
    class="scene-hero"
    :aria-label="t('sceneDashboard.hero.ariaLabel')"
  >
    <a-carousel autoplay arrows dots>
      <div
        v-for="scene in props.scenes"
        :key="scene.key"
        class="scene-hero__slide"
      >
        <img class="scene-hero__image" :src="scene.image" alt="" />
        <div class="scene-hero__content">
          <div class="scene-hero__panel">
            <span class="sh__subtitle">{{ scene.kicker }}</span>
            <h1 class="sh__title">{{ scene.title }}</h1>
            <p class="sh__content">{{ scene.description }}</p>
            <a-button
              class="sh__scene_btn"
              type="primary"
              @click="handleSceneSelect(scene)"
            >
              {{
                t(
                  scene.status === "coming-soon"
                    ? "sceneDashboard.actions.comingSoon"
                    : "sceneDashboard.actions.enterScene",
                )
              }}
            </a-button>
          </div>
        </div>
      </div>
      <template #prevArrow>
        <a-tooltip :title="t('sceneDashboard.hero.previous')">
          <button
            type="button"
            class="scene-hero__carousel-button"
            style="left: 24px"
            :aria-label="t('sceneDashboard.hero.previous')"
          >
            <ArrowLeftOutlined />
          </button>
        </a-tooltip>
      </template>
      <template #nextArrow>
        <a-tooltip :title="t('sceneDashboard.hero.next')">
          <button
            type="button"
            class="scene-hero__carousel-button"
            style="right: 24px"
            :aria-label="t('sceneDashboard.hero.next')"
          >
            <ArrowRightOutlined />
          </button>
        </a-tooltip>
      </template>
    </a-carousel>
  </section>
</template>

<style scoped>
.scene-hero {
  position: relative;
  overflow: hidden;
  min-height: 520px;
}
.scene-hero__slide,
.scene-hero__image {
  width: 100%;
  height: 100%;
}
.scene-hero__slide {
  position: relative;
  min-height: 520px;
}
.scene-hero__image {
  position: absolute;
  inset: 0;
  object-fit: cover;
}
.scene-hero__content {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.scene-hero__panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: min(760px, calc(100% - 180px));
  margin-left: 120px;
}
.scene-hero__panel .sh__subtitle {
  font-size: 12px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 24px;
}
.scene-hero__panel .sh__title {
  margin: 0 0 16px;
  color: #fff;
  font-size: 48px;
  line-height: 1.2;
  text-align: left;
  margin-left: -5px;
}
.scene-hero__panel .sh__content {
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 16px;
  line-height: 1.5;
  text-align: left;
}
.scene-hero__panel .sh__scene_btn {
  margin-top: 40px;
  line-height: 1;
}
.scene-hero__carousel-button {
  position: absolute;
  top: 50%;
  z-index: 4;
  border-radius: 50%;
  padding: 0;
  transform: translateY(-50%);
  transition: opacity 0.16s ease;
  color: #fff;
  width: 44px;
  min-width: 44px;
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
