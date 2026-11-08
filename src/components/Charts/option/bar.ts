import type { BarSeriesOption, EChartsOption } from "echarts";
import { axisOption } from "./base";

/** 柱状图顶层默认：坐标轴 + axis tooltip。 */
export const barOption: EChartsOption = {
  tooltip: {
    trigger: "axis",
  },
  ...axisOption,
};

/** 柱状系列默认宽度；按条 merge，避免 lodash 只改 series[0]。 */
export const barSeriesOption: BarSeriesOption = {
  barWidth: 28,
};
