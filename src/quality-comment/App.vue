<template>
  <ConfigProvider :theme="themeConfig">
    <main
      ref="rootRef"
      class="quality-comment-app"
      :class="{ 'quality-comment-app--history': contentMode === 'HISTORY' }"
    >
      <section
        class="quality-comment-app__body"
        :class="{
          'quality-comment-app__body--history': contentMode === 'HISTORY',
        }"
      >
        <div
          v-if="contentMode === 'HISTORY'"
          class="quality-comment-app__history"
        >
          <QualityCommentHistoryList
            :history="historyItems"
            :locate-pending-comment-id="locatePendingCommentId"
            @locate="handleLocate"
          />
        </div>

        <a-card v-else :bordered="false" class="quality-comment-app__surface">
          <ClipQualityCommentPanel
            v-if="panelMode === 'CLIP'"
            :context="bridge.context"
            :content="clipDraft.content"
            :severity="clipDraft.severity"
            :submitting="submitPending"
            :error-message="clipValidationMessage"
            @update:content="handleClipContentChange"
            @update:severity="clipDraft.severity = $event"
            @submit="handleSubmit('CLIP')"
          />

          <ObjectQualityCommentPanel
            v-else
            :context="bridge.context"
            :content="objectDraft.content"
            :severity="objectDraft.severity"
            :submitting="submitPending"
            :error-message="objectValidationMessage"
            @update:content="handleObjectContentChange"
            @update:severity="objectDraft.severity = $event"
            @submit="handleSubmit('OBJECT')"
          />
        </a-card>
      </section>

      <QualityCommentHistoryDrawer
        v-if="contentMode !== 'HISTORY'"
        :open="historyOpen"
        title="质检历史"
        :history="historyItems"
        :locate-pending-comment-id="locatePendingCommentId"
        @close="historyOpen = false"
        @locate="handleLocate"
      />
    </main>
  </ConfigProvider>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { ConfigProvider, theme } from "ant-design-vue";

import { useQualityCommentBridge } from "./bridge";
import ClipQualityCommentPanel from "./components/ClipQualityCommentPanel.vue";
import ObjectQualityCommentPanel from "./components/ObjectQualityCommentPanel.vue";
import QualityCommentHistoryDrawer from "./components/QualityCommentHistoryDrawer.vue";
import QualityCommentHistoryList from "./components/QualityCommentHistoryList.vue";
import type {
  QualityCommentContext,
  QualityCommentHistoryItem,
  QualityCommentScope,
  QualityCommentSeverity,
} from "./types";
import {
  buildQualityCommentSubmitRequest,
  validateQualityCommentContent,
} from "./validation";

const clipDraft = reactive({
  content: "",
  severity: "MUST_FIX" as QualityCommentSeverity,
});
const objectDraft = reactive({
  content: "",
  severity: "MUST_FIX" as QualityCommentSeverity,
});
const panelMode = ref<QualityCommentScope>("CLIP");
const historyOpen = ref(false);
const contentMode = ref<"COMMENT" | "HISTORY">("COMMENT");
const rootRef = ref<HTMLElement>();
const statusNotice = ref("");
const statusNoticeType = ref<"info" | "success" | "error">("info");

/** 顶部状态提示优先展示宿主反馈，其次展示当前 iframe 的本地流程通知。 */
const bridge = useQualityCommentBridge({
  onSessionChange() {
    console.info("[quality-comment] 会话上下文已更新", {
      context: bridge.context,
      historyCount: bridge.history.value.length,
      scope: bridge.activeScope.value,
    });
    contentMode.value = "COMMENT";
    panelMode.value = bridge.activeScope.value;
    nextTick(() => bridge.requestResize(rootRef.value?.scrollHeight ?? 0));
    statusNotice.value = "";
    statusNoticeType.value = "info";
  },
  onSubmitResult(result) {
    // 成功后的提示和关闭由工作台处理；失败只展示错误并保留当前草稿。
    if (result.success) return;
    statusNoticeType.value = "error";
    statusNotice.value = result.message || "质检意见保存失败，请重试";
  },
  onLocateResult(result) {
    statusNoticeType.value = result.status === "located" ? "success" : "error";
    statusNotice.value =
      result.message ||
      (result.status === "located"
        ? "已请求宿主定位目标"
        : result.status === "missing"
          ? "目标对象已不存在"
          : "宿主拒绝定位请求");
  },
  onHostError(message) {
    statusNoticeType.value = "error";
    statusNotice.value = message;
  },
  onHostClose() {
    statusNoticeType.value = "info";
    statusNotice.value = "宿主已关闭评论窗口";
  },
  onOpenHistory() {
    contentMode.value = "HISTORY";
    historyOpen.value = true;
  },
});

