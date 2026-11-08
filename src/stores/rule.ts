import { readonly, ref, shallowRef } from "vue";

import { defineStore } from "pinia";

import { getRuleListApi, type RuleListItem } from "@/api/rule";

export type RuleStoreLoadStatus = "uninitialized" | "loading" | "initialized";
const RULE_STORE_PAGE_SIZE = 10000;

export const useRuleStore = defineStore("rule", () => {
  const rules = shallowRef<RuleListItem[]>([]);
  const status = ref<RuleStoreLoadStatus>("uninitialized");
  let loadingPromise: Promise<void> | null = null;

  /** 首次访问时加载全部规则，并合并并发初始化请求。 */
  function initialize(): Promise<void> {
    if (status.value === "initialized") return Promise.resolve();
    if (loadingPromise) return loadingPromise;

    status.value = "loading";
    loadingPromise = getRuleListApi({
      pageNo: 1,
      pageSize: RULE_STORE_PAGE_SIZE,
    })
      .then((result) => {
        if (result.code !== "0") throw new Error(result.message);
        rules.value = result.data?.list ?? [];
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

  /** 强制重新请求规则列表，供规则增删改后同步页面数据。 */
  async function refresh(): Promise<void> {
    status.value = "uninitialized";
    await initialize();
  }

  void initialize().catch(() => undefined);

  return {
    rules,
    status: readonly(status),
    initialize,
    refresh,
  };
});
