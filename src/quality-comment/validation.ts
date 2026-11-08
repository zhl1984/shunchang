import type {
  QualityCommentContext,
  QualityCommentScope,
  QualityCommentSubmitRequest,
  QualityCommentTargetSnapshot,
} from "./types";

export const QUALITY_COMMENT_MAX_LENGTH = 1000;

export interface QualityCommentDraft {
  content: string;
  severity: "MUST_FIX" | "SUGGESTION";
}

export interface QualityCommentValidationError {
  code: "required" | "maxLength";
  limit?: number;
}

export type QualityCommentValidationErrors = Partial<{
  content: QualityCommentValidationError;
}>;

/** 去除评论首尾空格，保证长度校验与提交内容使用同一份规范化文本。 */
export function trimQualityCommentContent(content: string) {
  return content.trim();
}

/** 校验评论正文是否可提交，只处理长度和空白，不替代宿主权限校验。 */
export function validateQualityCommentContent(
  content: string,
): QualityCommentValidationError | undefined {
  const trimmedContent = trimQualityCommentContent(content);
  if (!trimmedContent) {
    return { code: "required" };
  }
  if (trimmedContent.length > QUALITY_COMMENT_MAX_LENGTH) {
    return { code: "maxLength", limit: QUALITY_COMMENT_MAX_LENGTH };
  }
  return undefined;
}

/** 根据上下文生成评论目标快照，iframe 只透传宿主给出的只读业务信息。 */
export function buildQualityCommentTarget(
  context: QualityCommentContext,
  scope: QualityCommentScope,
): QualityCommentTargetSnapshot {
  const object = scope === "OBJECT" ? context.selectedObject : undefined;
  return {
    taskId: context.taskId,
    qualityTaskId: context.qualityTaskId,
    unitType: context.unit.type,
    unitId: context.unit.id,
    frameId: context.frame?.id,
    frameNo: context.frame?.no,
    objectId: object?.id,
    labelId: object?.labelId,
    labelCode: object?.labelCode,
    labelName: object?.labelName,
    tracingId: object?.tracingId,
    platformSource: context.platformSource,
  };
}

/** 把草稿与上下文拼成宿主可执行的提交请求，提交前只保留规范化文本。 */
export function buildQualityCommentSubmitRequest(
  context: QualityCommentContext,
  scope: QualityCommentScope,
  draft: QualityCommentDraft,
): QualityCommentSubmitRequest {
  const trimmedContent = trimQualityCommentContent(draft.content);
  return {
    scope,
    target: buildQualityCommentTarget(context, scope),
    content: trimmedContent,
    severity: draft.severity,
  };
}
