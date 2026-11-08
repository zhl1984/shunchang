import type { EChartsOption, LineSeriesOption } from "echarts";
import { axisOption } from "./base";

/** 折线图顶层默认：坐标轴 + axis tooltip。 */
export const lineOption: EChartsOption = {
  tooltip: {
    trigger: "axis",
  },
  ...axisOption,
};

/** 折线点大小、线宽与描边颜色；按条 merge，业务可覆盖 color。 */
export const lineSeriesOption: LineSeriesOption = {
  symbolSize: 8,
  lineStyle: { width: 2, color: "#2f66d8" },
  itemStyle: { color: "#2f66d8" },
};
