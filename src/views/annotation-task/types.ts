import type { SCENARIO_TYPE } from "@/constants/scenario";

export type AnnotationTaskStatus =
  | "annotating"
  | "qualityChecking"
  | "reworking"
  | "completed";

export type AnnotationTaskAggregateStatus = AnnotationTaskStatus;

export type AnnotationTaskSampleIssueLevel = "none" | "mustFix" | "suggestion";

export type AnnotationTaskSampleStatus =
  | "annotating"
  | "completed"
  | "reworking";

export type AnnotationTaskSampleIssue = {
  source?: string;
  objectName: string;
  objectId?: string;
  comment: string;
  handling: string;
  location?: string;
};

export type AnnotationTask = {
  id: string;
  projectCode?: string;
  designerCode?: SCENARIO_TYPE;
  displayName: string;
  taskType?: string;
  batchNo?: number;
  iterationId?: number | null;
  iterationNo?: number | null;
  status: AnnotationTaskStatus;
  annotatorId: number;
  assigneeName?: string;
  sampleCount: number;
  startedAt?: string;
  deadlineAt?: string | null;
};

export type AnnotationTaskStatistics = {
  total: number;
  annotating: number;
  qualityChecking: number;
  reworking: number;
  completed: number;
};

export type AnnotationTaskListParams = {
  ascSort?: boolean;
  projectCode?: string;
  status?: AnnotationTaskAggregateStatus | "all";
  keyword?: string;
  page?: number;
  pageSize?: number;
  sortField?: "deadline";
};

export type AnnotationTaskListResult = {
  list: AnnotationTask[];
  total: number;
  page: number;
  pageSize: number;
  statistics: AnnotationTaskStatistics;
};

export type AnnotationTaskSample = {
  /** 后端 annotation itemId；pc-tool 入口将其作为 clipId 传递。 */
  id: string;
  code: string;
  name: string;
  /** 详情接口返回的样本状态；规则和质检历史快照可能不返回。 */
  status?: AnnotationTaskSampleStatus;
  issueLevel: AnnotationTaskSampleIssueLevel;
  issueCount: number;
  issueSummary?: string;
  issues?: AnnotationTaskSampleIssue[];
  issueDetail?: AnnotationTaskSampleIssue;
  location?: Record<string, string | number>;
};

export type AnnotationTaskQualityRecord = {
  id: string;
  result: "passed" | "failed";
  submittedAt: string;
  submitterName?: string;
  inspectorName?: string;
  samples: AnnotationTaskSample[];
};

export type AnnotationTaskQualityRecordsParams = {
  submissionId?: number;
  itemId?: number;
  issueLevel?: "MUST_FIX" | "SUGGESTION";
  page?: number;
  pageSize?: number;
};

export type AnnotationTaskQualityRecordsResult = {
  list: AnnotationTaskQualityRecord[];
  total: number;
  page: number;
  pageSize: number;
  statistics?: AnnotationTaskStatistics;
};

export type AnnotationTaskLabelAttributeConfig = {
  valueType: string;
  defaultValue: unknown;
  readOnly: boolean;
  required: boolean;
  constraint?: Record<string, unknown>;
};

export type AnnotationTaskLabelToolBinding = {
  toolId: number;
  toolCode: string;
  toolName: string;
  toolDescription?: string | null;
  toolPropertyCode: string;
  toolPropertyType: string;
  toolPropertyName: string;
};

export type AnnotationTaskLabelAttribute = {
  attributeId: number;
  attributeName: string;
  config: AnnotationTaskLabelAttributeConfig;
  attributeDescription?: string | null;
  sortOrder?: number;
  toolBindings: AnnotationTaskLabelToolBinding[];
};

export type AnnotationTaskLabelConfig = {
  annotationTaskId: number;
  qualityTaskId?: number | null;
  projectCode: string;
  sceneId: number;
  labels: Array<{
    labelId: number;
    labelName: string;
    labelDescription?: string | null;
    attributes: AnnotationTaskLabelAttribute[];
  }>;
};

export type AnnotationTaskValidationRule = {
  id: string;
  name: string;
  description: string;
  issueSamples: AnnotationTaskSample[];
};

export type AnnotationTaskValidationRecord = {
  id: string;
  submittedAt: string;
  result: "processing" | "passed" | "failed" | "error";
  rules: AnnotationTaskValidationRule[];
};

export type AnnotationTaskDetail = AnnotationTask & {
  samples: AnnotationTaskSample[];
  validationRecords: AnnotationTaskValidationRecord[];
};

export type AnnotationTaskSubmitQualityResult = {
  ruleCheckRecordId: number;
  ruleCheckResult: string;
  annotationTaskId: number;
  qualityTaskId: number | null;
};

export type AnnotationTaskCompleteIterativeResult = boolean;
