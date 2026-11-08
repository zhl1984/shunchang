import { onBeforeUnmount, onMounted, reactive, ref, shallowRef } from "vue";

import type {
  QualityCommentContext,
  QualityCommentHistoryItem,
  QualityCommentLocateRequest,
  QualityCommentLocateResult,
  QualityCommentScope,
  QualityCommentSessionPayload,
  QualityCommentSubmitRequest,
  QualityCommentSubmitResult,
  QualityCommentTheme,
} from "./types";
import {
  createQualityCommentMessage,
  createQualityCommentRequestId,
  isQualityCommentMessage,
  normalizeQualityCommentError,
  normalizeQualityCommentHistory,
  normalizeQualityCommentLocateResult,
  normalizeQualityCommentSessionPayload,
  normalizeQualityCommentSubmitResult,
  QUALITY_COMMENT_PROTOCOL_VERSION,
} from "./protocol";

export interface QualityCommentBridgeHooks {
  onSessionChange?: (
    context: QualityCommentContext,
    history: QualityCommentHistoryItem[],
  ) => void;
  onSubmitResult?: (result: QualityCommentSubmitResult) => void;
  onLocateResult?: (result: QualityCommentLocateResult) => void;
  onHostError?: (message: string) => void;
  onHostClose?: () => void;
  onOpenHistory?: () => void;
}

const isStandalone = ref(window.parent === window);
const connected = ref(false);
const hostOrigin = ref(resolveHostOrigin());
const sessionId = ref(createQualityCommentRequestId());
const context = reactive<QualityCommentContext>(createEmptyContext());
const history = ref<QualityCommentHistoryItem[]>([]);
const activeScope = ref<QualityCommentScope>("CLIP");
const theme = ref<QualityCommentTheme>("dark");
const hostMessage = ref("");
const hostError = ref("");
const submitPending = ref(false);
const locatePendingCommentId = ref("");
const portRef = shallowRef<MessagePort | null>(null);
let currentSubmitRequestId = "";
let currentLocateRequestId = "";
let submitTimeout: number | undefined;
let messageListener: ((event: MessageEvent<unknown>) => void) | undefined;
let hooks: QualityCommentBridgeHooks = {};

/** 读取宿主 referrer 的 origin，便于 iframe 回包时使用明确的 targetOrigin。 */
function resolveHostOrigin() {
  try {
    return document.referrer
      ? new URL(document.referrer).origin
      : window.location.origin;
  } catch {
    return window.location.origin;
  }
}

/** 提供空白上下文，嵌入前不会伪造业务状态。 */
function createEmptyContext(): QualityCommentContext {
  return {
    taskId: "",
    platformSource: "",
    mode: "ANNOTATION",
    unit: {
      type: "CLIP",
      id: "",
    },
    revision: 0,
    theme: "dark",
    capabilities: {
      canCreateComment: false,
      canViewHistory: false,
      canLocateObject: false,
    },
  };
}

/** 将宿主消息统一写回当前会话快照，并在界面上恢复新上下文。 */
function applySessionPayload(
  payload: QualityCommentSessionPayload,
  forcedScope?: QualityCommentScope,
) {
  context.taskId = payload.context.taskId;
  context.taskName = payload.context.taskName;
  context.platformSource = payload.context.platformSource;
  context.hostAppId = payload.context.hostAppId;
  context.mode = payload.context.mode;
  context.unit = payload.context.unit;
  context.frame = payload.context.frame;
  context.selectedObject = payload.context.selectedObject;
  context.revision = payload.context.revision;
  context.theme = payload.context.theme ?? "dark";
  context.capabilities = payload.context.capabilities;
  activeScope.value = forcedScope ?? payload.openScope ?? activeScope.value;
  theme.value = payload.context.theme ?? "dark";
  history.value = payload.history ? [...payload.history] : [];
}

