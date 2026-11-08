<script setup lang="ts">
import { computed, nextTick, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { EChartsOption } from "echarts";
import type { ChartEventHandlers } from "./types";
import { mergeChartOption } from "./option";
import { useEcharts } from "./useEcharts";

// 不声明 name，避免 eager 全局注册把全量 echarts 打进主包。

const props = withDefaults(
  defineProps<{
    /** 业务 ECharts 配置；会与公共默认配置按 series 类型 merge，引用变化后整份替换。 */
    option: EChartsOption;
    /** key 为已知 ECharts 事件名，value 为对应 payload 的 handler。 */
    events?: ChartEventHandlers;
    /** true 展示空状态；false（默认）渲染图表，即使数据为空。 */
    showEmpty?: boolean;
    /** 空状态文案；未传时使用「暂无数据」。 */
    emptyText?: string;
  }>(),
  { showEmpty: false, events: undefined, emptyText: undefined },
);

const { t } = useI18n();

/** 按 base → 图表类型默认 → 业务 option 合并，供实例整份 setOption。 */
const mergedOption = computed(() => mergeChartOption(props.option));

/** 业务未传 emptyText 时回退到组件默认空文案。 */
const emptyDescription = computed(
  () => props.emptyText ?? t("components.charts.empty"),
);

const { containerRef, getInstance, resize } = useEcharts(
  mergedOption,
  () => props.events,
);

// 从空状态切回画布后补一次 resize，避免隐藏态把实例尺寸留在 0。
watch(
  () => props.showEmpty,
  (showEmpty) => {
    // 空状态隐藏画布，切回后宽高才有效，需补一次 resize。
    if (!showEmpty) {
      void nextTick(() => {
        resize();
      });
    }
  },
);

// 暴露实例与手动 resize，业务页不必再复制 Observer / dispose 逻辑。
defineExpose({ getInstance, resize });
</script>

<template>
  <div class="charts">
    <div v-if="showEmpty" class="charts-empty">
      <a-empty :description="emptyDescription" />
    </div>
    <div v-show="!showEmpty" ref="containerRef" class="charts-canvas" />
  </div>
</template>

<style scoped>
.charts {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.charts-canvas {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.charts-empty {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.charts-empty :deep(.ant-empty) {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-inline: 0;
}

.charts-empty :deep(.ant-empty-image) {
  margin-bottom: 8px;
}

.charts-empty :deep(.ant-empty-description) {
  margin-inline: 0;
  color: var(--dm-text-3);
  text-align: center;
}
</style>