// bridge 返回的 ref 在模板中通过顶层 computed 解包，避免把 Ref 对象传给 Ant Design 组件。
const historyItems = computed(() => bridge.history.value);
const submitPending = computed(() => bridge.submitPending.value);
const locatePendingCommentId = computed(
  () => bridge.locatePendingCommentId.value,
);

/** 主题完全由宿主上下文驱动，子应用只负责把算法映射到 antd。 */
const themeConfig = computed(() => ({
  algorithm:
    bridge.theme.value === "light"
      ? theme.defaultAlgorithm
      : theme.darkAlgorithm,
  token: {
    colorPrimary: "#1677ff",
  },
}));

/** 样本级输入只在用户已经开始输入时显示字段错误，避免首屏就出现红色提示。 */
const clipValidationMessage = computed(() =>
  resolveDraftValidationMessage(clipDraft.content),
);

/** 对象级输入沿用同一套校验规则，便于和宿主保存逻辑保持一致。 */
const objectValidationMessage = computed(() =>
  resolveDraftValidationMessage(objectDraft.content),
);

/** 宿主返回定位结果后只展示结果，不在 iframe 内执行对象切换。 */
function handleLocate(item: QualityCommentHistoryItem) {
  bridge.requestLocate({
    commentId: item.id,
    target: item.target,
  });
  statusNoticeType.value = "info";
  statusNotice.value = "已请求宿主定位关联对象";
}

/** 提交时只做前端文本校验，真正的目标归属校验仍由宿主负责。 */
function handleSubmit(scope: QualityCommentScope) {
  const draft = scope === "CLIP" ? clipDraft : objectDraft;
  console.info("[quality-comment] 提交点击", {
    scope,
    contentLength: draft.content.trim().length,
    taskId: bridge.context.taskId,
    unitId: bridge.context.unit.id,
    objectId: bridge.context.selectedObject?.id,
  });
  const validationError = validateQualityCommentContent(draft.content);
  if (validationError) {
    console.info("[quality-comment] 提交被前端校验拦截", validationError);
    statusNoticeType.value = "error";
    statusNotice.value =
      validationError.code === "required"
        ? "评论内容不能为空"
        : `评论最多 ${validationError.limit ?? 1000} 字符`;
    return;
  }
  if (scope === "OBJECT" && !bridge.context.selectedObject) {
    console.info("[quality-comment] 提交被对象上下文校验拦截");
    statusNoticeType.value = "error";
    statusNotice.value = "当前上下文缺少对象快照，无法提交标签评论";
    return;
  }
  const request = buildQualityCommentSubmitRequest(
    bridge.context,
    scope,
    draft,
  );
  if (bridge.isStandalone.value) {
    bridge.appendHistory(createDemoHistoryItem(request, bridge.context, scope));
    statusNoticeType.value = "success";
    statusNotice.value = "质检意见已保存";
    resetDraft(scope);
    return;
  }
  const requestId = bridge.requestSubmit(request);
  console.info("[quality-comment] 已发送提交请求", {
    requestId,
    scope: request.scope,
    target: request.target,
    contentLength: request.content.length,
  });
  statusNoticeType.value = "info";
  statusNotice.value = "正在保存质检意见";
}

