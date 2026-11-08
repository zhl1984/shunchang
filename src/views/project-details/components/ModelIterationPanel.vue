<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { graphic } from "echarts";
import type { EChartsOption } from "echarts";

import DmCharts from "@/components/Charts/index.vue";
import type { IterationStatus, ProjectIteration } from "@/api/project";

const props = defineProps<{ iterations: ProjectIteration[] }>();
const { t } = useI18n();
/** 迭代表格状态列文案，与后端 IterationStatus 枚举一一对应。 */
const statusLabels: Record<IterationStatus, string> = {
  NOT_STARTED: t("projectManagement.detail.modelIteration.status.notStarted"),
  SELECTING: t("projectManagement.detail.modelIteration.status.selecting"),
  PRE_LABELING: t("projectManagement.detail.modelIteration.status.preLabeling"),
  MANUAL_REVIEWING: t(
    "projectManagement.detail.modelIteration.status.manualReviewing",
  ),
  TRAINING: t("projectManagement.detail.modelIteration.status.training"),
  VERSION_CONFIRMING: t(
    "projectManagement.detail.modelIteration.status.versionConfirming",
  ),
  FULL_PRE_LABELING: t(
    "projectManagement.detail.modelIteration.status.fullPreLabeling",
  ),
  COMPLETED: t("projectManagement.detail.modelIteration.status.completed"),
  FAILED: t("projectManagement.detail.modelIteration.status.failed"),
};
const rows = computed(() =>
  [...props.iterations].sort((a, b) => a.roundNo - b.roundNo),
);
/** 汇总所有迭代的人工与模型标注数量，供预标注阶段构成图展示。 */
const annotationSummary = computed(() => {
  const manualCount = props.iterations.reduce(
    (total, item) => total + toChartValue(item.manualCount),
    0,
  );
  const modelCount = props.iterations.reduce(
    (total, item) => total + toChartValue(item.preLabelCount),
    0,
  );
  const total = manualCount + modelCount;
  return {
    manualCount,
    modelCount,
    manualPercent: total ? (manualCount / total) * 100 : 0,
    modelPercent: total ? (modelCount / total) * 100 : 0,
  };
});
/** 将后端可能为空或非法的数值转换为 ECharts 可插值的有限数字，避免 hover 动画报错。 */
function toChartValue(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
/** 准确率缺失时保留 null，配合折线 disconnect 避免把空值连成 0。 */
function toAccuracyPoint(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
/** 将占比格式化为紧凑的百分比文案，避免长小数破坏分段图布局。 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
const option = computed<EChartsOption>(() => ({
  // 图例文字高度约 18px，绘图区额外保留 4px 间距。
  grid: { left: 44, right: 48, top: 32, bottom: 28 },
  legend: {
    right: 42,
    itemWidth: 8,
    itemHeight: 8,
  },
  tooltip: {
    // 当前趋势图仅展示准确率，提示内容与图表中的唯一曲线保持一致。
    formatter: (params) => {
      const items = Array.isArray(params) ? params : [params];
      return items
        .map((item) => {
          const value = Array.isArray(item.value) ? item.value[1] : item.value;
          // 空准确率不拼接百分号，避免 tooltip 出现 null%。
          if (value == null || value === "-") {
            return `${item.marker ?? ""}${item.seriesName}: -`;
          }
          const suffix =
            item.seriesName ===
            t("projectManagement.detail.modelIteration.chart.accuracy")
              ? "%"
              : "";
          return `${item.marker ?? ""}${item.seriesName}: ${value}${suffix}`;
        })
        .join("<br/>");
    },
  },
  xAxis: {
    data: rows.value.map((item) =>
      t("projectManagement.detail.modelIteration.roundLabel", {
        round: item.roundNo,
      }),
    ),
    // 使用显式百分比控制两端留白，避免 boolean 模式产生过大的半类目间距。
    boundaryGap: ["2%", "2%"],
  },
  yAxis: {
    min: 0,
    max: 100,
    axisLabel: { color: "#bfbfbf", formatter: "{value}%" },
    nameTextStyle: { color: "var(--dm-text)", padding: [0, 0, 0, -8] },
  },
  series: [
    {
      type: "line",
      name: t("projectManagement.detail.modelIteration.chart.accuracy"),
      data: rows.value.map((item) => toAccuracyPoint(item.accuracy)),
      // 空点（含末尾 null）断开折线，避免与上一轮有效准确率相连。
      connectNulls: false,
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(47, 102, 216, 0.16)" },
          { offset: 1, color: "rgba(47, 102, 216, 0.02)" },
        ]),
      },
    },
  ],
}));
</script>
<template>
  <section class="model-iteration-panel">
    <header class="mip-header">
      <div class="mip-title-group">
        <strong class="mip-title font-xl">{{
          t("projectManagement.detail.modelIteration.title")
        }}</strong>
      </div>
    </header>
    <div class="mip-content">
      <div class="mip-top-row">
        <section class="mip-segment-card">
          <div class="mip-card-title font-md">
            {{ t("projectManagement.detail.modelIteration.segmentTitle") }}
          </div>
          <div class="mip-segment-summary">
            <div>
              <strong>{{ annotationSummary.manualCount }}</strong>
              <span>{{
                t("projectManagement.detail.modelIteration.chart.manual")
              }}</span>
            </div>
            <div>
              <strong>{{ annotationSummary.modelCount }}</strong>
              <span>{{
                t("projectManagement.detail.modelIteration.chart.preLabel")
              }}</span>
            </div>
          </div>
          <div class="mip-segment-bar">
            <div
              class="mip-segment mip-segment--manual"
              :style="{ width: `${annotationSummary.manualPercent}%` }"
            />
            <div
              class="mip-segment mip-segment--model"
              :style="{ width: `${annotationSummary.modelPercent}%` }"
            />
          </div>
          <div class="mip-segment-labels">
            <span>{{ formatPercent(annotationSummary.manualPercent) }}</span>
            <span>{{ formatPercent(annotationSummary.modelPercent) }}</span>
          </div>
        </section>
        <section class="mip-chart">
          <div class="mip-chart-title font-md">
            {{ t("projectManagement.detail.modelIteration.chartTitle") }}
          </div>
          <DmCharts class="mip-chart-canvas" :option="option" />
        </section>
      </div>
      <div class="mip-table">
        <div class="mip-row mip-head">
          <span>{{
            t("projectManagement.detail.modelIteration.table.round")
          }}</span
          ><span>{{
            t("projectManagement.detail.modelIteration.table.stage")
          }}</span
          ><span>{{
            t("projectManagement.detail.modelIteration.table.status")
          }}</span
          ><span>{{
            t("projectManagement.detail.modelIteration.table.accuracy")
          }}</span
          ><span>{{
            t("projectManagement.detail.modelIteration.table.delta")
          }}</span>
        </div>
        <div v-for="row in rows" :key="row.iterationId" class="mip-row">
          <strong>{{
            t("projectManagement.detail.modelIteration.roundLabel", {
              round: row.roundNo,
            })
          }}</strong
          ><span>{{
            t("projectManagement.detail.modelIteration.table.preLabelStage")
          }}</span
          ><span>{{ statusLabels[row.status] ?? row.status }}</span
          ><span>{{ row.accuracy == null ? "-" : `${row.accuracy}%` }}</span
          ><span>{{
            row.accuracyDelta == null ? "-" : `+${row.accuracyDelta}%`
          }}</span>
        </div>
        <!-- 无迭代数据时仍保留表头，空态只替换表体行。 -->
        <a-empty
          v-if="!rows.length"
          class="mip-empty font-base"
          :description="t('components.table.empty')"
        />
      </div>
    </div>
  </section>
</template>
<style scoped>
.model-iteration-panel {
  margin-top: 20px;
  border: 1px solid var(--dm-border-2);
  border-radius: 12px;
  background: var(--dm-bg-container);
}
.mip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  color: var(--dm-text);
}
.mip-title-group {
  display: flex;
  align-items: center;
}
.mip-title-group {
  min-width: 0;
  white-space: nowrap;
}
.mip-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 20px 10px;
}
.mip-top-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.mip-segment-card {
  min-width: 0;
  border: 1px solid var(--dm-border-2);
  border-radius: 8px;
  padding: 16px;
}
.mip-card-title {
  color: var(--dm-text);
  font-weight: 600;
}
.mip-segment-summary {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 78px 0 30px;
}
.mip-segment-summary div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mip-segment-summary div:last-child {
  align-items: flex-end;
  text-align: right;
}
.mip-segment-summary strong {
  color: var(--dm-text);
  font-size: 0.28rem;
  font-weight: 400;
  line-height: 1;
}
.mip-segment-summary span,
.mip-segment-labels {
  color: var(--dm-text-2);
  font-size: 14px;
}
.mip-segment-bar {
  display: flex;
  width: 100%;
  height: 26px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--dm-fill-3);
}
.mip-segment {
  min-width: 0;
  height: 100%;
}
.mip-segment--manual {
  background: #2f7df6;
}
.mip-segment--model {
  background: #2fb889;
}
.mip-segment-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}
.mip-table {
  display: flex;
  flex-direction: column;
  padding-bottom: 20px;
}
.mip-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1.2fr 1fr 1fr;
  min-height: 48px;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--dm-border-2);
  color: var(--dm-text);
  font-size: 14px;
}
.mip-row strong {
  color: var(--dm-text);
}
.mip-row > :not(:first-child) {
  padding-left: 16px;
}
.mip-head {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  /* 对齐任务列表表头的浅色填充，并兼容深色主题。 */
  background: var(--dm-fill-4);
  color: var(--dm-text);
  font-size: 14px;
  font-weight: 600;
}
.mip-head > span:not(:first-child) {
  border-left: 1px solid var(--dm-border-2);
}
.mip-head > span:first-child {
  border-top-left-radius: 8px;
}
.mip-head > span:last-child {
  border-top-right-radius: 8px;
}
.mip-empty {
  display: flex;
  flex: 1;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  /* 空态位于表头下方，保留基本高度避免贴死表头。 */
  min-height: 160px;
  margin: 0;
  padding: 24px 0;
}
.mip-empty :deep(.ant-empty-description) {
  color: rgba(0, 0, 0, 0.25);
}
.mip-chart {
  min-width: 0;
  border: 1px solid var(--dm-border-2);
  border-radius: 8px;
  padding: 16px;
}
.mip-chart-title {
  color: var(--dm-text);
  font-weight: 600;
}
.mip-chart-title span {
  float: right;
}
.mip-chart-canvas {
  height: 260px;
  width: 100%;
}
@media (width <= 768px) {
  .mip-top-row {
    grid-template-columns: 1fr;
  }
}
</style>
