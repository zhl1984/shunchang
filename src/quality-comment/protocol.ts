import type {
  QualityCommentHistoryItem,
  QualityCommentLocateRequest,
  QualityCommentLocateResult,
  QualityCommentScope,
  QualityCommentSessionPayload,
  QualityCommentSeverity,
  QualityCommentSubmitRequest,
  QualityCommentSubmitResult,
  QualityCommentTargetSnapshot,
  QualityCommentWorkbenchMode,
} from "./types";

export const QUALITY_COMMENT_CHANNEL = "quality-comment";
export const QUALITY_COMMENT_PROTOCOL_VERSION = "1.0";

export type QualityCommentEvent =
  | "READY"
  | "INIT_CONTEXT"
  | "OPEN_CLIP_COMMENT"
  | "OPEN_OBJECT_COMMENT"
  | "OPEN_HISTORY"
  | "SET_HISTORY"
  | "COMMENT_SUBMIT_REQUEST"
  | "SUBMIT_RESULT"
  | "HISTORY_REFRESH_REQUEST"
  | "LOCATE_REQUEST"
  | "LOCATE_RESULT"
  | "CLOSE_REQUEST"
  | "CLOSE"
  | "HOST_ERROR"
  | "RESIZE"
  | "ERROR";

export interface QualityCommentMessage<T = unknown> {
  channel: typeof QUALITY_COMMENT_CHANNEL;
  protocolVersion: typeof QUALITY_COMMENT_PROTOCOL_VERSION;
  event: QualityCommentEvent;
  sessionId: string;
  requestId: string;
  revision?: number;
  payload?: T;
}

export interface QualityCommentReadyPayload {
  supportedFeatures: string[];
}

export interface QualityCommentResizePayload {
  height: number;
}

export interface QualityCommentErrorPayload {
  message: string;
}

export type QualityCommentSessionEventPayload = QualityCommentSessionPayload;

export type QualityCommentSubmitResultPayload = QualityCommentSubmitResult;

export type QualityCommentLocateResultPayload = QualityCommentLocateResult;

