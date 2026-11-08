<script setup lang="ts">
import { computed } from "vue";
import {
  ClockCircleFilled,
  TrophyFilled,
  UserOutlined,
} from "@ant-design/icons-vue";
import type { Component } from "vue";
import { DEFAULT_EMPTY_TEXT } from "@/constants/format";
import { useUserStore } from "@/stores/user";
import { formatAutoUnit, formatPercent } from "@/utils/format";
import type {
  DashboardProduction,
  DashboardTrendPoint,
  TrendPeriod,
} from "@/views/executive-dashboard/types";
import ProductionTrendChart from "./ProductionTrendChart.vue";

const props = defineProps<{
  data: DashboardProduction | null;
  trend: DashboardTrendPoint[];
  trendPeriod: TrendPeriod;
  trendLoading: boolean;
  trendError: string;
}>();
const emit = defineEmits<{ "update:trendPeriod": [value: TrendPeriod] }>();
const userStore = useUserStore();

type MetricKey = "manualSavingRate" | "cycleReductionRate" | "modelTargetRate";
type Metric = {
  key: MetricKey;
  icon: Component;
};
const metrics: Metric[] = [
  { key: "manualSavingRate", icon: UserOutlined },
  { key: "cycleReductionRate", icon: ClockCircleFilled },
  { key: "modelTargetRate", icon: TrophyFilled },
];
/** 指定演示账号固定展示 SALT 比例，不跟随接口实时值。 */
const STATIC_SALT_USER_IDS = new Set([98, 99, 6]);
const STATIC_SALT_RATES: Record<MetricKey, string> = {
  manualSavingRate: "85.3%",
  cycleReductionRate: "73.2%",
  modelTargetRate: "88.7%",
};

/** SALT 比例直接展示后端百分比字符串，保留精度和业务口径。 */
const items = computed(() => {
  const useStaticRates = STATIC_SALT_USER_IDS.has(userStore.user?.id ?? -1);
  return metrics.map((metric) => ({
    ...metric,
    label: `executiveDashboard.dataOverview.metrics.${metric.key}`,
    displayValue: useStaticRates
      ? STATIC_SALT_RATES[metric.key]
      : (props.data?.[metric.key] ?? DEFAULT_EMPTY_TEXT),
  }));
});

/** 来源占比只以人工和模型标注框总量为分母，不与样本量或待完成量混算。 */
const composition = computed(() => {
  const manual = props.data?.manual;
  const model = props.data?.model;
  const total = manual == null || model == null ? null : manual + model;
  // 总量缺失或为零时无法定义来源比例，仅保留数量与占位。
  const manualRatio =
    total != null && total > 0 && manual != null ? manual / total : null;
  const modelRatio =
    total != null && total > 0 && model != null ? model / total : null;
  return {
    manualDisplay: formatAutoUnit(manual, 0),
    modelDisplay: formatAutoUnit(model, 0),
    totalDisplay: formatAutoUnit(total, 0),
    manualShareDisplay: formatPercent(manualRatio, 1),
    modelShareDisplay: formatPercent(modelRatio, 1),
    manualStyle: { width: `${(manualRatio ?? 0) * 100}%` },
    modelStyle: { width: `${(modelRatio ?? 0) * 100}%` },
  };
});

/** 将趋势窗口变化交给页面请求，子组件不保存重复的筛选状态。 */
function handleTrendPeriodChange(value: TrendPeriod) {
  emit("update:trendPeriod", value);
}
</script>

