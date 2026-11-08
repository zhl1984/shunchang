<template>
  <main class="quality-comment-page">
    <QualityCommentEntry
      :entry="entry"
      :context="context"
      :history="history"
      :content="draft.content"
      :severity="draft.severity"
      :submitting="submitting"
      :error-message="validationMessage"
      @update:content="draft.content = $event"
      @update:severity="draft.severity = $event"
      @submit="handleSubmit"
      @locate="handleLocate"
    />
  </main>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { message } from "ant-design-vue";

import {
  createQualityCommentApi,
  getQualityCommentHistoryApi,
} from "@/api/quality-comment";
import QualityCommentEntry from "./components/QualityCommentEntry.vue";
import type {
  QualityCommentContext,
  QualityCommentHistoryItem,
  QualityCommentSeverity,
} from "@/quality-comment/types";
import {
  buildQualityCommentSubmitRequest,
  validateQualityCommentContent,
} from "@/quality-comment/validation";

type Entry = "clip" | "object" | "history" | "invalid";

const query = new URLSearchParams(window.location.search);
const rawEntry = query.get("entry") || "";
const entry: Entry =
  rawEntry === "clip" || rawEntry === "object" || rawEntry === "history"
    ? rawEntry
    : "invalid";
const taskId = query.get("taskId") || "";
const annotationTaskId = query.get("annotationTaskId") || taskId;
const qualityTaskId = query.get("qualityTaskId")?.trim() || "";
const itemId =
  query.get("itemId") || query.get("clipId") || query.get("sampleId") || "";
const platformSource = query.get("platformSource") || "pc-tool";
const objectId = query.get("objectId") || undefined;

const context = reactive<QualityCommentContext>({
  taskId,
  qualityTaskId,
  taskName: query.get("taskName") || undefined,
  platformSource,
  hostAppId: query.get("hostAppId") || undefined,
  mode: query.get("mode") === "qc" ? "QUALITY" : "ANNOTATION",
  unit: {
    type: "CLIP",
    id: itemId,
    name: query.get("itemName") || undefined,
  },
  frame: query.get("frameId")
    ? {
        id: query.get("frameId") || "",
        no: Number(query.get("frameNo")) || undefined,
      }
    : undefined,
  selectedObject: objectId
    ? {
        id: objectId,
        labelId: query.get("labelId") || undefined,
        labelCode: query.get("labelCode") || undefined,
        labelName: query.get("labelName") || undefined,
        tracingId: query.get("tracingId") || undefined,
      }
    : undefined,
  revision: 1,
  theme: "dark",
  capabilities: {
    canCreateComment: true,
    canViewHistory: true,
    canLocateObject: true,
  },
});

const draft = reactive<{ content: string; severity: QualityCommentSeverity }>({
  content: "",
  severity: "MUST_FIX",
});
const history = ref<QualityCommentHistoryItem[]>([]);
const submitting = ref(false);
const pageError = ref("");

/** 页面错误通过全局消息提示，避免错误内容撑开评论窗口布局。 */
watch(pageError, (errorMessage) => {
  if (errorMessage) message.error(errorMessage);
});

const validationMessage = computed(() => {
  const error = validateQualityCommentContent(draft.content);
  if (!error) return "";
  return error.code === "required"
    ? ""
    : `评论最多 ${error.limit ?? 1000} 字符`;
});

/** 根据 URL 是否携带 qualityTaskId 读取对应历史。 */
async function loadHistory() {
  if (entry === "invalid" || (entry !== "history" && !itemId)) return;
  try {
    history.value = await getQualityCommentHistoryApi(
      annotationTaskId,
      entry === "history" ? undefined : itemId,
      context.unit.type,
      platformSource,
      qualityTaskId || undefined,
    );
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : "质检历史加载失败";
  }
}

