/** 页面筛选使用业务周期，API 层负责后端枚举转换。 */
export type DashboardPeriod = "7d" | "30d" | "3m" | "6m" | "1y";
export type TrendPeriod = "day" | "week" | "month";
export interface DashboardQuery {
  period: DashboardPeriod;
  projectCodes?: string[];
  annotationTypeId?: number;
}

/** 缺失指标保持 null，避免将接口异常显示成真实零值。 */
export interface DashboardOverview {
  projectTotal: number | null;
  runningProjectTotal: number | null;
  dataTotal: number | null;
  completedDataTotal: number | null;
  completionRate: string | null;
  modelLabelRate: string | null;
}

/** 标注框数量与样本数量口径独立，不推算待完成框数。 */
export interface DashboardProduction {
  manualSavingRate: string | null;
  cycleReductionRate: string | null;
  modelTargetRate: string | null;
  manual: number | null;
  model: number | null;
}

/** 图表保留后端分桶名称和比例，组件仅负责绘制。 */
export interface DashboardDistribution {
  key: string;
  label: string;
  count: number;
  percentage: string | null;
}
export interface DashboardProjects {
  normal: number | null;
  attention: number | null;
  risk: number | null;
  statuses: DashboardDistribution[];
  progress: DashboardDistribution[];
}
export interface DashboardRisks {
  risk: number | null;
  overdue: number | null;
  dueSoon: number | null;
  stale: number | null;
}
export interface DashboardTrendPoint {
  date: string;
  manual: number | null;
  model: number | null;
}
export interface DashboardSnapshot {
  overview: DashboardOverview;
  production: DashboardProduction;
  projects: DashboardProjects;
  risks: DashboardRisks;
}