/** 用户修改输入后如果错误已消除，顶部失败提示同步清空，避免旧错误滞留。 */
function handleClipContentChange(value: string) {
  clipDraft.content = value;
  clearResolvedValidationNotice(value);
}

/** 对象级输入与样本级共用同一套失败提示清理策略。 */
function handleObjectContentChange(value: string) {
  objectDraft.content = value;
  clearResolvedValidationNotice(value);
}

/** 根据提交场景清空当前草稿，成功后保留一个干净的输入区。 */
function resetDraft(scope: QualityCommentScope) {
  const draft = scope === "CLIP" ? clipDraft : objectDraft;
  draft.content = "";
  draft.severity = "MUST_FIX";
}

/** 仅在用户已有输入时展示字段错误，空白初始态保持安静。 */
function resolveDraftValidationMessage(content: string) {
  if (!content) return "";
  const error = validateQualityCommentContent(content);
  if (!error) return "";
  return error.code === "required"
    ? "评论内容不能为空"
    : `评论最多 ${error.limit ?? 1000} 字符`;
}

/** 当当前输入已经有效时，清掉顶部的本地校验失败提示。 */
function clearResolvedValidationNotice(content: string) {
  if (statusNoticeType.value !== "error") return;
  if (bridge.hostError.value) return;
  if (validateQualityCommentContent(content)) return;
  if (
    statusNotice.value === "评论内容不能为空" ||
    statusNotice.value.startsWith("评论最多 ")
  ) {
    statusNotice.value = "";
    statusNoticeType.value = "info";
  }
}

/** 生成直接预览时使用的 demo 历史，避免未接宿主时页面完全空白。 */
function createDemoHistoryItem(
  request: ReturnType<typeof buildQualityCommentSubmitRequest>,
  context: QualityCommentContext,
  scope: QualityCommentScope,
): QualityCommentHistoryItem {
  return {
    id: `demo-${Date.now()}`,
    scope,
    content: request.content,
    severity: request.severity,
    reviewerName: "Demo Reviewer",
    createdAt: new Date().toISOString(),
    target: request.target,
    objectExists: context.selectedObject ? true : undefined,
  };
}

