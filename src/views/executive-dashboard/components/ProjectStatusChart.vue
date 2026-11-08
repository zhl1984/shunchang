<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { EChartsOption } from "echarts";

import DmCharts from "@/components/Charts/index.vue";
import { DEFAULT_EMPTY_TEXT } from "@/constants/format";
import { formatThousands } from "@/utils/format";
import type { DashboardDistribution } from "@/views/executive-dashboard/types";

const props = defineProps<{ items: DashboardDistribution[] }>();
const { t } = useI18n();

/** 已知状态保持稳定颜色，新增后端状态以中性色展示。 */
const statusColors: Record<string, string> = {
  PROCESSING: "#6ea1ff",
  RUNNING: "#1677ff",
  COMPLETED: "#22b983",
  FAILED: "#ef6b62",
};

/** 环形中心使用接口各状态的项目数合计，不混用其他统计范围。 */
const total = computed(() =>
  props.items.reduce((sum, item) => sum + item.count, 0),
);

/** 图例保留零值状态，标签和百分比直接展示接口内容。 */
const displayedStatuses = computed(() =>
  props.items.map((item) => ({
    ...item,
    color: statusColors[item.key] ?? "#8c8c8c",
    countDisplay: formatThousands(item.count, 0),
    percentDisplay: item.percentage ?? DEFAULT_EMPTY_TEXT,
  })),
);

/** 无分布数据时铺满卡片；有零值图例时仍保留左右布局。 */
const chartCanvasClass = computed(() => ({
  "psc-canvas--fill": props.items.length === 0,
}));

/** 组装环形图：扇区按真实占比，中心展示项目总数；ECharts 图例关闭，改由右侧自定义列表呈现。 */
const chartOption = computed<EChartsOption>(() => {
  const sum = total.value;
  const caption = t("executiveDashboard.projectOverview.total");
  const chartItems = displayedStatuses.value.filter((item) => item.count > 0);

  return {
    legend: { show: false },
    tooltip: {
      renderMode: "richText",
      // API 标签采用富文本渲染，百分比使用后端原值而非图表自动计算值。
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const status = chartItems[item.dataIndex];
        return status
          ? `${item.marker ?? ""}${status.label}: ${status.countDisplay} (${status.percentDisplay})`
          : DEFAULT_EMPTY_TEXT;
      },
    },
    series: [
      {
        type: "pie",
        // 圆心总数文案随数据变化；show / position / rich 走公共饼图默认配置。
        label: {
          formatter: `{total|${formatThousands(sum, 0)}}\n{caption|${caption}}`,
        },
        // 零值不绘制扇区，避免占位角；图例仍用 displayedStatuses 展示全部状态。
        data: chartItems.map((item) => ({
          name: item.label,
          value: item.count,
          itemStyle: { color: item.color },
        })),
      },
    ],
  };
});
</script>

<template>
  <div class="project-status-chart">
    <h3 class="font-md">
      {{ t("executiveDashboard.projectOverview.statusTitle") }}
    </h3>
    <div class="psc-body">
      <DmCharts
        class="psc-canvas"
        :class="chartCanvasClass"
        :option="chartOption"
        :show-empty="total === 0"
      />
      <div v-if="items.length" class="psc-legend">
        <div
          v-for="item in displayedStatuses"
          :key="item.key"
          class="psc-status-row"
        >
          <i :style="{ background: item.color }" />
          <span>{{ item.label }}</span>
          <b>{{ item.countDisplay }}</b>
          <em>{{ item.percentDisplay }}</em>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.project-status-chart {
  min-width: 0;
}

.project-status-chart h3 {
  margin: 0;
  color: var(--dm-text);
}

.psc-body {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 220px;
  margin-top: 12px;
  min-width: 0;
}

.psc-canvas {
  width: 180px;
  height: 180px;
  flex-shrink: 0;
}

.psc-canvas--fill {
  width: 100%;
  height: 100%;
}

.psc-legend {
  min-width: 0;
}

.psc-status-row {
  display: grid;
  grid-template-columns: 12px 100px 30px 55px;
  gap: 8px;
  align-items: center;
  margin: 10px 0;
  color: var(--dm-text-2);
}

.psc-status-row i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.psc-status-row b,
.psc-status-row em {
  font-style: normal;
  color: var(--dm-text);
}
</style>
