import { computed, readonly, ref } from "vue";

import Uppy, { type Meta } from "@uppy/core";
import GoldenRetriever from "@uppy/golden-retriever";
import Tus from "@uppy/tus";

import {
  countUnfinishedTasks,
  projectUploadTask,
} from "@/composables/upload/task";
import type { UploadTask } from "@/composables/upload/types";

type UploadMeta = Meta & {
  originalLastModified?: number;
};

const TUS_CHUNK_SIZE = 16 * 1024 * 1024;
const TUS_UPLOAD_LIMIT = 3;

const tasks = ref<UploadTask[]>([]);
const tusEndpoint = import.meta.env.VITE_TUS_ENDPOINT?.trim();
let uppyInstance: Uppy<UploadMeta> | null = null;

/** 将 Uppy 当前文件集合同步为 Vue 可消费的只读任务摘要。 */
function syncTasks(uppy: Uppy<UploadMeta>): void {
  tasks.value = uppy.getFiles().map((file) =>
    projectUploadTask({
      error: file.error ?? undefined,
      id: file.id,
      isPaused: file.isPaused,
      isRestored: file.isRestored,
      name: file.name,
      progress: file.progress,
      size: file.size,
      type: file.type,
    }),
  );
}

/** 延迟创建全局唯一的 Uppy 实例，避免业务页面产生重复队列。 */
function getUppy(): Uppy<UploadMeta> {
  if (uppyInstance) return uppyInstance;

  const uppy = new Uppy<UploadMeta>({ autoProceed: true });
  uppy.use(GoldenRetriever, {
    indexedDB: { name: "dm-global-upload" },
    serviceWorker: false,
  });

  if (tusEndpoint) {
    uppy.use(Tus, {
      chunkSize: TUS_CHUNK_SIZE,
      endpoint: tusEndpoint,
      limit: TUS_UPLOAD_LIMIT,
      retryDelays: [0, 1000, 3000, 5000, 10000],
    });
  }

  uppy.on("state-update", () => syncTasks(uppy));
  uppy.on("restored", () => syncTasks(uppy));
  uppyInstance = uppy;
  syncTasks(uppy);
  return uppy;
}

/** 添加文件到全局 Tus 队列，并记录刷新后核对原文件所需的元数据。 */
function addFile(file: File): string {
  if (!tusEndpoint) {
    throw new Error("VITE_TUS_ENDPOINT is not configured");
  }

  return getUppy().addFile({
    data: file,
    meta: { originalLastModified: file.lastModified },
    name: file.name,
    size: file.size,
    type: file.type,
  });
}

/** 暂停或继续指定上传任务。 */
function pauseResume(taskId: string): void {
  getUppy().pauseResume(taskId);
}

/** 重试失败的上传任务。 */
async function retry(taskId: string): Promise<void> {
  await getUppy().retryUpload(taskId);
}

/** 取消任务并从 Uppy 队列中移除。 */
function cancel(taskId: string): void {
  getUppy().removeFile(taskId);
}

/** 校验并重新绑定刷新前的原始文件，然后继续 Tus 上传。 */
async function reselectFile(taskId: string, file: File): Promise<boolean> {
  const uppy = getUppy();
  const restoredFile = uppy.getFile(taskId);
  const matches =
    restoredFile.name === file.name &&
    restoredFile.size === file.size &&
    restoredFile.type === file.type &&
    restoredFile.meta.originalLastModified === file.lastModified;

  if (!matches) return false;

  uppy.setFileState(taskId, {
    data: file,
    error: null,
    isGhost: false,
    isRestored: false,
  });
  await uppy.retryUpload(taskId);
  return true;
}

const unfinishedCount = computed(() => countUnfinishedTasks(tasks.value));

/** 有未完成任务时触发浏览器原生离开确认。 */
function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (unfinishedCount.value === 0) return;
  event.preventDefault();
  event.returnValue = "";
}

if (typeof window !== "undefined") {
  getUppy();
  window.addEventListener("beforeunload", handleBeforeUnload);
}

/** 获取全局上传队列及其受控操作。 */
export function useUpload() {
  return {
    addFile,
    cancel,
    pauseResume,
    reselectFile,
    retry,
    tasks: readonly(tasks),
    unfinishedCount,
  };
}
