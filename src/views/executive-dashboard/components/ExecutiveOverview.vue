<script setup lang="ts">
import { computed } from "vue";

import {
  CheckCircleFilled,
  DatabaseFilled,
  FileTextFilled,
  FundFilled,
  PlayCircleFilled,
} from "@ant-design/icons-vue";
import type { Component } from "vue";
import { DEFAULT_EMPTY_TEXT } from "@/constants/format";
import { formatAutoUnit, formatThousands } from "@/utils/format";
import type { DashboardOverview } from "@/views/executive-dashboard/types";

const props = defineProps<{ data: DashboardOverview | null }>();

type OverviewMetric = {
  key: keyof DashboardOverview;
  icon: Component;
};

const overviewMetrics: OverviewMetric[] = [
  { key: "projectTotal", icon: FundFilled },
  { key: "runningProjectTotal", icon: PlayCircleFilled },
  { key: "dataTotal", icon: DatabaseFilled },
  { key: "completedDataTotal", icon: CheckCircleFilled },
  { key: "completionRate", icon: CheckCircleFilled },
  { key: "modelLabelRate", icon: FileTextFilled },
];

/** 按指标口径格式化数量，百分比保留接口原值；未返回数据时显示占位。 */
function formatMetric(key: keyof DashboardOverview): string {
  // 后端百分比已包含单位，不能再次乘以 100。
  if (key === "completionRate" || key === "modelLabelRate") {
    return props.data?.[key] ?? DEFAULT_EMPTY_TEXT;
  }
  return key === "dataTotal" || key === "completedDataTotal"
    ? formatAutoUnit(props.data?.[key], 0)
    : formatThousands(props.data?.[key], 0);
}

/** 接口结果变化时更新展示字段，保持图标与指标顺序稳定。 */
const overviewItems = computed(() =>
  overviewMetrics.map((metric) => ({
    ...metric,
    label: `executiveDashboard.overview.${metric.key}`,
    displayValue: formatMetric(metric.key),
  })),
);
</script>

<template>
  <section class="executive-overview" aria-labelledby="overview-title">
    <div class="eo-heading">
      <h2 id="overview-title">{{ $t("executiveDashboard.overview.title") }}</h2>
      <span>{{ $t("executiveDashboard.overview.subtitle") }}</span>
    </div>
    <div class="eo-card">
      <div
        v-for="(item, index) in overviewItems"
        :key="item.key"
        class="eo-metric"
        :class="{ 'eo-metric--divided': index > 0 }"
      >
        <div class="eo-icon">
          <component :is="item.icon" />
        </div>
        <div>
          <div class="eo-label">{{ $t(item.label) }}</div>
          <div class="eo-value">{{ item.displayValue }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
.executive-overview {
  padding: 22px 24px 24px;
}
.eo-heading {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 18px;
}
.eo-heading h2 {
  margin: 0;
  color: var(--dm-text);
  font-size: 20px;
}
.eo-heading span {
  color: var(--dm-text-3);
  font-size: 12px;
}
.eo-card {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  padding: 56px 28px;
  border-radius: 6px;
  background: var(--dm-bg-container);
}
.eo-metric {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-width: 0;
}
.eo-metric--divided {
  border-left: 1px solid var(--dm-border-2);
}
.eo-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  color: #1677ff;
  background: #edf5ff;
  font-size: 20px;
}
.eo-label {
  margin-bottom: 12px;
  color: var(--dm-text-1);
  font-size: 12px;
}
.eo-value {
  color: var(--dm-text);
  font-size: 22px;
  line-height: 1;
}
@media (max-width: 900px) {
  .executive-overview__card {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
  .executive-overview__metric.is-divided {
    border-left: 0;
  }
}
</style>
