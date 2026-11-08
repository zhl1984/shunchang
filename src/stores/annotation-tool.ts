import { readonly, ref, shallowRef } from "vue";
import { defineStore } from "pinia";

import {
  getAnnotationToolsApi,
  type AnnotationTool,
} from "@/api/development-config";

export type AnnotationToolLoadStatus =
  | "uninitialized"
  | "loading"
  | "initialized";

/** 全局缓存标注工具定义，确保多个弹窗实例只触发一次请求。 */
export const useAnnotationToolStore = defineStore("annotation-tool", () => {
  const tools = shallowRef<AnnotationTool[]>([]);
  const status = ref<AnnotationToolLoadStatus>("uninitialized");
  let loadingPromise: Promise<void> | null = null;

  /** 首次使用时加载工具定义；并发调用共享同一个请求。 */
  function initialize(): Promise<void> {
    if (status.value === "initialized") return Promise.resolve();
    if (loadingPromise) return loadingPromise;
    status.value = "loading";
    loadingPromise = getAnnotationToolsApi()
      .then((data) => {
        tools.value = data;
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

  /** 主动刷新工具定义，供配置变更后同步所有消费者。 */
  async function refresh(): Promise<void> {
    status.value = "uninitialized";
    await initialize();
  }

  void initialize().catch(() => undefined);
  return { tools, status: readonly(status), initialize, refresh };
});
