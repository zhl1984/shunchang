import http, { getHttpResponseMessage } from "@/api/http";
import { i18n } from "@/locales";
import type {
  DashboardDistribution,
  DashboardOverview,
  DashboardPeriod,
  DashboardProduction,
  DashboardProjects,
  DashboardQuery,
  DashboardRisks,
  DashboardTrendPoint,
  TrendPeriod,
} from "@/views/executive-dashboard/types";

/** 后端 DTO 保留协议字段，缺失值在转换时处理。 */
interface ApiResponse<T> {
  code: string | number;
  message?: string | null;
  data?: T | null;
}
interface OverviewDto {
  projectTotal?: number | null;
  runningProjectTotal?: number | null;
  dataTotal?: number | null;
  completedDataTotal?: number | null;
  completionRate?: string | null;
  modelAnnotationRate?: string | null;
}
interface ProductionDto {
  laborSavingRate?: string | null;
  cycleReductionRate?: string | null;
  modelQualifiedProjectRate?: string | null;
  humanBoxTotal?: number | null;
  modelBoxTotal?: number | null;
}
interface DistributionDto {
  code: string;
  label: string;
  count: number;
  percentage?: string | null;
}
interface ProjectsDto {
  normalProjectTotal?: number | null;
  attentionProjectTotal?: number | null;
  riskProjectTotal?: number | null;
  statusDistribution?: DistributionDto[] | null;
  progressDistribution?: DistributionDto[] | null;
}
interface RisksDto {
  riskProjectTotal?: number | null;
  overdueProjectTotal?: number | null;
  dueSoonProjectTotal?: number | null;
  nonConvergentProjectTotal?: number | null;
}
interface TrendDto {
  points?: Array<{
    date: string;
    humanBoxCount?: number | null;
    modelBoxCount?: number | null;
  }> | null;
}
interface DashboardQueryDto {
  period: string;
  projectCodes?: string[];
  annotationTypeId?: string;
  window?: string;
}

const PERIODS: Record<DashboardPeriod, string> = {
  "7d": "LAST_WEEK",
  "30d": "LAST_MONTH",
  "3m": "LAST_3_MONTHS",
  "6m": "LAST_HALF_YEAR",
  "1y": "LAST_YEAR",
};
const WINDOWS: Record<TrendPeriod, string> = {
  day: "DAY",
  week: "WEEK",
  month: "MONTH",
};

/** 将页面筛选转换为接口参数，全部项目/类型不发送哨兵值。 */
function toQuery(
  query: DashboardQuery,
  window?: TrendPeriod,
): DashboardQueryDto {
  return {
    period: PERIODS[query.period],
    ...(query.projectCodes?.length ? { projectCodes: query.projectCodes } : {}),
    ...(query.annotationTypeId !== undefined
      ? { annotationTypeId: String(query.annotationTypeId) }
      : {}),
    ...(window ? { window: WINDOWS[window] } : {}),
  };
}

/** 兼容 fulfilled 与 rejected 响应，优先使用内层业务消息。 */
export function getDashboardErrorMessage(error: unknown): string {
  const detail = error as {
    response?: unknown;
    originalError?: { response?: unknown };
    message?: unknown;
  } | null;
  return (
    getHttpResponseMessage(
      detail?.response ?? detail?.originalError?.response,
    ) ||
    (typeof detail?.message === "string" && detail.message) ||
    i18n.global.t("executiveDashboard.feedback.loadFailed")
  );
}

/** 读取业务包装并校验根对象；各业务方法继续负责字段和集合转换。 */
async function request<T extends object>(
  path: string,
  params: DashboardQueryDto,
): Promise<T> {
  try {
    const response = await http.get<ApiResponse<T>>(path, {
      params,
      // OpenAPI query 数组默认 form/explode，发送 projectCodes=A&projectCodes=B。
      paramsSerializer: { indexes: null },
      skipError: true,
    });
    const body = response?.data;
    if (String(body?.code) !== "0") {
      throw new Error(
        getHttpResponseMessage(response) ||
          i18n.global.t("executiveDashboard.feedback.loadFailed"),
      );
    }
    // 成功但 data 为空不是全零快照，必须允许用户识别并重试。
    if (
      !body?.data ||
      typeof body.data !== "object" ||
      Array.isArray(body.data)
    ) {
      throw new Error(i18n.global.t("executiveDashboard.feedback.loadFailed"));
    }
    return body.data;
  } catch (error) {
    throw new Error(getDashboardErrorMessage(error));
  }
}

