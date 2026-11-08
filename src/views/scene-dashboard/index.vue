<script setup lang="ts">
import { message } from "ant-design-vue";
import { useRouter } from "vue-router";
import {
  ApiOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  EyeOutlined,
  FormOutlined,
  PictureOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";
import SceneHero from "./components/SceneHero.vue";
import SceneCardRail from "./components/SceneCardRail.vue";
import CapabilityGrid from "./components/CapabilityGrid.vue";
import { industryScenes, professionalCapabilities } from "./scenes";
import type { CapabilityIconMap, SceneDefinition } from "./types";

const { t } = useI18n();
const router = useRouter();
const icons: CapabilityIconMap = {
  fusion: ApiOutlined,
  cube: DeploymentUnitOutlined,
  timeline: ClockCircleOutlined,
  vision: EyeOutlined,
  multimodal: PictureOutlined,
  instruction: FormOutlined,
  alignment: SafetyCertificateOutlined,
  agent: RobotOutlined,
  expert: TeamOutlined,
  collaboration: SyncOutlined,
  mining: DatabaseOutlined,
  benchmark: TrophyOutlined,
};
const featuredScenes = industryScenes.filter((scene) =>
  ["autonomous-driving", "medical-imaging"].includes(scene.key),
);
const incomingScenes = industryScenes.filter(
  (scene) => !featuredScenes.some((featured) => featured.key === scene.key),
);

/** 处理场景进入操作，未开放场景只显示提示。 */
function handleSceneSelect(scene: SceneDefinition): void {
  if (scene.status === "coming-soon") {
    message.warning(
      t("sceneDashboard.messages.sceneComingSoon", { title: scene.title }),
    );
    return;
  }
  void router.push({ name: "scenario-config" });
}
</script>

<template>
  <main class="scene-dashboard-page">
    <SceneHero :scenes="featuredScenes" @select-scene="handleSceneSelect" />
    <SceneCardRail :scenes="incomingScenes" @select-scene="handleSceneSelect" />
    <CapabilityGrid :capabilities="professionalCapabilities" :icons="icons" />
  </main>
</template>

<style scoped>
.scene-dashboard-page {
  min-width: 1400px;
  display: flex;
  flex-direction: column;
  padding-bottom: 72px;
  overflow: auto;
}
</style>
