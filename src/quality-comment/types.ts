export type QualityCommentScope = "CLIP" | "OBJECT";

export type QualityCommentWorkbenchMode = "ANNOTATION" | "QUALITY";

export type QualityCommentSeverity = "MUST_FIX" | "SUGGESTION";

export type QualityCommentTheme = "dark" | "light";

export type QualityCommentUnitType = "SAMPLE" | "CLIP";

export interface QualityCommentUnitSnapshot {
  type: QualityCommentUnitType;
  id: string;
  name?: string;
}

export interface QualityCommentObjectSnapshot {
  id: string;
  labelId?: string;
  labelCode?: string;
  labelName?: string;
  tracingId?: string;
}

export interface QualityCommentFrameSnapshot {
  id: string;
  no?: number;
}

export interface QualityCommentTargetSnapshot {
  taskId: string;
  qualityTaskId?: string;
  unitType: QualityCommentUnitType;
  unitId: string;
  unitName?: string;
  frameId?: string;
  frameNo?: number;
  objectId?: string;
  labelId?: string;
  labelCode?: string;
  labelName?: string;
  tracingId?: string;
  platformSource: string;
}

export interface QualityCommentCapabilitySnapshot {
  canCreateComment: boolean;
  canViewHistory: boolean;
  canLocateObject: boolean;
}

export interface QualityCommentContext {
  taskId: string;
  qualityTaskId?: string;
  taskName?: string;
  platformSource: string;
  hostAppId?: string;
  mode: QualityCommentWorkbenchMode;
  unit: QualityCommentUnitSnapshot;
  frame?: QualityCommentFrameSnapshot;
  selectedObject?: QualityCommentObjectSnapshot;
  revision: number;
  theme?: QualityCommentTheme;
  capabilities: QualityCommentCapabilitySnapshot;
}

export interface QualityCommentHistoryItem {
  id: string;
  scope: QualityCommentScope;
  content: string;
  severity: QualityCommentSeverity;
  reviewerName: string;
  createdAt: string;
  target: QualityCommentTargetSnapshot;
  objectExists?: boolean;
}

export interface QualityCommentSubmitRequest {
  scope: QualityCommentScope;
  target: QualityCommentTargetSnapshot;
  content: string;
  severity: QualityCommentSeverity;
}

export interface QualityCommentLocateRequest {
  commentId: string;
  target: QualityCommentTargetSnapshot;
}

export interface QualityCommentSessionPayload {
  context: QualityCommentContext;
  history?: QualityCommentHistoryItem[];
  openScope?: QualityCommentScope;
}

export interface QualityCommentSubmitResult {
  success: boolean;
  commentId?: string;
  history?: QualityCommentHistoryItem[];
  message?: string;
}

export interface QualityCommentLocateResult {
  commentId: string;
  status: "located" | "missing" | "rejected";
  message?: string;
}