/** 缺失或非有限计数保留为空，避免 NaN 或伪造零值进入页面。 */
function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/** 百分比字符串已经由后端计算，保留其精度，异常值仅显示缺失占位。 */
function percentage(value: unknown): string | null {
  return typeof value === "string" && /^-?\d+(?:\.\d+)?%$/.test(value.trim())
    ? value.trim()
    : null;
}

/** 跳过不完整图表桶，保留有效零值以及接口返回的名称和比例。 */
function distribution(
  items: DistributionDto[] | null | undefined,
): DashboardDistribution[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (
      !item ||
      typeof item.code !== "string" ||
      typeof item.label !== "string" ||
      count(item.count) === null
    )
      return [];
    return [
      {
        key: item.code,
        label: item.label,
        count: item.count,
        percentage: percentage(item.percentage),
      },
    ];
  });
}

/** 根据项目、类型与周期查询经营概览，返回六项业务指标。 */
export async function getDashboardOverviewApi(
  query: DashboardQuery,
): Promise<DashboardOverview> {
  const data = await request<OverviewDto>(
    "/executive-dashboard",
    toQuery(query),
  );
  return {
    projectTotal: count(data.projectTotal),
    runningProjectTotal: count(data.runningProjectTotal),
    dataTotal: count(data.dataTotal),
    completedDataTotal: count(data.completedDataTotal),
    completionRate: percentage(data.completionRate),
    modelLabelRate: percentage(data.modelAnnotationRate),
  };
}

/** 根据公共筛选查询生产概览，返回 SALT 比例和人工/模型框数量。 */
export async function getDashboardProductionApi(
  query: DashboardQuery,
): Promise<DashboardProduction> {
  const data = await request<ProductionDto>(
    "/executive-dashboard/production",
    toQuery(query),
  );
  return {
    manualSavingRate: percentage(data.laborSavingRate),
    cycleReductionRate: percentage(data.cycleReductionRate),
    modelTargetRate: percentage(data.modelQualifiedProjectRate),
    manual: count(data.humanBoxTotal),
    model: count(data.modelBoxTotal),
  };
}

/** 根据公共筛选查询项目运行概览，返回健康计数与两组图表分桶。 */
export async function getDashboardProjectsApi(
  query: DashboardQuery,
): Promise<DashboardProjects> {
  const data = await request<ProjectsDto>(
    "/executive-dashboard/projects",
    toQuery(query),
  );
  return {
    normal: count(data.normalProjectTotal),
    attention: count(data.attentionProjectTotal),
    risk: count(data.riskProjectTotal),
    statuses: distribution(data.statusDistribution),
    progress: distribution(data.progressDistribution),
  };
}

/** 根据公共筛选查询风险待办，返回四项风险项目数。 */
export async function getDashboardRisksApi(
  query: DashboardQuery,
): Promise<DashboardRisks> {
  const data = await request<RisksDto>(
    "/executive-dashboard/risks",
    toQuery(query),
  );
  return {
    risk: count(data.riskProjectTotal),
    overdue: count(data.overdueProjectTotal),
    dueSoon: count(data.dueSoonProjectTotal),
    stale: count(data.nonConvergentProjectTotal),
  };
}

/** 按公共筛选与日/周/月窗口查询趋势，返回有序日期及两类框数。 */
export async function getDashboardTrendApi(
  query: DashboardQuery,
  window: TrendPeriod,
): Promise<DashboardTrendPoint[]> {
  const data = await request<TrendDto>(
    "/executive-dashboard/production/trend",
    toQuery(query, window),
  );
  if (!Array.isArray(data.points)) return [];
  return data.points.flatMap((point) => {
    // 没有日期的点无法定位横轴，丢弃而不补造日期。
    if (!point || typeof point.date !== "string" || !point.date) return [];
    return [
      {
        date: point.date,
        manual: count(point.humanBoxCount),
        model: count(point.modelBoxCount),
      },
    ];
  });
}
