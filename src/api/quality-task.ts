import { i18n } from "@/locales";
import http from "./http";
import type {
  QualityTask,
  QualityTaskDetail,
  QualityTaskIssue,
  QualityTaskIssueLevel,
  QualityTaskListParams,
  QualityTaskListResult,
  QualityTaskQualityRecord,
  QualityTaskQualityRecordResult,
  QualityTaskRecordListParams,
  QualityTaskStatistics,
  QualityTaskStatus,
  QualityTaskStatusSubmitResult,
  QualityTaskSubmitResult,
  QualityTaskValidationRecord,
  QualityTaskValidationRecordResult,
} from "@/views/quality-task/types";

export const QUALITY_TASK_DEFAULT_PAGE = 1;
export const QUALITY_TASK_DEFAULT_PAGE_SIZE = 10;
export const QUALITY_TASK_SAMPLE_PAGE_SIZE = 30;
export const QUALITY_TASK_RECORD_PAGE_SIZE = 10;

type ApiResponse<T> = {
  code: string | number;
  message?: string | null;
  data?: T | null;
};

type QualityTaskStatusDto = "QUALITY_CHECKING" | "REWORKING" | "COMPLETED";

type QualityTaskListItemDto = {
  qualityTaskId: number;
  annotationTaskId: number;
  taskName: string;
  status: QualityTaskStatusDto;
  inspectorId: number;
  inspectorName?: string | null;
  sampleCount: number;
  startedAt?: string;
  dueAt?: string | null;
};

type QualityTaskSummaryDto = {
  total?: number;
  qualityChecking?: number;
  reworking?: number;
  completed?: number;
};

type QualityTaskListDataDto = {
  summary?: QualityTaskSummaryDto | null;
  pageNo: number;
  pageSize: number;
  total: number;
  list?: QualityTaskListItemDto[] | null;
};

type QualityTaskIssueDto = {
  issueSource?: string;
  issueLevel?: "MUST_FIX" | "SUGGESTION" | string;
  annotationObjectId?: number | string | null;
  annotationObjectName?: string | null;
  description?: string | null;
};

type QualityTaskSampleDto = {
  itemId: number;
  itemName: string;
  itemOrder: number;
  itemStatus?: string;
  issues?: QualityTaskIssueDto[] | null;
};

type QualityTaskDetailDto = QualityTaskListItemDto & {
  designerCode?: string | null;
  qualitySchemeLevelId: number;
  qualityLevel: number;
  qualityRoundName: string;
  totalQualityLevels: number;
  checkScope: string;
  executionType: string;
  annotationTaskName?: string | null;
  samples?: QualityTaskSampleDto[] | null;
};

type QualityTaskRuleCheckDto = {
  id: number;
  result: "PROCESSING" | "PASS" | "FAIL" | "ERROR";
  createdAt: string;
  rules?: Array<{
    ruleId: number;
    ruleName: string;
    description?: string | null;
    samples?: QualityTaskSampleDto[] | null;
  }> | null;
};

type QualityTaskRuleCheckPageDto = {
  pageNo: number;
  pageSize: number;
  total: number;
  list?: QualityTaskRuleCheckDto[] | null;
};

type QualityTaskQualityRecordDto = {
  id: number;
  result: "PASS" | "FAIL";
  createdAt: string;
  submitterName?: string | null;
  inspectorName?: string | null;
  samples?: QualityTaskSampleDto[] | null;
};

type QualityTaskQualityRecordPageDto = {
  summary?: QualityTaskSummaryDto | null;
  pageNo: number;
  pageSize: number;
  total: number;
  list?: QualityTaskQualityRecordDto[] | null;
};

type QualityTaskStatusSubmitDto = {
  submissionId: number;
  result: "PASS" | "FAIL";
  qualityTaskStatus: QualityTaskStatusDto;
  annotationTaskStatus?: string;
};