/** 覆盖历史列表并保持时间倒序，宿主只需要发送已整理好的展示快照。 */
function replaceHistory(nextHistory: QualityCommentHistoryItem[]) {
  history.value = [...nextHistory].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

/** 生成提交/定位日志摘要，避免把评论正文写入控制台。 */
function summarizeMessagePayload(event: string, payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const value = payload as Record<string, unknown>;
  if (event === "COMMENT_SUBMIT_REQUEST") {
    return {
      scope: value.scope,
      target: value.target,
      contentLength:
        typeof value.content === "string" ? value.content.length : undefined,
    };
  }
  if (event === "LOCATE_REQUEST") {
    return { commentId: value.commentId, target: value.target };
  }
  return undefined;
}

/** 给根窗口和可选 MessageChannel 同步发送消息，embedded 场景优先走端口。 */
function sendMessage<T>(
  event:
    | "READY"
    | "COMMENT_SUBMIT_REQUEST"
    | "HISTORY_REFRESH_REQUEST"
    | "LOCATE_REQUEST"
    | "CLOSE_REQUEST"
    | "RESIZE"
    | "ERROR",
  payload?: T,
  requestId = createQualityCommentRequestId(),
) {
  if (isStandalone.value) return requestId;
  // postMessage 只接受可结构化克隆的数据；历史项来自 Vue 响应式 Ref，发送前统一转为 JSON 快照。
  const serializablePayload =
    payload === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(payload)) as T);
  const message = createQualityCommentMessage(
    event,
    serializablePayload,
    sessionId.value,
    requestId,
    context.revision,
  );
  console.info("[quality-comment] 发送消息", {
    event,
    requestId,
    sessionId: sessionId.value,
    revision: context.revision,
    payload: summarizeMessagePayload(event, payload),
  });
  if (portRef.value) {
    portRef.value.postMessage(message);
    return requestId;
  }
  window.parent.postMessage(message, hostOrigin.value);
  return requestId;
}

/** 统一处理来自 window 或 MessagePort 的入站消息，先校验协议再分发。 */
function handleInboundMessage(
  eventData: unknown,
  port?: MessagePort,
  requestIdFallback = "",
) {
  if (!isQualityCommentMessage(eventData)) return;
  console.info("[quality-comment] 收到消息", {
    event: eventData.event,
    requestId: eventData.requestId,
    sessionId: eventData.sessionId,
    revision: eventData.revision,
    currentSubmitRequestId,
  });
  if (eventData.protocolVersion !== QUALITY_COMMENT_PROTOCOL_VERSION) return;
  if (eventData.sessionId !== sessionId.value) return;
  if (
    eventData.revision !== undefined &&
    context.revision > 0 &&
    eventData.revision < context.revision
  ) {
    return;
  }
  if (
    eventData.revision !== undefined &&
    context.revision > 0 &&
    !["INIT_CONTEXT", "OPEN_CLIP_COMMENT", "OPEN_OBJECT_COMMENT"].includes(
      eventData.event,
    ) &&
    eventData.revision !== context.revision
  ) {
    return;
  }

  connected.value = true;
  hostMessage.value = "";
  const fallbackRequestId = requestIdFallback || eventData.requestId;

  switch (eventData.event) {
    case "INIT_CONTEXT":
    case "OPEN_CLIP_COMMENT":
    case "OPEN_OBJECT_COMMENT": {
      const payload = normalizeQualityCommentSessionPayload(eventData.payload);
      if (!payload) {
        hostError.value = "收到的质检评论初始化上下文无效";
        hooks.onHostError?.(hostError.value);
        return;
      }
      if (port) attachPort(port);
      applySessionPayload(
        payload,
        eventData.event === "OPEN_CLIP_COMMENT"
          ? "CLIP"
          : eventData.event === "OPEN_OBJECT_COMMENT"
            ? "OBJECT"
            : undefined,
      );
      hooks.onSessionChange?.(context, history.value);
      return;
    }
    case "SET_HISTORY": {
      const nextHistory = normalizeQualityCommentHistory(eventData.payload);
      if (!nextHistory) return;
      replaceHistory(nextHistory);
      hooks.onSessionChange?.(context, history.value);
      return;
    }
    case "OPEN_HISTORY":
      hooks.onOpenHistory?.();
      return;
    case "SUBMIT_RESULT": {
      const result = normalizeQualityCommentSubmitResult(eventData.payload);
      if (!result) {
        console.error("[quality-comment] SUBMIT_RESULT 载荷无效", {
          requestId: eventData.requestId,
          payload: eventData.payload,
        });
        return;
      }
      if (
        !currentSubmitRequestId ||
        currentSubmitRequestId !== fallbackRequestId
      ) {
        console.error("[quality-comment] SUBMIT_RESULT 请求 ID 不匹配", {
          expected: currentSubmitRequestId,
          received: fallbackRequestId,
          success: result.success,
        });
        return;
      }
      submitPending.value = false;
      currentSubmitRequestId = "";
      clearSubmitTimeout();
      if (result.history) {
        replaceHistory(result.history);
      }
      console.info("[quality-comment] SUBMIT_RESULT 已处理", {
        requestId: fallbackRequestId,
        success: result.success,
        historyCount: result.history?.length,
      });
      hooks.onSubmitResult?.(result);
      return;
    }
    case "LOCATE_RESULT": {
      const result = normalizeQualityCommentLocateResult(eventData.payload);
      if (!result) return;
      if (
        !currentLocateRequestId ||
        currentLocateRequestId !== fallbackRequestId
      ) {
        return;
      }
      locatePendingCommentId.value = "";
      currentLocateRequestId = "";
      hooks.onLocateResult?.(result);
      return;
    }
    case "HOST_ERROR": {
      const message = normalizeQualityCommentError(eventData.payload);
      if (!message) return;
      hostError.value = message;
      hooks.onHostError?.(message);
      return;
    }
    case "CLOSE":
      hooks.onHostClose?.();
      return;
    default:
      return;
  }
}

