import type { ECElementEvent } from "echarts";

/**
 * 图形交互事件名，与 ECharts `ECElementEvent.type` 对齐。
 */
export type ChartElementEventName = ECElementEvent["type"];

/**
 * 组件 / action 事件名，覆盖官方常用图例、缩放、地图、刷选等。
 * 自定义 `registerAction` 事件不在此列，应直接使用实例 `on`。
 */
export type ChartActionEventName =
  | "legendselectchanged"
  | "legendselected"
  | "legendunselected"
  | "legendselectall"
  | "legendinverseselect"
  | "legendscroll"
  | "datazoom"
  | "datarangeselected"
  | "timelinechanged"
  | "timelineplaychanged"
  | "restore"
  | "magictypechanged"
  | "geoselectchanged"
  | "geoselected"
  | "geounselected"
  | "georoam"
  | "axisareaselected"
  | "brush"
  | "brushEnd"
  | "brushselected"
  | "globalcursortaken"
  | "selectchanged"
  | "highlight"
  | "downplay";

/** 渲染生命周期事件。 */
export type ChartLifecycleEventName = "rendered" | "finished";

export type ChartEventName =
  | ChartElementEventName
  | ChartActionEventName
  | ChartLifecycleEventName;

/** 事件回调；返回 `false` 时与 ECharts 一致，可阻止后续处理。 */
export type ChartEventHandler<T = unknown> = (params: T) => boolean | void;

/** 组件 action 事件的公共载荷，具体字段随事件名变化。 */
export interface ChartActionEvent {
  type: string;
  componentType?: string;
  componentIndex?: number;
  seriesIndex?: number;
  [key: string]: unknown;
}

/**
 * `events` 属性：key 为已知事件名，value 按事件类别收窄 payload。
 * 未列出的事件名在类型上不可传入。
 */
export type ChartEventHandlers = {
  [K in ChartElementEventName]?: ChartEventHandler<ECElementEvent>;
} & {
  [K in ChartActionEventName]?: ChartEventHandler<ChartActionEvent>;
} & {
  rendered?: ChartEventHandler<{ elapsedTime: number }>;
  finished?: () => boolean | void;
};

/** 已绑定回调的统一存储形态，供 on/off 成对使用。 */
export type BoundChartEventHandler = NonNullable<
  ChartEventHandlers[ChartEventName]
>;
