import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, type EffectScope } from "vue";
import {
  getDashboardOverviewApi,
  getDashboardProductionApi,
  getDashboardProjectsApi,
  getDashboardRisksApi,
  getDashboardTrendApi,
} from "@/api/executive-dashboard";
import { useDashboard } from "@/views/executive-dashboard/composables/useDashboard";
import type {
  DashboardOverview,
  DashboardQuery,
  DashboardSnapshot,
  DashboardTrendPoint,
  TrendPeriod,
} from "@/views/executive-dashboard/types";

vi.mock("@/api/executive-dashboard", () => ({
  getDashboardOverviewApi: vi.fn(),
  getDashboardProductionApi: vi.fn(),
  getDashboardProjectsApi: vi.fn(),
  getDashboardRisksApi: vi.fn(),
  getDashboardTrendApi: vi.fn(),
  getDashboardErrorMessage: (reason: unknown) =>
    reason instanceof Error ? reason.message : "加载失败",
}));

const snapshot: DashboardSnapshot = {
  overview: {
    projectTotal: 8,
    runningProjectTotal: 3,
    dataTotal: 200,
    completedDataTotal: 100,
    completionRate: "50%",
    modelLabelRate: "20%",
  },
  production: {
    manualSavingRate: "12%",
    cycleReductionRate: "5%",
    modelTargetRate: "80%",
    manual: 80,
    model: 20,
  },
  projects: { normal: 5, attention: 2, risk: 1, statuses: [], progress: [] },
  risks: { risk: 1, overdue: 0, dueSoon: 2, stale: 0 },
};
const trend: DashboardTrendPoint[] = [
  { date: "2026-09-21", manual: 8, model: 2 },
];
const statisticApis = [
  getDashboardOverviewApi,
  getDashboardProductionApi,
  getDashboardProjectsApi,
  getDashboardRisksApi,
];
const scopes: EffectScope[] = [];

/** 手动控制响应顺序，复现真实请求乱序而不依赖定时器。 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

/** 使用真实 Vue 作用域，让 watch 的创建、更新和销毁遵循组件生命周期。 */
function createDashboard(
  initialQuery: DashboardQuery | null = { period: "7d" },
) {
  const query = ref<DashboardQuery | null>(initialQuery);
  const period = ref<TrendPeriod>("day");
  const scope = effectScope();
  scopes.push(scope);
  const dashboard = scope.run(() => useDashboard(query, period));
  if (!dashboard) throw new Error("测试作用域未启动");
  return { query, period, scope, dashboard };
}

/** 等待 watch 调度及其 Promise.all 链全部完成，避免只验证中间状态。 */
async function flushRequests() {
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getDashboardOverviewApi).mockResolvedValue(snapshot.overview);
  vi.mocked(getDashboardProductionApi).mockResolvedValue(snapshot.production);
  vi.mocked(getDashboardProjectsApi).mockResolvedValue(snapshot.projects);
  vi.mocked(getDashboardRisksApi).mockResolvedValue(snapshot.risks);
  vi.mocked(getDashboardTrendApi).mockResolvedValue(trend);
});

afterEach(() => {
  // 每个用例结束都销毁监听，防止后续测试触发前一作用域的请求。
  scopes.splice(0).forEach((scope) => scope.stop());
});

