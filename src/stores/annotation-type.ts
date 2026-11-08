import { readonly, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import {
  getAnnotationTypePageApi,
  type AnnotationTypeRecord,
} from "@/api/development-config";

export type AnnotationTypeStoreLoadStatus =
  | "uninitialized"
  | "loading"
  | "initialized";
const ANNOTATION_TYPE_STORE_PAGE_SIZE = 10000;

export const useAnnotationTypeStore = defineStore("annotation-type", () => {
  const annotationTypes = shallowRef<AnnotationTypeRecord[]>([]);
  const status = ref<AnnotationTypeStoreLoadStatus>("uninitialized");
  let loadingPromise: Promise<void> | null = null;

  /** 首次使用时一次加载全部启用标注类型，并合并并发初始化请求。 */
  function initialize(): Promise<void> {
    if (status.value === "initialized") return Promise.resolve();
    if (loadingPromise) return loadingPromise;
    status.value = "loading";
    loadingPromise = getAnnotationTypePageApi({
      pageNo: 1,
      pageSize: ANNOTATION_TYPE_STORE_PAGE_SIZE,
      status: "ENABLED",
    })
      .then((result) => {
        annotationTypes.value = Array.isArray(result?.list) ? result.list : [];
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

  /** CRUD 成功后强制刷新全量集合，保证所有页面读取到最新数据。 */
  async function refresh(): Promise<void> {
    status.value = "uninitialized";
    await initialize();
  }
  void initialize().catch(() => undefined);
  return { annotationTypes, status: readonly(status), initialize, refresh };
});