/** 根据业务响应码判断接口是否成功，失败时优先透传后端业务信息。 */
function assertSuccess<T>(response: ApiResponse<T>): void {
  if (String(response.code) !== "0") {
    throw new Error(
      response.message || i18n.global.t("qualityTask.feedback.loadFailed"),
    );
  }
}

/** 解包必需响应数据，避免成功码但 data 缺失导致页面运行时异常。 */
function unwrapRequired<T>(response: ApiResponse<T>, message: string): T {
  assertSuccess(response);

  if (response.data === null || response.data === undefined) {
    throw new Error(message);
  }

  return response.data;
}

/** 将接口状态枚举转换成页面稳定使用的小驼峰状态。 */
function toQualityTaskStatus(status: QualityTaskStatusDto): QualityTaskStatus {
  const statusMap: Record<QualityTaskStatusDto, QualityTaskStatus> = {
    QUALITY_CHECKING: "qualityChecking",
    REWORKING: "reworking",
    COMPLETED: "completed",
  };
  return statusMap[status];
}

/** 将页面状态筛选转换为接口枚举；全部状态不传筛选参数。 */
function toQualityTaskStatusDto(
  status: QualityTaskListParams["status"],
): QualityTaskStatusDto | undefined {
  if (!status || status === "all") {
    return undefined;
  }

  const statusMap: Record<QualityTaskStatus, QualityTaskStatusDto> = {
    qualityChecking: "QUALITY_CHECKING",
    reworking: "REWORKING",
    completed: "COMPLETED",
  };
  return statusMap[status];
}

/** 将接口统计对象补齐默认值，兼容后端新增字段或局部缺失字段。 */
function toQualityTaskStatistics(
  summary?: QualityTaskSummaryDto | null,
): QualityTaskStatistics {
  return {
    total: summary?.total ?? 0,
    qualityChecking: summary?.qualityChecking ?? 0,
    reworking: summary?.reworking ?? 0,
    completed: summary?.completed ?? 0,
  };
}

/** 将任务列表 DTO 转为页面列表模型，屏蔽后端字段命名差异。 */
function toQualityTask(dto: QualityTaskListItemDto): QualityTask {
  return {
    id: String(dto.qualityTaskId),
    annotationTaskId: String(dto.annotationTaskId),
    displayName: dto.taskName,
    status: toQualityTaskStatus(dto.status),
    inspectorId: dto.inspectorId,
    inspectorName: dto.inspectorName || undefined,
    sampleCount: dto.sampleCount,
    startedAt: dto.startedAt,
    deadlineAt: dto.dueAt,
  };
}

/** 将接口问题级别映射为页面枚举，未知值按必须修改处理以保守暴露风险。 */
function toIssueLevel(level: string | undefined): QualityTaskIssueLevel {
  return level === "SUGGESTION" ? "suggestion" : "mustFix";
}

/** 将问题 DTO 转为页面问题模型，统一对象 ID 和可选文案兜底。 */
function toIssue(dto: QualityTaskIssueDto): QualityTaskIssue {
  return {
    source: dto.issueSource ?? "",
    level: toIssueLevel(dto.issueLevel),
    objectId:
      dto.annotationObjectId === null || dto.annotationObjectId === undefined
        ? undefined
        : String(dto.annotationObjectId),
    objectName: dto.annotationObjectName || undefined,
    description: dto.description ?? "",
  };
}

/** 将样本 DTO 转为详情页可展示模型，并预生成首条问题摘要。 */
function toSample(dto: QualityTaskSampleDto) {
  const issues = (dto.issues ?? []).map(toIssue);

  return {
    id: String(dto.itemId),
    code: `#${dto.itemOrder}`,
    name: dto.itemName,
    order: dto.itemOrder,
    status: dto.itemStatus,
    issueCount: issues.length,
    issueSummary: issues[0]?.description,
    issues,
  };
}

