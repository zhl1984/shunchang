export type QualityTaskStatus = "qualityChecking" | "reworking" | "completed";

export type QualityTaskSubmitResult = "pass" | "fail";

export type QualityTaskIssueLevel = "mustFix" | "suggestion";

export type QualityTaskStatistics = {
  total: number;
  qualityChecking: number;
  reworking: number;
  completed: number;
};

export type QualityTask = {
  id: string;
  annotationTaskId: string;
  displayName: string;
  status: QualityTaskStatus;
  inspectorId: number;
  inspectorName?: string;
  sampleCount: number;
  startedAt?: string;
  deadlineAt?: string | null;
  designerCode?: string;
};

export type QualityTaskListParams = {
  ascSort?: boolean;
  status?: QualityTaskStatus | "all";
  keyword?: string;
  page?: number;
  pageSize?: number;
  sortField?: "deadline";
};

export type QualityTaskListResult = {
  list: QualityTask[];
  total: number;
  page: number;
  pageSize: number;
  statistics: QualityTaskStatistics;
};

export type QualityTaskIssue = {
  source: string;
  level: QualityTaskIssueLevel;
  objectId?: string;
  objectName?: string;
  description: string;
};

export type QualityTaskSample = {
  id: string;
  code: string;
  name: string;
  order: number;
  status?: string;
  issueCount: number;
  issueSummary?: string;
  issues: QualityTaskIssue[];
};

export type QualityTaskDetail = QualityTask & {
  qualitySchemeLevelId: string;
  qualityLevel: number;
  qualityRoundName: string;
  totalQualityLevels: number;
  checkScope: string;
  executionType: string;
  samples: QualityTaskSample[];
  roundText?: string;
  summary?: QualityTaskDetailSummary[];
  validationRecords?: QualityTaskDetailRuleRecord[];
  qualityRecords?: QualityTaskDetailQualityRecord[];
  annotationTaskName?: string;
};

export type QualityTaskDetailRecord = {
  id: string;
  title: string;
  description?: string;
  value: string;
};

export type QualityTaskDetailSummary = {
  label: string;
  value: string;
};

export type QualityTaskDetailIssue = {
  objectName: string;
  handling: string;
  comment: string;
  location?: string;
};

export type QualityTaskDetailSample = {
  id: string;
  code: string;
  name: string;
  issueLevel: "none" | QualityTaskIssueLevel;
  issueCount: number;
  issueSummary?: string;
  issueDetail?: QualityTaskDetailIssue;
  issues: QualityTaskDetailIssue[];
};

export type QualityTaskDetailRuleRecord = {
  id: string;
  createdAt: string;
  title: string;
  summary: string;
  matchedSamples: QualityTaskDetailSample[];
  evidenceObjects: string[];
};

export type QualityTaskDetailQualityRecord = {
  id: string;
  createdAt: string;
  submitterName?: string;
  inspectorName?: string;
  result: "passed" | "failed";
  samples: QualityTaskDetailSample[];
};

export type QualityTaskValidationRule = {
  id: string;
  name: string;
  description: string;
  samples: QualityTaskSample[];
};

export type QualityTaskValidationRecord = {
  id: string;
  result: "processing" | "passed" | "failed" | "error";
  createdAt: string;
  rules: QualityTaskValidationRule[];
};

export type QualityTaskQualityRecord = {
  id: string;
  result: "passed" | "failed";
  createdAt: string;
  submitterName?: string;
  inspectorName?: string;
  samples: QualityTaskSample[];
};

export type QualityTaskRecordListParams = {
  recordId?: number;
  submissionId?: number;
  itemId?: number;
  issueLevel?: "MUST_FIX" | "SUGGESTION";
  page?: number;
  pageSize?: number;
};

export type QualityTaskValidationRecordResult = {
  list: QualityTaskValidationRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type QualityTaskQualityRecordResult = {
  list: QualityTaskQualityRecord[];
  total: number;
  page: number;
  pageSize: number;
  statistics?: QualityTaskStatistics;
};

export type QualityTaskStatusSubmitResult = {
  submissionId: string;
  result: QualityTaskSubmitResult;
  qualityTaskStatus: QualityTaskStatus;
  annotationTaskStatus?: string;
};
