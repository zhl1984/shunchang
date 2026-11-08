<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { EChartsOption } from "echarts";

import DmCharts from "@/components/Charts/index.vue";
import { useThemeStore } from "@/stores/theme";
import { DEFAULT_EMPTY_TEXT } from "@/constants/format";
import { formatThousands } from "@/utils/format";
import type { DashboardDistribution } from "@/views/executive-dashboard/types";

const props = defineProps<{ items: DashboardDistribution[] }>();
const { t } = useI18n();
const themeStore = useThemeStore();

const BAR_COLOR = "#1677ff";

/** 按主题读取坐标轴、分割线与柱顶文字颜色。 */
function resolveChartColors() {
  const muted = themeStore.isDark
    ? "rgb(255 255 255 / 45%)"
    : "rgb(0 0 0 / 45%)";
  const strong = themeStore.isDark
    ? "rgb(255 255 255 / 85%)"
    : "rgb(0 0 0 / 88%)";
  return {
    label: muted,
    value: strong,
    split: themeStore.isDark ? "rgb(255 255 255 / 12%)" : "#e8edf3",
  };
}

/** 组装进度分布柱状图：Y 轴从 0 起自适应，柱顶展示各区间项目数。 */
const chartOption = computed<EChartsOption>(() => {
  const colors = resolveChartColors();
  return {
    tooltip: {
      renderMode: "richText",
      axisPointer: { type: "shadow" },
      // 后端区间名称以富文本展示，同时保留其返回的百分比口径。
      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params];
        const item = items[0];
        const bucket = item ? props.items[item.dataIndex] : undefined;
        return bucket
          ? `${bucket.label}: ${formatThousands(bucket.count, 0)} (${bucket.percentage ?? DEFAULT_EMPTY_TEXT})`
          : DEFAULT_EMPTY_TEXT;
      },
    },
    grid: { top: 28 },
    xAxis: {
      data: props.items.map((item) => item.label),
    },
    yAxis: {
      min: 0,
      minInterval: 1,
    },
    series: [
      {
        type: "bar",
        name: t("executiveDashboard.projectOverview.progressTitle"),
        data: props.items.map((item) => item.count),
        itemStyle: { color: BAR_COLOR, borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: "top",
          color: colors.value,
          fontSize: 12,
        },
      },
    ],
  };
});
</script>

<template>
  <div class="project-progress-chart">
    <h3>{{ t("executiveDashboard.projectOverview.progressTitle") }}</h3>
    <div class="ppc-chart">
      <DmCharts :option="chartOption" :show-empty="!items.length" />
    </div>
  </div>
</template>

<style scoped lang="less">
.project-progress-chart {
  min-width: 0;
}
.project-progress-chart h3 {
  margin: 0;
  color: var(--dm-text);
  font-size: 16px;
}
.ppc-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px;
  margin-top: 12px;
}
</style>