/** 将详情 DTO 转为页面详情模型，样本数组缺失时使用空数组兜底。 */
function toQualityTaskDetail(dto: QualityTaskDetailDto): QualityTaskDetail {
  return {
    ...toQualityTask(dto),
    qualitySchemeLevelId: String(dto.qualitySchemeLevelId),
    qualityLevel: dto.qualityLevel,
    qualityRoundName: dto.qualityRoundName,
    totalQualityLevels: dto.totalQualityLevels,
    checkScope: dto.checkScope,
    executionType: dto.executionType,
    samples: (dto.samples ?? []).map(toSample),
    annotationTaskName: dto.annotationTaskName || undefined,
    designerCode: dto.designerCode || undefined,
  };
}

/** 将规则校验状态转换为详情页展示枚举。 */
function toValidationResult(
  result: QualityTaskRuleCheckDto["result"],
): QualityTaskValidationRecord["result"] {
  const resultMap: Record<
    QualityTaskRuleCheckDto["result"],
    QualityTaskValidationRecord["result"]
  > = {
    PROCESSING: "processing",
    PASS: "passed",
    FAIL: "failed",
    ERROR: "error",
  };
  return resultMap[result];
}

/** 将规则校验记录 DTO 转为详情页展示模型，空 rules 按通过记录处理。 */
function toValidationRecord(
  dto: QualityTaskRuleCheckDto,
): QualityTaskValidationRecord {
  return {
    id: String(dto.id),
    result: toValidationResult(dto.result),
    createdAt: dto.createdAt,
    rules: (dto.rules ?? []).map((rule) => ({
      id: String(rule.ruleId),
      name: rule.ruleName,
      description: rule.description ?? "",
      samples: (rule.samples ?? []).map(toSample),
    })),
  };
}

/** 将人工质检提交结果转换为页面枚举。 */
function toSubmitResult(result: "PASS" | "FAIL"): QualityTaskSubmitResult {
  return result === "PASS" ? "pass" : "fail";
}

/** 将人工质检记录 DTO 转为详情页展示模型。 */
function toQualityRecord(
  dto: QualityTaskQualityRecordDto,
): QualityTaskQualityRecord {
  return {
    id: String(dto.id),
    result: toSubmitResult(dto.result),
    createdAt: dto.createdAt,
    submitterName: dto.submitterName || undefined,
    inspectorName: dto.inspectorName || undefined,
    samples: (dto.samples ?? []).map(toSample),
  };
}

/** 校验路由中的质检任务 ID，避免把无效路径继续传给接口。 */
function toQualityTaskId(taskId: string): number {
  const id = Number(taskId);

  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`Invalid quality task id: ${taskId}`);
  }

  return id;
}

/** 分页查询质检任务列表，支持截止时间服务端排序并返回页面分页统计模型。 */
export async function getQualityTaskListApi(
  params: QualityTaskListParams = {},
): Promise<QualityTaskListResult> {
  const pageNo = params.page ?? QUALITY_TASK_DEFAULT_PAGE;
  const pageSize = params.pageSize ?? QUALITY_TASK_DEFAULT_PAGE_SIZE;
  const response = await http.get<ApiResponse<QualityTaskListDataDto>>(
    "/quality-tasks",
    {
      params: {
        pageNo,
        pageSize,
        statusFilter: toQualityTaskStatusDto(params.status),
        keyword: params.keyword?.trim() || undefined,
        sortField: params.sortField,
        ascSort: params.ascSort,
      },
    },
  );
  const data = unwrapRequired(
    response.data,
    i18n.global.t("qualityTask.feedback.listEmpty"),
  );

  if (!Array.isArray(data.list)) {
    throw new Error(i18n.global.t("qualityTask.feedback.invalidList"));
  }

  return {
    list: data.list.map(toQualityTask),
    total: data.total,
    page: data.pageNo,
    pageSize: data.pageSize,
    statistics: toQualityTaskStatistics(data.summary),
  };
}

