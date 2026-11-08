import type { EChartsOption, SeriesOption } from "echarts";
import { merge } from "@/utils/lodash";
import { baseOption } from "./base";
import { barOption, barSeriesOption } from "./bar";
import { lineOption, lineSeriesOption } from "./line";
import { pieOption, pieSeriesOption } from "./pie";

/** 已登记的 series.type 与图表特定默认配置的映射；未登记类型不加这一层。 */
const chartOptionByType: Partial<Record<string, EChartsOption>> = {
  line: lineOption,
  bar: barOption,
  pie: pieOption,
};

const seriesOptionByType: Partial<Record<string, SeriesOption>> = {
  line: lineSeriesOption,
  bar: barSeriesOption,
  pie: pieSeriesOption,
};

/**
 * 从业务 option 的 series 读取图表类型。
 * 数组取第一个带 type 的项；混用折柱时以该项为准。公共层不含 series，避免 lodash merge 按索引改写业务序列。
 */
function resolveSeriesType(option: EChartsOption): string | undefined {
  const series = option.series;
  // 空配置无法判断图表类型，调用方只拿到 baseOption 与业务字段的合并结果。
  if (!series) {
    return undefined;
  }
  const items: SeriesOption[] = Array.isArray(series) ? series : [series];
  const firstTyped = items.find((item) => Boolean(item.type));
  return firstTyped?.type;
}

/**
 * 将折线 / 柱状 / 饼图的系列默认配置 merge 到每一项。
 * 不把 series 数组放进顶层公共 option，避免 lodash merge 按索引漏掉堆叠柱的后续系列。
 */
function applySeriesItemDefaults(option: EChartsOption): EChartsOption {
  const series = option.series;
  // 无 series 时无需补系列默认值，直接返回顶层合并结果。
  if (!series) {
    return option;
  }
  const items: SeriesOption[] = Array.isArray(series) ? series : [series];
  const next = items.map((item) => {
    const seriesDefaults = item.type
      ? seriesOptionByType[item.type]
      : undefined;
    // 无登记默认值的类型原样保留，例如散点不写入 barWidth。
    if (!seriesDefaults) {
      return item;
    }
    return merge({} as SeriesOption, seriesDefaults, item);
  });
  option.series = Array.isArray(series) ? next : next[0];
  return option;
}

/**
 * 按 baseOption → 图表特定 option → 业务 option 深度合并。
 * 写入空对象作为 merge 目标，避免改到模块级默认配置；业务字段覆盖同名默认值。
 */
export function mergeChartOption(option: EChartsOption): EChartsOption {
  const seriesType = resolveSeriesType(option);
  const chartSpecificOption = seriesType
    ? chartOptionByType[seriesType]
    : undefined;
  // 业务未传 legend 时不加默认图例，且不能改模块级 baseOption。
  const baseForMerge: EChartsOption = { ...baseOption };
  if (option.legend === undefined) {
    delete baseForMerge.legend;
  }
  const merged = merge(
    {} as EChartsOption,
    baseForMerge,
    chartSpecificOption ?? {},
    option,
  );
  return applySeriesItemDefaults(merged);
}
