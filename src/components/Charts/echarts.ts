import * as echarts from "echarts";
import type { ECharts } from "echarts";

/**
 * 全量引入 ECharts，使折线、柱状、饼图等图表类型可直接使用，
 * 并由打包器保证该模块在多页面引用时只求值一次。
 */
export { echarts };

/**
 * 为指定 DOM 获取或创建唯一的 ECharts 实例。
 * 同一节点重复进入初始化逻辑时复用未销毁实例，避免二次 `init`。
 */
export function getOrCreateChart(el: HTMLElement): ECharts {
  const existing = echarts.getInstanceByDom(el);
  // 已销毁实例不能继续 setOption，必须重新 init。
  if (existing && !existing.isDisposed()) {
    return existing;
  }
  return echarts.init(el);
}
