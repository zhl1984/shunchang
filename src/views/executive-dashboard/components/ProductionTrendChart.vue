<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { EChartsOption } from "echarts";
import DmCharts from "@/components/Charts/index.vue";
import { formatThousands } from "@/utils/format";
import type {
  DashboardTrendPoint,
  TrendPeriod,
} from "@/views/executive-dashboard/types";

const props = defineProps<{
  points: DashboardTrendPoint[];
  period: TrendPeriod;
  loading: boolean;
  error: string;
}>();
const emit = defineEmits<{ "update:period": [value: TrendPeriod] }>();
const { t } = useI18n();

const MANUAL_COLOR = "#1677ff";
const MODEL_COLOR = "#2dbb83";
const trendPeriods: TrendPeriod[] = ["day", "week", "month"];

/** 语言变化时更新窗口标签，选中窗口由父页面统一维护。 */
const trendPeriodOptions = computed(() =>
  trendPeriods.map((value) => ({
    label: t(`executiveDashboard.dataOverview.trend.period.${value}`),
    value,
  })),
);

/** 仅接收受支持的窗口值，避免 UI 组件宽类型进入业务请求。 */
function handlePeriodChange(value: string | number) {
  if (value === "day" || value === "week" || value === "month") {
    emit("update:period", value);
  }
}

/** 没有有效指标时展示空状态；真实零值仍保留日期坐标轴。 */
const isEmpty = computed(
  () =>
    !props.points.some(
      (point) => point.manual !== null || point.model !== null,
    ),
);

/** 组装堆叠柱状图配置：人工在下、模型在上，图例与 Tooltip 文案走国际化。 */
const chartOption = computed<EChartsOption>(() => {
  const manualName = t("executiveDashboard.dataOverview.trend.manual");
  const modelName = t("executiveDashboard.dataOverview.trend.model");

  return {
    color: [MANUAL_COLOR, MODEL_COLOR],
    legend: {
      left: 0,
      top: 0,
      icon: "roundRect",
    },
    tooltip: {
      renderMode: "richText",
      axisPointer: { type: "shadow" },
      // 日期来自接口，使用富文本渲染以避免把接口内容解释成 HTML。
      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params];
        const title = String(items[0]?.name ?? "");
        const lines = items.map((item) => {
          const value = Array.isArray(item.value) ? item.value[1] : item.value;
          const displayValue = formatThousands(
            typeof value === "number" ? value : null,
            0,
          );
          return `${item.marker ?? ""}${item.seriesName}: ${displayValue}`;
        });
        return [title, ...lines].join("\n");
      },
    },
    grid: { top: 44 },
    xAxis: {
      data: props.points.map((point) => point.date),
    },
    yAxis: {
      min: 0,
    },
    series: [
      {
        type: "bar",
        name: manualName,
        stack: "production",
        data: props.points.map((point) => point.manual),
        itemStyle: { color: MANUAL_COLOR },
      },
      {
        type: "bar",
        name: modelName,
        stack: "production",
        data: props.points.map((point) => point.model),
        itemStyle: {
          color: MODEL_COLOR,
          // 仅顶部系列圆角，贴合设计稿堆叠柱上沿。
          borderRadius: [3, 3, 0, 0],
        },
      },
    ],
  };
});
</script>

<template>
  <div class="production-trend-chart">
    <div class="ptc-head">
      <h3>{{ t("executiveDashboard.dataOverview.trend.title") }}</h3>
      <a-segmented
        :value="period"
        size="small"
        :options="trendPeriodOptions"
        @change="handlePeriodChange"
      />
    </div>
    <div class="ptc-chart">
      <a-spin v-if="loading" />
      <a-alert v-else-if="error" type="error" :message="error" show-icon />
      <DmCharts v-else :option="chartOption" :show-empty="isEmpty" />
    </div>
  </div>
</template>

<style scoped lang="less">
.production-trend-chart {
  min-width: 0;
}
.ptc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ptc-head h3 {
  margin: 0;
  color: var(--dm-text);
  font-size: 16px;
}
.ptc-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 260px;
  margin-top: 12px;
}
</style>
