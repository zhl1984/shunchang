import { readonly, ref, shallowRef } from "vue";

import { defineStore } from "pinia";

import {
  getQualityPlanListApi,
  type QualityPlanListItem,
} from "@/api/quality-plan";

export type QualityPlanStoreLoadStatus =
  | "uninitialized"
  | "loading"
  | "initialized";

// 全局选择项不受质量方案页面分页限制，按较大页容量一次加载完整集合。
const QUALITY_PLAN_STORE_PAGE_SIZE = 10000;

export const useQualityPlanStore = defineStore("quality-plan", () => {
  const qualityPlans = shallowRef<QualityPlanListItem[]>([]);
  const status = ref<QualityPlanStoreLoadStatus>("uninitialized");
  let loadingPromise: Promise<void> | null = null;

  /** 首次使用时加载全部质量方案，并合并并发初始化请求。 */
  function initialize(): Promise<void> {
    if (status.value === "initialized") return Promise.resolve();
    if (loadingPromise) return loadingPromise;

    status.value = "loading";
    loadingPromise = getQualityPlanListApi({
      page: 1,
      pageSize: QUALITY_PLAN_STORE_PAGE_SIZE,
    })
      .then((result) => {
        qualityPlans.value = result.list;
        status.value = "initialized";
      })
      .catch((error: unknown) => {
        status.value = "uninitialized";
        throw error;
      })
      .finally(() => {
        loadingPromise = null;
      });

    return loadingPromise;
  }

  /** 强制重新读取质量方案集合，供质量方案 CRUD 后同步所有调用方。 */
  async function refresh(): Promise<void> {
    // 若首次请求仍在进行，先等待其结束，再发起一次变更后的最新查询。
    if (loadingPromise) {
      await loadingPromise;
    }
    status.value = "uninitialized";
    await initialize();
  }

  // 获取 Store 即开始懒加载，调用方仍可通过 initialize 等待同一请求完成。
  void initialize().catch(() => undefined);

  return {
    qualityPlans,
    status: readonly(status),
    initialize,
    refresh,
  };
});
