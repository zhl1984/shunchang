import type { EChartsOption } from "echarts";

/** 全图共享的布局、图例、提示与动画默认值。 */
export const baseOption: EChartsOption = {
  grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
  legend: {
    orient: "horizontal",
    icon: "circle",
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 20,
    itemStyle: { borderWidth: 0 },
    textStyle: { color: "#667085", fontSize: 12 },
  },
  tooltip: {
    backgroundColor: "rgb(0 0 0 / 65%)",
    borderWidth: 0,
    textStyle: { color: "#fff" },
  },
  animation: false,
};

/** 直角坐标系折线 / 柱状图共用的坐标轴样式，由 line / bar 默认配置展开。 */
export const axisOption: EChartsOption = {
  xAxis: {
    type: "category",
    axisTick: { show: false },
    axisLabel: { color: "#bfbfbf", fontSize: 12 },
    axisLine: { lineStyle: { color: "#d9d9d9" } },
  },
  yAxis: {
    type: "value",
    axisTick: { show: false },
    axisLabel: { color: "#bfbfbf", fontSize: 12 },
    axisLine: { show: false },
    splitLine: { lineStyle: { type: "dashed" } },
  },
};
