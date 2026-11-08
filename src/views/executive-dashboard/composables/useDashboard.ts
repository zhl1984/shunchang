import {
  computed,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
  type Ref,
} from "vue";
import {
  getDashboardErrorMessage,
  getDashboardOverviewApi,
  getDashboardProductionApi,
  getDashboardProjectsApi,
  getDashboardRisksApi,
  getDashboardTrendApi,
} from "@/api/executive-dashboard";
import type {
  DashboardQuery,
  DashboardSnapshot,
  DashboardTrendPoint,
  TrendPeriod,
} from "@/views/executive-dashboard/types";

/** 编排统计和趋势两条加载链；查询为空表示指定项目尚未选择。 */
export function useDashboard(
  query: Ref<DashboardQuery | null>,
  period: Ref<TrendPeriod>,
) {
  const snapshot = shallowRef<DashboardSnapshot | null>(null);
  const trend = shallowRef<DashboardTrendPoint[]>([]);
  const loading = ref(false);
  const trendLoading = ref(false);
  const error = ref("");
  const trendError = ref("");
  let snapshotRequest = 0;
  let trendRequest = 0;
  // 两条链均结束才允许重复手动刷新，趋势窗口仍可独立切换。
  const refreshing = computed(() => loading.value || trendLoading.value);

  /** 原子更新同一筛选下的四组指标，失败时不保留其他筛选的旧快照。 */
  async function loadSnapshot() {
    const requestId = ++snapshotRequest;
    const params = query.value;
    snapshot.value = null;
    error.value = "";
    loading.value = params !== null;
    if (!params) return;
    try {
      const [overview, production, projects, risks] = await Promise.all([
        getDashboardOverviewApi(params),
        getDashboardProductionApi(params),
        getDashboardProjectsApi(params),
        getDashboardRisksApi(params),
      ]);
      // 快速切换后只接纳最新请求，旧响应不污染当前条件。
      if (requestId === snapshotRequest)
        snapshot.value = { overview, production, projects, risks };
    } catch (reason) {
      if (requestId === snapshotRequest)
        error.value = getDashboardErrorMessage(reason);
    } finally {
      if (requestId === snapshotRequest) loading.value = false;
    }
  }

  /** 趋势窗口变化只请求趋势，独立展示错误，保留主统计模块可用性。 */
  async function loadTrend() {
    const requestId = ++trendRequest;
    const params = query.value;
    trend.value = [];
    trendError.value = "";
    trendLoading.value = params !== null;
    if (!params) return;
    try {
      const result = await getDashboardTrendApi(params, period.value);
      if (requestId === trendRequest) trend.value = result;
    } catch (reason) {
      if (requestId === trendRequest)
        trendError.value = getDashboardErrorMessage(reason);
    } finally {
      if (requestId === trendRequest) trendLoading.value = false;
    }
  }

  /** 手动重新加载当前条件，合并两条独立加载链并防止重复点击。 */
  async function refresh() {
    if (refreshing.value) return;
    await Promise.all([loadSnapshot(), loadTrend()]);
  }

  // 创建时立即请求，后续跟随筛选/窗口变化；watch 随组件作用域自动销毁。
  watch(query, loadSnapshot, { immediate: true, deep: true });
  watch([query, period], loadTrend, { immediate: true, deep: true });
  // 卸载时作废未返回的请求，避免销毁后继续修改状态或弹出错误。
  onScopeDispose(() => {
    snapshotRequest++;
    trendRequest++;
  });

  return {
    snapshot,
    trend,
    loading,
    trendLoading,
    refreshing,
    error,
    trendError,
    refresh,
  };
}