/** 生成跨窗口消息的唯一请求编号，便于宿主和 iframe 对齐异步结果。 */
export function createQualityCommentRequestId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `quality-comment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** 统一构造评论协议 envelope，消息体保持纯 JSON 结构。 */
export function createQualityCommentMessage<T>(
  event: QualityCommentEvent,
  payload: T | undefined,
  sessionId: string,
  requestId = createQualityCommentRequestId(),
  revision?: number,
): QualityCommentMessage<T> {
  return {
    channel: QUALITY_COMMENT_CHANNEL,
    protocolVersion: QUALITY_COMMENT_PROTOCOL_VERSION,
    event,
    sessionId,
    requestId,
    revision,
    payload,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isScope(value: unknown): value is QualityCommentScope {
  return value === "CLIP" || value === "OBJECT";
}

function isSeverity(value: unknown): value is QualityCommentSeverity {
  return value === "MUST_FIX" || value === "SUGGESTION";
}

function isWorkbenchMode(value: unknown): value is QualityCommentWorkbenchMode {
  return value === "ANNOTATION" || value === "QUALITY";
}

function isUnitType(value: unknown): value is "SAMPLE" | "CLIP" {
  return value === "SAMPLE" || value === "CLIP";
}

function isEvent(value: unknown): value is QualityCommentEvent {
  return (
    value === "READY" ||
    value === "INIT_CONTEXT" ||
    value === "OPEN_CLIP_COMMENT" ||
    value === "OPEN_OBJECT_COMMENT" ||
    value === "OPEN_HISTORY" ||
    value === "SET_HISTORY" ||
    value === "COMMENT_SUBMIT_REQUEST" ||
    value === "SUBMIT_RESULT" ||
    value === "HISTORY_REFRESH_REQUEST" ||
    value === "LOCATE_REQUEST" ||
    value === "LOCATE_RESULT" ||
    value === "CLOSE_REQUEST" ||
    value === "CLOSE" ||
    value === "HOST_ERROR" ||
    value === "RESIZE" ||
    value === "ERROR"
  );
}

function isTargetSnapshot(
  value: unknown,
): value is QualityCommentTargetSnapshot {
  if (!isRecord(value)) return false;
  return (
    isString(value.taskId) &&
    (value.unitType === "SAMPLE" || value.unitType === "CLIP") &&
    isString(value.unitId) &&
    isString(value.platformSource) &&
    (value.frameId === undefined || isString(value.frameId)) &&
    (value.frameNo === undefined || isNumber(value.frameNo)) &&
    (value.objectId === undefined || isString(value.objectId)) &&
    (value.labelId === undefined || isString(value.labelId)) &&
    (value.labelCode === undefined || isString(value.labelCode)) &&
    (value.labelName === undefined || isString(value.labelName)) &&
    (value.tracingId === undefined || isString(value.tracingId))
  );
}

function isHistoryItem(value: unknown): value is QualityCommentHistoryItem {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isScope(value.scope) &&
    isString(value.content) &&
    isSeverity(value.severity) &&
    isString(value.reviewerName) &&
    isString(value.createdAt) &&
    isTargetSnapshot(value.target) &&
    (value.objectExists === undefined || isBoolean(value.objectExists))
  );
}

/** 校验宿主消息 envelope，避免把无关 `postMessage` 误识别为评论协议。 */
export function isQualityCommentMessage(
  value: unknown,
): value is QualityCommentMessage {
  if (!isRecord(value)) return false;
  return (
    value.channel === QUALITY_COMMENT_CHANNEL &&
    value.protocolVersion === QUALITY_COMMENT_PROTOCOL_VERSION &&
    isEvent(value.event) &&
    isString(value.sessionId) &&
    isString(value.requestId) &&
    (value.revision === undefined || isNumber(value.revision))
  );
}

/** 把宿主初始化载荷整理成 iframe 可直接消费的会话快照。 */
export function normalizeQualityCommentSessionPayload(
  value: unknown,
): QualityCommentSessionPayload | undefined {
  if (!isRecord(value) || !isRecord(value.context)) return undefined;
  const context = value.context as Record<string, unknown>;
  if (
    !isString(context.taskId) ||
    !isString(context.platformSource) ||
    !isWorkbenchMode(context.mode) ||
    !isRecord(context.unit) ||
    !isNumber(context.revision)
  ) {
    return undefined;
  }
  const unit = context.unit;
  if (!isUnitType(unit.type) || !isString(unit.id)) return undefined;
  const frame = context.frame;
  const selectedObject = context.selectedObject;
  const capabilities = context.capabilities;
  if (!isRecord(capabilities)) return undefined;
  if (
    !isBoolean(capabilities.canCreateComment) ||
    !isBoolean(capabilities.canViewHistory) ||
    !isBoolean(capabilities.canLocateObject)
  ) {
    return undefined;
  }
  return {
    context: {
      taskId: context.taskId,
      taskName: isString(context.taskName) ? context.taskName : undefined,
      platformSource: context.platformSource,
      hostAppId: isString(context.hostAppId) ? context.hostAppId : undefined,
      mode: context.mode,
      unit: {
        type: unit.type,
        id: unit.id,
        name: isString(unit.name) ? unit.name : undefined,
      },
      frame:
        isRecord(frame) && isString(frame.id)
          ? {
              id: frame.id,
              no: isNumber(frame.no) ? frame.no : undefined,
            }
          : undefined,
      selectedObject:
        isRecord(selectedObject) && isString(selectedObject.id)
          ? {
              id: selectedObject.id,
              labelId: isString(selectedObject.labelId)
                ? selectedObject.labelId
                : undefined,
              labelCode: isString(selectedObject.labelCode)
                ? selectedObject.labelCode
                : undefined,
              labelName: isString(selectedObject.labelName)
                ? selectedObject.labelName
                : undefined,
              tracingId: isString(selectedObject.tracingId)
                ? selectedObject.tracingId
                : undefined,
            }
          : undefined,
      revision: context.revision,
      theme: context.theme === "light" ? "light" : "dark",
      capabilities: {
        canCreateComment: capabilities.canCreateComment,
        canViewHistory: capabilities.canViewHistory,
        canLocateObject: capabilities.canLocateObject,
      },
    },
    history: Array.isArray(value.history)
      ? value.history.filter(isHistoryItem)
      : undefined,
    openScope: isScope(value.openScope) ? value.openScope : undefined,
  };
}

/** 校验历史数组，返回可直接渲染的评论历史快照。 */
export function normalizeQualityCommentHistory(
  value: unknown,
): QualityCommentHistoryItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(isHistoryItem);
}

/** 解析新增评论请求，保证内容和目标都通过基础前端校验。 */
export function normalizeQualityCommentSubmitRequest(
  value: unknown,
): QualityCommentSubmitRequest | undefined {
  if (!isRecord(value)) return undefined;
  if (
    !isScope(value.scope) ||
    !isTargetSnapshot(value.target) ||
    !isString(value.content) ||
    !isSeverity(value.severity)
  ) {
    return undefined;
  }
  return {
    scope: value.scope,
    target: value.target,
    content: value.content,
    severity: value.severity,
  };
}

/** 解析历史定位请求，确保 commentId 和 target 结构完整。 */
export function normalizeQualityCommentLocateRequest(
  value: unknown,
): QualityCommentLocateRequest | undefined {
  if (!isRecord(value)) return undefined;
  if (!isString(value.commentId) || !isTargetSnapshot(value.target)) {
    return undefined;
  }
  return {
    commentId: value.commentId,
    target: value.target,
  };
}

/** 把宿主返回的提交结果整理成结构化状态，便于前端清理草稿或保留失败内容。 */
export function normalizeQualityCommentSubmitResult(
  value: unknown,
): QualityCommentSubmitResult | undefined {
  if (!isRecord(value) || !isBoolean(value.success)) return undefined;
  const history = value.history
    ? normalizeQualityCommentHistory(value.history)
    : undefined;
  return {
    success: value.success,
    commentId: isString(value.commentId) ? value.commentId : undefined,
    history,
    message: isString(value.message) ? value.message : undefined,
  };
}

/** 把宿主返回的定位结果整理成可直接展示的状态。 */
export function normalizeQualityCommentLocateResult(
  value: unknown,
): QualityCommentLocateResult | undefined {
  if (!isRecord(value) || !isString(value.commentId)) return undefined;
  if (
    value.status !== "located" &&
    value.status !== "missing" &&
    value.status !== "rejected"
  ) {
    return undefined;
  }
  return {
    commentId: value.commentId,
    status: value.status,
    message: isString(value.message) ? value.message : undefined,
  };
}

/** 解析宿主错误消息，统一回落成一条可展示的字符串。 */
export function normalizeQualityCommentError(value: unknown) {
  if (isRecord(value) && isString(value.message)) {
    return value.message;
  }
  return undefined;
}