describe("useDashboard", () => {
  it("首次加载四组指标和趋势，透传业务筛选及趋势窗口", async () => {
    const filters: DashboardQuery = {
      period: "30d",
      projectCodes: ["project-a", "project-b"],
      annotationTypeId: 2,
    };
    const { dashboard } = createDashboard(filters);

    expect(dashboard.refreshing.value).toBe(true);
    for (const api of statisticApis)
      expect(api).toHaveBeenCalledExactlyOnceWith(filters);
    expect(getDashboardTrendApi).toHaveBeenCalledExactlyOnceWith(
      filters,
      "day",
    );
    await flushRequests();

    expect(dashboard.snapshot.value).toEqual(snapshot);
    expect(dashboard.trend.value).toEqual(trend);
    expect(dashboard.refreshing.value).toBe(false);
    expect(dashboard.error.value).toBe("");
    expect(dashboard.trendError.value).toBe("");
  });

  it("筛选变化立即清除旧快照，等待四组指标全部完成后统一展示", async () => {
    const { query, dashboard } = createDashboard();
    await flushRequests();
    const overviewRequest = deferred<DashboardOverview>();
    const trendRequest = deferred<DashboardTrendPoint[]>();
    vi.mocked(getDashboardOverviewApi).mockReturnValueOnce(
      overviewRequest.promise,
    );
    vi.mocked(getDashboardTrendApi).mockReturnValueOnce(trendRequest.promise);

    query.value = { period: "1y", projectCodes: ["project-c"] };
    await nextTick();

    expect(dashboard.snapshot.value).toBeNull();
    expect(dashboard.trend.value).toEqual([]);
    expect(dashboard.loading.value).toBe(true);
    expect(dashboard.trendLoading.value).toBe(true);
    for (const api of statisticApis) {
      expect(api).toHaveBeenCalledTimes(2);
      expect(api).toHaveBeenLastCalledWith(query.value);
    }
    expect(getDashboardTrendApi).toHaveBeenLastCalledWith(query.value, "day");

    const overview = { ...snapshot.overview, projectTotal: 15 };
    overviewRequest.resolve(overview);
    trendRequest.resolve([]);
    await flushRequests();
    expect(dashboard.snapshot.value).toEqual({ ...snapshot, overview });
    expect(dashboard.refreshing.value).toBe(false);
  });

  it("仅改变趋势窗口时保持四组指标和快照，只重载趋势", async () => {
    const { query, period, dashboard } = createDashboard();
    await flushRequests();
    const trendRequest = deferred<DashboardTrendPoint[]>();
    vi.mocked(getDashboardTrendApi).mockReturnValueOnce(trendRequest.promise);

    period.value = "month";
    await nextTick();

    for (const api of statisticApis) expect(api).toHaveBeenCalledTimes(1);
    expect(getDashboardTrendApi).toHaveBeenLastCalledWith(query.value, "month");
    expect(dashboard.snapshot.value).toEqual(snapshot);
    expect(dashboard.loading.value).toBe(false);
    expect(dashboard.trendLoading.value).toBe(true);
    expect(dashboard.trend.value).toEqual([]);
    trendRequest.resolve([]);
    await flushRequests();
    expect(dashboard.refreshing.value).toBe(false);
  });

  it.each(["resolve", "reject"] as const)(
    "旧条件迟到的 %s 不覆盖新条件的数据和错误状态",
    async (outcome) => {
      const oldOverview = deferred<DashboardOverview>();
      const oldTrend = deferred<DashboardTrendPoint[]>();
      vi.mocked(getDashboardOverviewApi).mockReturnValueOnce(
        oldOverview.promise,
      );
      vi.mocked(getDashboardTrendApi).mockReturnValueOnce(oldTrend.promise);
      const { query, dashboard } = createDashboard();

      // 新条件先返回，旧请求随后成功或失败都不得覆盖当前结果。
      query.value = { period: "6m" };
      await flushRequests();
      if (outcome === "resolve") {
        oldOverview.resolve({ ...snapshot.overview, projectTotal: 999 });
        oldTrend.resolve([{ date: "过期日期", manual: 999, model: 999 }]);
      } else {
        oldOverview.reject(new Error("旧指标失败"));
        oldTrend.reject(new Error("旧趋势失败"));
      }
      await flushRequests();

      expect(dashboard.snapshot.value).toEqual(snapshot);
      expect(dashboard.trend.value).toEqual(trend);
      expect(dashboard.error.value).toBe("");
      expect(dashboard.trendError.value).toBe("");
      expect(dashboard.refreshing.value).toBe(false);
    },
  );

  it("失败时暴露两条加载链的错误，手动刷新后恢复", async () => {
    vi.mocked(getDashboardProductionApi).mockRejectedValueOnce(
      new Error("指标失败"),
    );
    vi.mocked(getDashboardTrendApi).mockRejectedValueOnce(
      new Error("趋势失败"),
    );
    const { dashboard } = createDashboard();
    await flushRequests();

    expect(dashboard.snapshot.value).toBeNull();
    expect(dashboard.trend.value).toEqual([]);
    expect(dashboard.error.value).toBe("指标失败");
    expect(dashboard.trendError.value).toBe("趋势失败");
    expect(dashboard.refreshing.value).toBe(false);

    await dashboard.refresh();
    expect(dashboard.snapshot.value).toEqual(snapshot);
    expect(dashboard.trend.value).toEqual(trend);
    expect(dashboard.error.value).toBe("");
    expect(dashboard.trendError.value).toBe("");
    for (const api of statisticApis) expect(api).toHaveBeenCalledTimes(2);
    expect(getDashboardTrendApi).toHaveBeenCalledTimes(2);
  });

  it("任一加载链尚未结束时忽略重复刷新", async () => {
    const trendRequest = deferred<DashboardTrendPoint[]>();
    vi.mocked(getDashboardTrendApi).mockReturnValueOnce(trendRequest.promise);
    const { dashboard } = createDashboard();
    await flushRequests();

    // 主统计已完成也必须等待趋势，避免连续点击产生同条件重复请求。
    expect(dashboard.loading.value).toBe(false);
    expect(dashboard.trendLoading.value).toBe(true);
    await dashboard.refresh();
    for (const api of statisticApis) expect(api).toHaveBeenCalledTimes(1);
    expect(getDashboardTrendApi).toHaveBeenCalledTimes(1);
    trendRequest.resolve(trend);
    await flushRequests();
    expect(dashboard.refreshing.value).toBe(false);
  });

  it("初始查询为空时不请求，已有查询清空后移除旧数据", async () => {
    const { query, dashboard } = createDashboard(null);
    await flushRequests();
    await dashboard.refresh();
    for (const api of statisticApis) expect(api).not.toHaveBeenCalled();
    expect(getDashboardTrendApi).not.toHaveBeenCalled();

    query.value = { period: "7d" };
    await flushRequests();
    expect(dashboard.snapshot.value).toEqual(snapshot);
    expect(dashboard.trend.value).toEqual(trend);
    query.value = null;
    await flushRequests();

    expect(dashboard.snapshot.value).toBeNull();
    expect(dashboard.trend.value).toEqual([]);
    expect(dashboard.refreshing.value).toBe(false);
    for (const api of statisticApis) expect(api).toHaveBeenCalledTimes(1);
    expect(getDashboardTrendApi).toHaveBeenCalledTimes(1);
  });

  it.each(["resolve", "reject"] as const)(
    "作用域销毁后迟到的 %s 不更新状态，筛选监听也停止",
    async (outcome) => {
      const overviewRequest = deferred<DashboardOverview>();
      const trendRequest = deferred<DashboardTrendPoint[]>();
      vi.mocked(getDashboardOverviewApi).mockReturnValueOnce(
        overviewRequest.promise,
      );
      vi.mocked(getDashboardTrendApi).mockReturnValueOnce(trendRequest.promise);
      const { query, scope, dashboard } = createDashboard();
      scope.stop();

      // 卸载后无需再清理响应式展示状态，异步回调也不应继续写入。
      query.value = { period: "30d" };
      if (outcome === "resolve") {
        overviewRequest.resolve(snapshot.overview);
        trendRequest.resolve(trend);
      } else {
        overviewRequest.reject(new Error("卸载后指标失败"));
        trendRequest.reject(new Error("卸载后趋势失败"));
      }
      await flushRequests();

      expect(dashboard.snapshot.value).toBeNull();
      expect(dashboard.trend.value).toEqual([]);
      expect(dashboard.error.value).toBe("");
      expect(dashboard.trendError.value).toBe("");
      expect(dashboard.loading.value).toBe(true);
      expect(dashboard.trendLoading.value).toBe(true);
      for (const api of statisticApis) expect(api).toHaveBeenCalledTimes(1);
      expect(getDashboardTrendApi).toHaveBeenCalledTimes(1);
    },
  );
});
