<script setup lang="ts">
import { computed } from "vue";
import {
  AlertFilled,
  CheckSquareFilled,
  SafetyCertificateFilled,
} from "@ant-design/icons-vue";
import type { Component } from "vue";
import { formatThousands } from "@/utils/format";
import type { DashboardProjects } from "@/views/executive-dashboard/types";

import ProjectProgressChart from "./ProjectProgressChart.vue";
import ProjectStatusChart from "./ProjectStatusChart.vue";

const props = defineProps<{ data: DashboardProjects | null }>();
type Key = "normal" | "attention" | "risk";
const health: { key: Key; icon: Component }[] = [
  { key: "normal", icon: SafetyCertificateFilled },
  { key: "attention", icon: CheckSquareFilled },
  { key: "risk", icon: AlertFilled },
];
/** 保持健康度卡片顺序，并在接口未返回时显示占位而非零。 */
const displayedHealth = computed(() =>
  health.map((item) => ({
    ...item,
    label: `executiveDashboard.projectOverview.health.${item.key}`,
    valueDisplay: formatThousands(props.data?.[item.key], 0),
  })),
);
/** 数据未返回时传入空集合，图表自行展示空状态。 */
const statuses = computed(() => props.data?.statuses ?? []);
/** 进度分桶只使用接口结果，不补造前端固定区间。 */
const progress = computed(() => props.data?.progress ?? []);
</script>
<template>
  <section class="executive-project-overview">
    <div class="epo-heading">
      <h2>{{ $t("executiveDashboard.projectOverview.title") }}</h2>
      <span>{{ $t("executiveDashboard.projectOverview.subtitle") }}</span>
    </div>
    <div class="epo-card">
      <h3>{{ $t("executiveDashboard.projectOverview.healthTitle") }}</h3>
      <div class="epo-health">
        <div
          v-for="(item, index) in displayedHealth"
          :key="item.key"
          class="epo-metric"
          :class="{ 'epo-metric--divided': index > 0 }"
        >
          <div class="epo-icon"><component :is="item.icon" /></div>
          <div>
            <div class="epo-label">
              {{ $t(item.label) }}
            </div>
            <div class="epo-value">{{ item.valueDisplay }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="epo-grid">
      <ProjectStatusChart class="epo-card" :items="statuses" />
      <ProjectProgressChart class="epo-card" :items="progress" />
    </div>
  </section>
</template>
<style scoped lang="less">
.executive-project-overview {
  padding: 22px 24px 24px;
}
.epo-heading {
  display: flex;
  gap: 14px;
  align-items: baseline;
  margin-bottom: 18px;
}
.epo-heading h2 {
  margin: 0;
  color: var(--dm-text);
  font-size: 20px;
}
.epo-heading span,
.epo-label {
  color: var(--dm-text-2);
  font-size: 12px;
}
.epo-card {
  padding: 22px 24px;
  border-radius: 6px;
  background: var(--dm-bg-container);
}
.epo-card h3 {
  margin: 0 0 24px;
  color: var(--dm-text);
  font-size: 16px;
}
.epo-health {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 42px 0;
}
.epo-metric {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}
.epo-metric--divided {
  border-left: 1px solid var(--dm-border-2);
}
.epo-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  color: #1677ff;
  background: #edf5ff;
  font-size: 20px;
}
.epo-label {
  color: var(--dm-text-1);
  margin-bottom: 10px;
}
.epo-value {
  color: var(--dm-text);
  font-size: 24px;
}
.epo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 20px;
}
@media (max-width: 900px) {
  .epo-grid {
    grid-template-columns: 1fr;
  }
  .epo-health {
    gap: 20px;
  }
  .epo-metric--divided {
    border-left: 0;
  }
}
</style>
