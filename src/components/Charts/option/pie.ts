import type { EChartsOption, PieSeriesOption } from "echarts";

/** 饼图覆盖 axis tooltip，否则会沿用 baseOption 的 trigger: axis。 */
export const pieOption: EChartsOption = {
  tooltip: {
    trigger: "item",
  },
};

/** 环形图几何、圆心标签样式与交互默认值；圆心文案由业务传入 formatter。 */
export const pieSeriesOption: PieSeriesOption = {
  radius: ["60%", "80%"],
  center: ["50%", "50%"],
  avoidLabelOverlap: false,
  silent: false,
  label: {
    show: true,
    position: "center",
    rich: {
      total: {
        fontSize: 24,
        fontWeight: 600,
        color: "rgb(0 0 0 / 88%)",
        lineHeight: 32,
      },
      caption: {
        fontSize: 12,
        color: "#98a2b3",
        lineHeight: 20,
      },
    },
  },
  labelLine: { show: false },
  emphasis: {
    scale: false,
    label: { show: true },
  },
};
