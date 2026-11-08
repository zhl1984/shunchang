import { onScopeDispose, readonly, ref, shallowRef } from "vue";

import { defineStore } from "pinia";

import { getDatasetListApi, type Dataset } from "@/api/dataset";

export type DatasetLoadStatus = "uninitialized" | "loading" | "initialized";

const STALE_DATASET_REFRESH_DELAY = 30_000;

export const useDatasetStore = defineStore("dataset", () => {
  const datasets = shallowRef<Dataset[]>([]);
  const status = ref<DatasetLoadStatus>("uninitialized");
  let loadingPromise: Promise<void> | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  /** 清除尚未执行的数据集延迟刷新任务。 */
  function clearRefreshTimer(): void {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  /** 根据后端新鲜度标记安排一次强制刷新。 */
  function scheduleRefresh(): void {
    clearRefreshTimer();
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      status.value = "uninitialized";
      void loadDatasets().catch(() => undefined);
    }, STALE_DATASET_REFRESH_DELAY);
  }

  /** 请求完整数据集集合，并根据返回标记维护后续刷新任务。 */
  function loadDatasets(): Promise<void> {
    status.value = "loading";
    loadingPromise = getDatasetListApi()
      .then((result) => {
        if (result.code !== "0") throw new Error(result.message);
        const data = result.data;
        datasets.value = data?.list ?? [];
        status.value = "initialized";
        if (data?.hasRunningImport === true) {
          scheduleRefresh();
        } else {
          clearRefreshTimer();
        }
      })
      .catch((error: unknown) => {
        // 失败时停止自动刷新并允许下一次外部调用重试。
        clearRefreshTimer();
        status.value = "uninitialized";
        throw error;
      })
      .finally(() => {
        loadingPromise = null;
      });
    return loadingPromise;
  }

  /** 首次使用时加载数据集，并合并并发初始化请求。 */
  function initialize(): Promise<void> {
    if (loadingPromise) {
      return loadingPromise;
    }

    // 待刷新期间的外部初始化调用需要提前执行并取消原定时器。
    if (refreshTimer) {
      clearRefreshTimer();
      return loadDatasets();
    }

    if (status.value === "initialized") {
      return Promise.resolve();
    }

    return loadDatasets();
  }

  /** 强制重新获取数据集，供配置变更后同步所有使用方。 */
  async function refresh(): Promise<void> {
    clearRefreshTimer();
    if (loadingPromise) {
      await loadingPromise;
      return;
    }
    status.value = "uninitialized";
    await initialize();
  }

  onScopeDispose(clearRefreshTimer);

  // 获取 store 即开始懒加载，业务组件只需等待 initialized 状态。
  void initialize().catch(() => undefined);

  return {
    datasets,
    initialize,
    refresh,
    status: readonly(status),
  };
});