/** 绑定 window 消息监听，组件卸载时必须同步移除。 */
function handleWindowMessage(event: MessageEvent<unknown>) {
  if (!isStandalone.value && event.origin !== hostOrigin.value) return;
  if (!isStandalone.value && event.source !== window.parent) return;
  handleInboundMessage(event.data, event.ports?.[0]);
}

/** 接管宿主转发过来的 MessageChannel 端口，作为后续主通信通道。 */
function attachPort(port: MessagePort) {
  if (portRef.value) {
    portRef.value.removeEventListener("message", handlePortMessage);
    portRef.value.close();
  }
  portRef.value = port;
  port.addEventListener("message", handlePortMessage);
  port.start();
}

/** 处理通过 MessageChannel 传来的消息，逻辑与 window 消息共用同一套分发。 */
function handlePortMessage(event: MessageEvent<unknown>) {
  handleInboundMessage(
    event.data,
    undefined,
    event.data && isQualityCommentMessage(event.data)
      ? event.data.requestId
      : "",
  );
}

/** 向宿主发送 READY，表示 iframe 已完成挂载并准备接收上下文。 */
function sendReady() {
  sendMessage("READY", {
    supportedFeatures: [
      "clip-comment",
      "object-comment",
      "history",
      "resize",
      "message-channel",
    ],
  });
}

/** 请求宿主执行评论新增，iframe 只负责收集草稿，不直接调用接口。 */
function requestSubmit(payload: QualityCommentSubmitRequest) {
  const requestId = createQualityCommentRequestId();
  submitPending.value = true;
  currentSubmitRequestId = requestId;
  console.info("[quality-comment] 开始等待提交回包", {
    requestId,
    scope: payload.scope,
    target: payload.target,
  });
  clearSubmitTimeout();
  // 宿主异常或网络请求悬挂时释放 loading，避免评论窗口永久不可操作。
  submitTimeout = window.setTimeout(() => {
    if (currentSubmitRequestId !== requestId) return;
    currentSubmitRequestId = "";
    submitPending.value = false;
    hostError.value = "质检评论保存超时，请重试";
    console.error("[quality-comment] 提交响应超时", { requestId });
  }, 15000);
  try {
    sendMessage("COMMENT_SUBMIT_REQUEST", payload, requestId);
  } catch (error) {
    // 消息发送失败时及时释放 loading，避免 iframe 永久停留在提交中状态。
    console.error("[quality-comment] 提交消息发送失败", error);
    submitPending.value = false;
    currentSubmitRequestId = "";
    clearSubmitTimeout();
    hostError.value = "质检评论提交失败，请重试";
  }
  return requestId;
}