/** 将保存结果通知 iframe 宿主，宿主负责关闭窗口和展示全局提示。 */
function notifyHost(
  type: "SUBMIT_SUCCESS" | "SUBMIT_ERROR" | "LOCATE" | "CLOSE",
  payload?: unknown,
) {
  if (window.parent === window) return;
  const origin = document.referrer
    ? new URL(document.referrer).origin
    : window.location.origin;
  window.parent.postMessage(
    { channel: "quality-comment", type, payload },
    origin,
  );
}

/** 兼容 iframe 宿主握手：页面业务状态以 URL 为准，INIT 仅补充宿主快照。 */
function handleHostMessage(event: MessageEvent<unknown>) {
  if (
    event.source !== window.parent ||
    !event.data ||
    typeof event.data !== "object"
  )
    return;
  const message = event.data as {
    channel?: string;
    event?: string;
    payload?: {
      context?: Partial<QualityCommentContext>;
      history?: QualityCommentHistoryItem[];
    };
  };
  if (message.channel !== "quality-comment") return;
  if (message.event === "INIT_CONTEXT") {
    const incoming = message.payload?.context;
    if (incoming) Object.assign(context, incoming);
    if (message.payload?.history) history.value = message.payload.history;
  }
}

/** 保存样本级或标签级评论，成功后刷新历史并通知宿主关闭 iframe。 */
async function handleSubmit() {
  if (
    entry === "invalid" ||
    entry === "history" ||
    submitting.value ||
    !qualityTaskId ||
    !itemId ||
    !draft.content.trim() ||
    validationMessage.value
  )
    return;
  if (entry === "object" && !context.selectedObject?.id) {
    pageError.value = "缺少标签对象信息，无法提交评论";
    return;
  }
  submitting.value = true;
  pageError.value = "";
  try {
    const request = buildQualityCommentSubmitRequest(
      context,
      entry === "object" ? "OBJECT" : "CLIP",
      draft,
    );
    const commentId = await createQualityCommentApi({
      qualityTaskId,
      itemId,
      itemName: context.unit.name,
      annotationObjectId: request.target.objectId || null,
      annotationObjectName: request.target.labelName || null,
      issueLevel: request.severity,
      description: request.content,
    });
    await loadHistory();
    notifyHost("SUBMIT_SUCCESS", { commentId, qualityTaskId });
    draft.content = "";
    draft.severity = "MUST_FIX";
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : "质检意见保存失败，请重试";
    notifyHost("SUBMIT_ERROR", { message: pageError.value });
  } finally {
    submitting.value = false;
  }
}

/** 历史卡片定位只回传目标快照，不在管理端页面操作 pc-tool 编辑器。 */
function handleLocate(item: QualityCommentHistoryItem) {
  notifyHost("LOCATE", { commentId: item.id, target: item.target });
}

onMounted(() => {
  window.addEventListener("message", handleHostMessage);
  if (window.parent !== window) {
    const origin = document.referrer
      ? new URL(document.referrer).origin
      : window.location.origin;
    window.parent.postMessage(
      {
        channel: "quality-comment",
        event: "READY",
        protocolVersion: "1.0",
        sessionId: "route-page",
        requestId: "route-page",
      },
      origin,
    );
  }
  if (entry === "invalid")
    pageError.value = `不支持的质检入口：${rawEntry || "空"}`;
  else if (entry !== "history" && !itemId) pageError.value = "缺少样本 ID";
  void loadHistory();
});

onBeforeUnmount(() => window.removeEventListener("message", handleHostMessage));
</script>

<style scoped lang="less">
.quality-comment-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0;
  height: auto;
  min-height: 0;
  padding: 0;
  overflow: visible;
  background: var(--dm-bg-layout);
}

.quality-comment-page :deep(.quality-comment-history-list) {
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}

.quality-comment-page :deep(.quality-comment-entry__surface) {
  flex: 0 1 auto;
}

.quality-comment-page :deep(.ant-card-body) {
  padding: 0;
}
</style>
