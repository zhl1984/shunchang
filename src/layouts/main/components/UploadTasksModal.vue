<script setup lang="ts">
import { message } from "ant-design-vue";
import { useI18n } from "vue-i18n";

import { useUpload, type UploadTask } from "@/composables/upload";
import { formatFileSize } from "@/utils/format";

defineOptions({ name: "UploadTasksModal" });

defineProps<{ open: boolean }>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const { t } = useI18n();
const { reselectFile, retry, tasks } = useUpload();

/** 将内部任务状态转换为国际化显示文案。 */
function getStatusText(status: UploadTask["status"]): string {
  const statusKeys: Record<UploadTask["status"], string> = {
    cancelled: "cancelled",
    completed: "completed",
    error: "error",
    "needs-file": "needsFile",
    paused: "paused",
    queued: "queued",
    uploading: "uploading",
  };
  return t(`header.upload.status.${statusKeys[status]}`);
}

/** 重试失败任务并为不可恢复错误提供明确反馈。 */
async function handleRetry(taskId: string): Promise<void> {
  try {
    await retry(taskId);
  } catch {
    message.error(t("header.upload.feedback.retryFailed"));
  }
}

/** 重新选择原文件并校验文件指纹，匹配后继续 Tus 上传。 */
async function handleFileChange(taskId: string, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  const matched = await reselectFile(taskId, file);
  if (!matched) message.error(t("header.upload.feedback.mismatch"));
}
</script>

<template>
  <a-modal
:footer="null" :open="open" :title="t('header.upload.title')" :width="720"
    @cancel="emit('update:open', false)">
    <a-empty v-if="tasks.length === 0" :description="t('header.upload.empty')" />

    <div v-else class="upload-tasks flex flex-column gap-12">
      <div v-for="task in tasks" :key="task.id" class="upload-tasks__item">
        <div class="flex-between gap-16">
          <div class="flex-1">
            <div class="upload-tasks__name font-base">{{ task.name }}</div>
            <div class="upload-tasks__meta font-xs m-t-4">
              {{ formatFileSize(task.bytesUploaded) }} /
              {{ formatFileSize(task.bytesTotal) }} ·
              {{ getStatusText(task.status) }}
            </div>
          </div>

          <div class="flex items-center gap-8">
            <!-- <a-button
              v-if="task.status === 'uploading'"
              size="small"
              @click="pauseResume(task.id)"
            >
              {{ t("header.upload.actions.pause") }}
            </a-button>
            <a-button
              v-else-if="task.status === 'paused'"
              size="small"
              @click="pauseResume(task.id)"
            >
              {{ t("header.upload.actions.resume") }}
            </a-button> -->
            <a-button v-if="task.status === 'error'" size="small" @click="handleRetry(task.id)">
              {{ t("header.upload.actions.retry") }}
            </a-button>

            <label v-if="task.status === 'needs-file'" class="upload-tasks__file-label">
              <input class="upload-tasks__file-input" type="file" @change="handleFileChange(task.id, $event)" />
              {{ t("header.upload.actions.reselect") }}
            </label>

            <!-- <a-button
              v-if="task.status !== 'completed'"
              danger
              size="small"
              type="text"
              @click="cancel(task.id)"
            >
              {{ t("header.upload.actions.cancel") }}
            </a-button> -->
          </div>
        </div>

        <a-progress
class="m-t-12" :percent="task.percent" :status="task.status === 'error' ? 'exception' : 'normal'"
          size="small" />
        <div v-if="task.error" class="upload-tasks__error font-xs m-t-4">
          {{ task.error }}
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped lang="less">
.upload-tasks {
  max-height: 520px;
  overflow-y: auto;

  &__item {
    padding: 16px;
    border: 1px solid var(--dm-border-2);
    border-radius: 6px;
  }

  &__name {
    color: var(--dm-text);
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  &__meta {
    color: var(--dm-text-3);
  }

  &__error {
    color: var(--dm-error);
  }

  &__file-label {
    padding: 3px 7px;
    border: 1px solid var(--dm-border);
    border-radius: 4px;
    cursor: pointer;
  }

  &__file-input {
    display: none;
  }
}
</style>