/** 清理提交超时计时器，避免成功回包后仍触发超时状态。 */
function clearSubmitTimeout() {
  if (submitTimeout === undefined) return;
  window.clearTimeout(submitTimeout);
  submitTimeout = undefined;
}

/** 请求宿主定位评论关联对象，3D 和 4D 的具体切换逻辑都由宿主处理。 */
function requestLocate(payload: QualityCommentLocateRequest) {
  const requestId = createQualityCommentRequestId();
  locatePendingCommentId.value = payload.commentId;
  currentLocateRequestId = requestId;
  sendMessage("LOCATE_REQUEST", payload, requestId);
  return requestId;
}

/** 请求宿主刷新历史，适合提交成功或外部状态切换后重拉数据。 */
function requestHistoryRefresh() {
  sendMessage("HISTORY_REFRESH_REQUEST", {
    taskId: context.taskId,
    unitId: context.unit.id,
    scope: activeScope.value,
  });
}

/** 请求宿主关闭当前窗口，真正的 iframe 移除仍由宿主控制。 */
function requestClose() {
  sendMessage("CLOSE_REQUEST", {
    taskId: context.taskId,
    unitId: context.unit.id,
  });
}

/** 请求宿主根据当前内容同步 iframe 高度，防止内部出现双滚动条。 */
function requestResize(height: number) {
  sendMessage("RESIZE", { height });
}

/** 手工切换主题，iframe 只信任宿主传入的显式主题值。 */
function setTheme(nextTheme: QualityCommentTheme) {
  theme.value = nextTheme;
  context.theme = nextTheme;
}

/** 复写当前会话上下文，主要供 demo 和宿主初始化复用。 */
function setContext(nextContext: QualityCommentContext) {
  applySessionPayload({ context: nextContext });
}

/** 直接替换历史列表，供 demo 首屏或宿主重置使用。 */
function setHistory(nextHistory: QualityCommentHistoryItem[]) {
  replaceHistory(nextHistory);
}

/** 设置当前活跃 scope，方便宿主在同一子应用内切换两类评论窗。 */
function setActiveScope(nextScope: QualityCommentScope) {
  activeScope.value = nextScope;
}

/** 在 standalone demo 下追加一条本地历史，避免直接打开时页面空白。 */
function appendHistory(nextItem: QualityCommentHistoryItem) {
  replaceHistory([nextItem, ...history.value]);
}

/** 注册桥接钩子，子应用页面可在初始化时接收提交成功或定位结果回调。 */
function useQualityCommentBridge(nextHooks: QualityCommentBridgeHooks = {}) {
  hooks = nextHooks;
  onMounted(() => {
    messageListener = handleWindowMessage;
    window.addEventListener("message", messageListener);
    sendReady();
  });
  onBeforeUnmount(() => {
    clearSubmitTimeout();
    if (messageListener) {
      window.removeEventListener("message", messageListener);
    }
    if (portRef.value) {
      portRef.value.removeEventListener("message", handlePortMessage);
      portRef.value.close();
    }
  });
  return {
    isStandalone,
    connected,
    hostOrigin,
    sessionId,
    context,
    history,
    activeScope,
    theme,
    hostMessage,
    hostError,
    submitPending,
    locatePendingCommentId,
    attachPort,
    requestSubmit,
    requestLocate,
    requestHistoryRefresh,
    requestClose,
    requestResize,
    setTheme,
    setContext,
    setHistory,
    setActiveScope,
    appendHistory,
  };
}

export {
  useQualityCommentBridge,
  createQualityCommentRequestId,
  createQualityCommentMessage,
};