/** 查询质检任务详情，返回任务基本信息和固定质检样本范围。 */
export async function getQualityTaskDetailApi(
  taskId: string,
): Promise<QualityTaskDetail> {
  const response = await http.get<ApiResponse<QualityTaskDetailDto>>(
    `/quality-tasks/${toQualityTaskId(taskId)}`,
  );
  const data = unwrapRequired(
    response.data,
    i18n.global.t("qualityTask.feedback.detailEmpty"),
  );
  return toQualityTaskDetail(data);
}

/** 分页查询质检任务关联的规则校验记录，默认取最近一页记录。 */
export async function getQualityTaskValidationRecordsApi(
  taskId: string,
  params: QualityTaskRecordListParams = {},
): Promise<QualityTaskValidationRecordResult> {
  const response = await http.get<ApiResponse<QualityTaskRuleCheckPageDto>>(
    `/quality-tasks/${toQualityTaskId(taskId)}/rule-check-records`,
    {
      params: {
        recordId: params.recordId,
        itemId: params.itemId,
        pageNo: params.page ?? QUALITY_TASK_DEFAULT_PAGE,
        pageSize: params.pageSize ?? QUALITY_TASK_RECORD_PAGE_SIZE,
      },
    },
  );
  const data = unwrapRequired(
    response.data,
    i18n.global.t("qualityTask.feedback.validationRecordsEmpty"),
  );

  if (!Array.isArray(data.list)) {
    throw new Error(i18n.global.t("qualityTask.feedback.invalidRecords"));
  }

  return {
    list: data.list.map(toValidationRecord),
    total: data.total,
    page: data.pageNo,
    pageSize: data.pageSize,
  };
}

/** 分页查询人工质检记录，返回提交结果及嵌套的问题样本。 */
export async function getQualityTaskQualityRecordsApi(
  taskId: string,
  params: QualityTaskRecordListParams = {},
): Promise<QualityTaskQualityRecordResult> {
  const response = await http.get<ApiResponse<QualityTaskQualityRecordPageDto>>(
    `/quality-tasks/${toQualityTaskId(taskId)}/quality-records`,
    {
      params: {
        submissionId: params.submissionId,
        itemId: params.itemId,
        issueLevel: params.issueLevel,
        pageNo: params.page ?? QUALITY_TASK_DEFAULT_PAGE,
        pageSize: params.pageSize ?? QUALITY_TASK_RECORD_PAGE_SIZE,
      },
    },
  );
  const data = unwrapRequired(
    response.data,
    i18n.global.t("qualityTask.feedback.qualityRecordsEmpty"),
  );

  if (!Array.isArray(data.list)) {
    throw new Error(i18n.global.t("qualityTask.feedback.invalidRecords"));
  }

  return {
    list: data.list.map(toQualityRecord),
    total: data.total,
    page: data.pageNo,
    pageSize: data.pageSize,
    statistics: data.summary
      ? toQualityTaskStatistics(data.summary)
      : undefined,
  };
}

/** 提交人工质检通过或不通过，状态流转由后端接口统一完成。 */
export async function submitQualityTaskStatusApi(
  taskId: string,
  result: QualityTaskSubmitResult,
): Promise<QualityTaskStatusSubmitResult> {
  const response = await http.patch<ApiResponse<QualityTaskStatusSubmitDto>>(
    `/quality-tasks/${toQualityTaskId(taskId)}/status`,
    {
      result: result === "pass" ? "PASS" : "FAIL",
    },
  );
  const data = unwrapRequired(
    response.data,
    i18n.global.t("qualityTask.feedback.submitEmpty"),
  );

  return {
    submissionId: String(data.submissionId),
    result: toSubmitResult(data.result),
    qualityTaskStatus: toQualityTaskStatus(data.qualityTaskStatus),
    annotationTaskStatus: data.annotationTaskStatus,
  };
}