<template>
  <section
    class="executive-data-overview"
    aria-labelledby="data-overview-title"
  >
    <div class="edo-heading">
      <h2 id="data-overview-title">
        {{ $t("executiveDashboard.dataOverview.title") }}
      </h2>
      <span>{{ $t("executiveDashboard.dataOverview.subtitle") }}</span>
    </div>
    <div class="edo-salt edo-card">
      <h3>{{ $t("executiveDashboard.dataOverview.saltTitle") }}</h3>
      <div class="edo-metrics">
        <div
          v-for="(item, index) in items"
          :key="item.key"
          class="edo-metric"
          :class="{ 'edo-metric--divided': index > 0 }"
        >
          <div class="edo-icon"><component :is="item.icon" /></div>
          <div>
            <div class="edo-label">{{ $t(item.label) }}</div>
            <div class="edo-value">{{ item.displayValue }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="edo-grid">
      <div class="edo-card edo-composition">
        <div class="edo-composition-head">
          <h3>{{ $t("executiveDashboard.dataOverview.composition.title") }}</h3>
          <span>{{
            $t("executiveDashboard.dataOverview.composition.subtitle")
          }}</span>
        </div>
        <div class="edo-composition-values">
          <div>
            <strong>{{ composition.manualDisplay }}</strong>
            <span>{{
              $t("executiveDashboard.dataOverview.composition.manual")
            }}</span>
          </div>
          <div>
            <strong>{{ composition.modelDisplay }}</strong>
            <span>{{
              $t("executiveDashboard.dataOverview.composition.model")
            }}</span>
          </div>
        </div>
        <div class="edo-progress-label">
          <span>{{
            $t("executiveDashboard.dataOverview.composition.progress")
          }}</span>
          <span>{{ composition.totalDisplay }}</span>
        </div>
        <div class="edo-progress">
          <i :style="composition.manualStyle" />
          <i :style="composition.modelStyle" />
        </div>
        <div class="edo-progress-legend">
          <span>
            {{ $t("executiveDashboard.dataOverview.composition.manualShare") }}
            {{ composition.manualShareDisplay }}
          </span>
          <span>
            {{ $t("executiveDashboard.dataOverview.composition.modelShare") }}
            {{ composition.modelShareDisplay }}
          </span>
        </div>
      </div>
      <ProductionTrendChart
        class="edo-card"
        :points="trend"
        :period="trendPeriod"
        :loading="trendLoading"
        :error="trendError"
        @update:period="handleTrendPeriodChange"
      />
    </div>
  </section>
</template>

<style scoped lang="less">
.executive-data-overview {
  padding: 22px 24px 24px;
}
.edo-heading {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 18px;
}
.edo-heading h2 {
  margin: 0;
  color: var(--dm-text);
  font-size: 20px;
}
.edo-heading span,
.edo-label,
.edo-composition-values span,
.edo-progress-label,
.edo-progress-legend {
  color: var(--dm-text-2);
  font-size: 12px;
}
.edo-card {
  padding: 22px 24px;
  border-radius: 6px;
  background: var(--dm-bg-container);
}
.edo-card h3 {
  margin: 0 0 24px;
  color: var(--dm-text);
  font-size: 16px;
}
.edo-composition-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.edo-composition-head h3 {
  margin-bottom: 0;
}
.edo-composition-head span {
  color: var(--dm-text-2);
  font-size: 12px;
}
.edo-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 42px 0;
}
.edo-metric {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}
.edo-metric--divided {
  border-left: 1px solid var(--dm-border-2);
}
.edo-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  color: #1677ff;
  background: #edf5ff;
  font-size: 20px;
}
.edo-label {
  margin-bottom: 10px;
  color: var(--dm-text-1);
}
.edo-value {
  color: var(--dm-text);
  font-size: 24px;
}
.edo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 20px;
}
.edo-composition-values {
  display: flex;
  justify-content: space-between;
  margin: 70px 0 28px;
}
.edo-composition-values div {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.edo-composition-values strong {
  color: var(--dm-text);
  font-size: 24px;
}
.edo-progress-label,
.edo-progress-legend {
  display: flex;
  justify-content: space-between;
}
.edo-progress {
  display: flex;
  height: 16px;
  margin: 12px 0;
  overflow: hidden;
  border-radius: 3px;
  background: #d9e2ef;
}
.edo-progress i {
  display: block;
  background: #1677ff;
}
.edo-progress i + i {
  background: #2dbb83;
}
@media (max-width: 900px) {
  .edo-grid {
    grid-template-columns: 1fr;
  }
  .edo-metrics {
    gap: 20px;
  }
  .edo-metric--divided {
    border-left: 0;
  }
}
</style>
