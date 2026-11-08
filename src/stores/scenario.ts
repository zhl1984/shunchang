import { readonly, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { type Scenario, getScenarioListApi } from "@/api/scenario";

export type ScenarioLoadStatus = "uninitialized" | "loading" | "initialized";
const SCENARIO_STORE_PAGE_SIZE = "10000";

export const useScenarioStore = defineStore("scenario", () => {
  const scenarios = shallowRef<Scenario[]>([]);
  const status = ref<ScenarioLoadStatus>("uninitialized");
  let loadingPromise: Promise<void> | null = null;

  /** Initializes the global scenario list once and preserves the placeholder until an API result exists. */
  function initialize(): Promise<void> {
    if (status.value === "initialized") return Promise.resolve();
    if (loadingPromise) return loadingPromise;
    status.value = "loading";
    loadingPromise = getScenarioListApi({
      pageNo: "1",
      pageSize: SCENARIO_STORE_PAGE_SIZE,
    })
      .then((page) => {
        scenarios.value = page.list;
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

  /** Reloads scenarios so later configuration changes can synchronize all consumers. */
  async function refresh(): Promise<void> {
    status.value = "uninitialized";
    await initialize();
  }

  void initialize().catch(() => undefined);
  return {
    scenarios,
    status: readonly(status),
    initialize,
    refresh,
  };
});
