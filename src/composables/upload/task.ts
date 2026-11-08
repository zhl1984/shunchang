import type {
  UploadFileSnapshot,
  UploadTask,
  UploadTaskStatus,
} from "@/composables/upload/types";

const FINISHED_STATUSES: UploadTaskStatus[] = ["completed", "cancelled"];

/** 根据 Uppy 文件快照推导平台统一的上传任务状态。 */
function getTaskStatus(file: UploadFileSnapshot): UploadTaskStatus {
  if (file.progress.uploadComplete) return "completed";
  if (file.isRestored) return "needs-file";
  if (file.error) return "error";
  if (file.isPaused) return "paused";
  if (file.progress.uploadStarted !== null) return "uploading";
  return "queued";
}

/** 将 Uppy 文件状态转换为供 UI 使用的稳定任务摘要。 */
export function projectUploadTask(file: UploadFileSnapshot): UploadTask {
  const bytesTotal = file.progress.bytesTotal ?? file.size ?? 0;
  const bytesUploaded = file.progress.bytesUploaded || 0;
  const percent =
    bytesTotal > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((bytesUploaded / bytesTotal) * 100)),
        )
      : 0;

  return {
    bytesTotal,
    bytesUploaded,
    error: file.error,
    id: file.id,
    name: file.name,
    percent,
    size: file.size ?? bytesTotal,
    status: getTaskStatus(file),
    type: file.type,
  };
}

/** 统计需要用户关注的未完成上传任务数量。 */
export function countUnfinishedTasks(tasks: readonly UploadTask[]): number {
  return tasks.filter((task) => !FINISHED_STATUSES.includes(task.status))
    .length;
}