/** standalone 预览时注入一份显式 demo 上下文，不影响 iframe 嵌入场景。 */
function applyStandaloneDemo() {
  if (!bridge.isStandalone.value) return;
  bridge.setContext({
    taskId: "demo-task-001",
    taskName: "Demo 质检任务",
    platformSource: "quality-comment-demo",
    hostAppId: "fe-management",
    mode: "QUALITY",
    unit: { type: "CLIP", id: "demo-clip-001", name: "Demo Clip 001" },
    frame: { id: "frame-0008", no: 8 },
    selectedObject: {
      id: "object-1008",
      labelId: "label-88",
      labelCode: "QC-88",
      labelName: "示例标签",
      tracingId: "trace-1008",
    },
    revision: 1,
    theme: "dark",
    capabilities: {
      canCreateComment: true,
      canViewHistory: true,
      canLocateObject: true,
    },
  });
  bridge.setHistory([
    {
      id: "demo-history-2",
      scope: "OBJECT",
      content: "对象轮廓需要再确认一次。",
      severity: "SUGGESTION",
      reviewerName: "Demo Reviewer",
      createdAt: "2026-08-28T08:30:00.000Z",
      target: {
        taskId: "demo-task-001",
        unitType: "CLIP",
        unitId: "demo-clip-001",
        frameId: "frame-0008",
        frameNo: 8,
        objectId: "object-1008",
        labelId: "label-88",
        labelCode: "QC-88",
        labelName: "示例标签",
        tracingId: "trace-1008",
        platformSource: "quality-comment-demo",
      },
      objectExists: true,
    },
    {
      id: "demo-history-1",
      scope: "CLIP",
      content: "样本级建议检查遮挡区域。",
      severity: "MUST_FIX",
      reviewerName: "Demo Reviewer",
      createdAt: "2026-08-28T07:20:00.000Z",
      target: {
        taskId: "demo-task-001",
        unitType: "CLIP",
        unitId: "demo-clip-001",
        platformSource: "quality-comment-demo",
      },
      objectExists: true,
    },
    {
      id: "demo-history-3",
      scope: "CLIP",
      content: "样本级建议检查连续帧中的光照变化。",
      severity: "SUGGESTION",
      reviewerName: "Quality Reviewer",
      createdAt: "2026-08-27T16:42:00.000Z",
      target: {
        taskId: "demo-task-001",
        unitType: "CLIP",
        unitId: "demo-clip-001",
        platformSource: "quality-comment-demo",
      },
    },
    {
      id: "demo-history-4",
      scope: "OBJECT",
      content: "对象标签在相邻帧中有短暂丢失，建议检查轨迹连续性。",
      severity: "MUST_FIX",
      reviewerName: "Quality Reviewer",
      createdAt: "2026-08-27T15:18:00.000Z",
      target: {
        taskId: "demo-task-001",
        unitType: "CLIP",
        unitId: "demo-clip-001",
        frameId: "frame-0007",
        frameNo: 7,
        objectId: "object-1008",
        labelId: "label-88",
        labelCode: "QC-88",
        labelName: "示例标签",
        tracingId: "trace-1008",
        platformSource: "quality-comment-demo",
      },
      objectExists: true,
    },
    {
      id: "demo-history-5",
      scope: "OBJECT",
      content: "关联对象已删除，保留历史记录供追溯。",
      severity: "SUGGESTION",
      reviewerName: "Quality Reviewer",
      createdAt: "2026-08-26T11:06:00.000Z",
      target: {
        taskId: "demo-task-001",
        unitType: "CLIP",
        unitId: "demo-clip-001",
        frameId: "frame-0006",
        frameNo: 6,
        objectId: "object-deleted",
        labelName: "示例标签",
        platformSource: "quality-comment-demo",
      },
      objectExists: false,
    },
  ]);
  bridge.setActiveScope("CLIP");
  bridge.setTheme("dark");
}

let resizeObserver: ResizeObserver | undefined;

onMounted(() => {
  applyStandaloneDemo();
  nextTick(() => {
    bridge.requestResize(rootRef.value?.scrollHeight ?? 0);
  });
  if (rootRef.value && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      bridge.requestResize(
        Math.ceil(rootRef.value?.scrollHeight ?? entry.contentRect.height),
      );
    });
    resizeObserver.observe(rootRef.value);
  }
});

/** 根节点主题类只跟随宿主下发主题变化，不读取系统主题状态。 */
watch(
  () => bridge.theme.value,
  (nextTheme) => {
    document.documentElement.classList.toggle(
      "theme-dark",
      nextTheme === "dark",
    );
    document.documentElement.classList.toggle(
      "theme-light",
      nextTheme === "light",
    );
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<style scoped lang="less">
.quality-comment-app {
  box-sizing: border-box;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  background:
    radial-gradient(circle at top left, rgb(22 119 255 / 14%), transparent 28%),
    radial-gradient(
      circle at top right,
      rgb(250 173 20 / 10%),
      transparent 24%
    ),
    var(--dm-bg-layout);
}

.quality-comment-app__body {
  min-height: 0;
  overflow: visible;
  display: block;
}

.quality-comment-app__body--history {
  display: flex;
  flex: 1;
  min-height: 0;
}

.quality-comment-app__history {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.quality-comment-app--history {
  height: 100%;
  min-height: 100%;
}

.quality-comment-app__surface {
  min-height: 0;
  overflow: visible;
}

.quality-comment-app__surface {
  border: 1px solid var(--dm-border-2);
  border-radius: 18px;
  background: var(--dm-bg-container);
  box-shadow: 0 12px 28px rgb(31 56 88 / 4%);
}

.quality-comment-app__surface :deep(.ant-card-body) {
  padding: 0;
}

.quality-comment-app__segmented {
  margin-bottom: 16px;
}

@media (width <= 768px) {
  .quality-comment-app {
    padding: 0;
  }
}
</style>
