import { i18n } from "@/locales";
import http from "./http";
import type {
  AnnotationTask,
  AnnotationTaskCompleteIterativeResult,
  AnnotationTaskDetail,
  AnnotationTaskListParams,
  AnnotationTaskListResult,
  AnnotationTaskLabelConfig,
  AnnotationTaskQualityRecord,
  AnnotationTaskQualityRecordsParams,
  AnnotationTaskQualityRecordsResult,
  AnnotationTaskSample,
  AnnotationTaskSampleStatus,
  AnnotationTaskStatus,
  AnnotationTaskSubmitQualityResult,
  AnnotationTaskValidationRecord,
} from "@/views/annotation-task/types";
import type { SCENARIO_TYPE } from "@/constants/scenario";

export const ANNOTATION_TASK_DEFAULT_PAGE = 1;
export const ANNOTATION_TASK_DEFAULT_PAGE_SIZE = 10;
export const ANNOTATION_TASK_SAMPLE_DEFAULT_PAGE_SIZE = 30;
export const ANNOTATION_TASK_QUALITY_RECORD_DEFAULT_PAGE_SIZE = 10;

type ApiResponse<T> = {
  code: string | number;
  message?: string | null;
  data?: T | null;
};

type AnnotationTaskStatusDto =
  | "ANNOTATING"
  | "QUALITY_CHECKING"
  | "REWORKING"
  | "COMPLETED";

type AnnotationTaskListItemDto = {
  id: number;
  taskName: string;
  status: AnnotationTaskStatusDto;
  annotatorId: number;
  annotatorName: string;
  sampleCount: number;
  startedAt: string;
  dueAt: string | null;
};

type AnnotationTaskListDataDto = {
  summary: {
    total: number;
    annotating: number;
    qualityChecking: number;
    reworking: number;
    completed: number;
  };
  pageNo: number;
  pageSize: number;
  total: number;
  list: AnnotationTaskListItemDto[];
};

type AnnotationTaskSampleIssueDto = {
  issueSource: string;
  issueLevel: string;
  annotationObjectId?: number | null;
  annotationObjectName?: string | null;
  description: string;
};

type AnnotationTaskSampleDto = {
  itemId: number;
  itemName: string;
  itemOrder: number;
  itemStatus: "ANNOTATING" | "COMPLETED" | "REWORKING";
  latestCheckIssueCount: number;
  latestCheckIssues: AnnotationTaskSampleIssueDto[];
};

type AnnotationTaskDetailDto = {
  id: number;
  projectCode: string;
  designerCode: SCENARIO_TYPE;
  iterationId?: number | null;
  taskType: string;
  iterationNo?: number | null;
  batchNo: number;
  taskName: string;
  annotatorId: number;
  annotatorName?: string | null;
  status: AnnotationTaskStatusDto;
  startedAt?: string;
  dueAt?: string | null;
  sampleCount: number;
  samples: AnnotationTaskSampleDto[];
};

type AnnotationTaskRuleCheckDto = {
  id: number;
  result: "PROCESSING" | "PASS" | "FAIL" | "ERROR";
  createdAt: string;
  rules: Array<{
    ruleId: number;
    ruleName: string;
    description: string;
    samples: Array<{
      itemId: number;
      itemName: string;
      itemOrder: number;
      issues: AnnotationTaskSampleIssueDto[];
    }>;
  }>;
};

type AnnotationTaskRuleCheckPageDto = {
  pageNo: number;
  pageSize: number;
  total: number;
  list: AnnotationTaskRuleCheckDto[];
};

type AnnotationTaskQualityRecordDto = {
  id: number;
  result: "PASS" | "FAIL";
  createdAt: string;
  submitterName?: string | null;
  inspectorName?: string | null;
  samples: Array<{
    itemId: number;
    itemName: string;
    itemOrder: number;
    issues: AnnotationTaskSampleIssueDto[];
  }>;
};

type AnnotationTaskQualityRecordPageDto = {
  summary?: AnnotationTaskListDataDto["summary"];
  pageNo: number;
  pageSize: number;
  total: number;
  list: AnnotationTaskQualityRecordDto[];
};

type AnnotationTaskLabelConfigDto = AnnotationTaskLabelConfig;

type AnnotationTaskOhifDto = {
  studyInstanceUID?: string | null;
};

function assertSuccess<T>(response: ApiResponse<T>): void {
  if (String(response.code) !== "0") {
    throw new Error(
      response.message || i18n.global.t("annotationTask.loadFailed.title"),
    );
  }
}

function unwrapRequired<T>(response: ApiResponse<T>, message: string): T {
  assertSuccess(response);
  if (response.data === null || response.data === undefined) {
    throw new Error(message);
  }
  return response.data;
}

function toTaskStatus(status: AnnotationTaskStatusDto): AnnotationTaskStatus {
  const statusMap: Record<AnnotationTaskStatusDto, AnnotationTaskStatus> = {
    ANNOTATING: "annotating",
    QUALITY_CHECKING: "qualityChecking",
    REWORKING: "reworking",
    COMPLETED: "completed",
  };
  return statusMap[status];
}

function toTask(dto: AnnotationTaskListItemDto): AnnotationTask;
function toTask(dto: AnnotationTaskDetailDto): AnnotationTask;
function toTask(
  dto: AnnotationTaskListItemDto | AnnotationTaskDetailDto,
): AnnotationTask {
  const detail = "projectCode" in dto;
  return {
    id: String(dto.id),
    projectCode: detail ? dto.projectCode : undefined,
    designerCode: detail ? dto.designerCode : undefined,
    displayName: dto.taskName,
    taskType: detail ? dto.taskType : undefined,
    batchNo: detail ? dto.batchNo : undefined,
    iterationId: detail ? dto.iterationId : null,
    iterationNo: detail ? dto.iterationNo : null,
    status: toTaskStatus(dto.status),
    annotatorId: dto.annotatorId,
    assigneeName: dto.annotatorName || undefined,
    sampleCount: dto.sampleCount,
    startedAt: dto.startedAt,
    deadlineAt: dto.dueAt,
  };
}

function toSample(
  dto:
    | AnnotationTaskSampleDto
    | AnnotationTaskRuleCheckDto["rules"][number]["samples"][number],
): AnnotationTaskSample {
  const issues = dto.latestCheckIssues ?? dto.issues ?? [];
  const mappedIssues = issues.map((issue) => ({
    source: issue.issueSource,
    objectName: issue.annotationObjectName ?? "",
    objectId:
      issue.annotationObjectId === null ||
      issue.annotationObjectId === undefined
        ? undefined
        : String(issue.annotationObjectId),
    comment: issue.description,
    handling: issue.issueLevel === "MUST_FIX" ? "必须修改" : "建议修改",
    location: issue.annotationObjectId
      ? `对象 ${issue.annotationObjectId}`
      : "",
  }));
  const issueLevel = mappedIssues.some((issue) => issue.handling === "必须修改")
    ? "mustFix"
    : mappedIssues.length > 0
      ? "suggestion"
      : "none";
  const sampleStatusMap: Record<
    AnnotationTaskSampleDto["itemStatus"],
    AnnotationTaskSampleStatus
  > = {
    ANNOTATING: "annotating",
    COMPLETED: "completed",
    REWORKING: "reworking",
  };
  return {
    id: String(dto.itemId),
    code: `#${dto.itemOrder}`,
    name: dto.itemName,
    status: "itemStatus" in dto ? sampleStatusMap[dto.itemStatus] : undefined,
    issueLevel,
    issueCount:
      "latestCheckIssueCount" in dto
        ? dto.latestCheckIssueCount
        : mappedIssues.length,
    issueSummary: mappedIssues[0]?.comment,
    issues: mappedIssues.length ? mappedIssues : undefined,
    issueDetail: mappedIssues[0],
    location: { itemOrder: dto.itemOrder },
  };
}

function toValidationResult(
  result: AnnotationTaskRuleCheckDto["result"],
): AnnotationTaskValidationRecord["result"] {
  const resultMap: Record<
    AnnotationTaskRuleCheckDto["result"],
    AnnotationTaskValidationRecord["result"]
  > = {
    PROCESSING: "processing",
    PASS: "passed",
    FAIL: "failed",
    ERROR: "error",
  };
  return resultMap[result];
}

function toValidationRecord(
  dto: AnnotationTaskRuleCheckDto,
): AnnotationTaskValidationRecord {
  return {
    id: String(dto.id),
    submittedAt: dto.createdAt,
    result: toValidationResult(dto.result),
    rules: dto.rules.map((rule) => ({
      id: String(rule.ruleId),
      name: rule.ruleName,
      description: rule.description,
      issueSamples: rule.samples.map(toSample),
    })),
  };
}

function toQualityRecord(
  dto: AnnotationTaskQualityRecordDto,
): AnnotationTaskQualityRecord {
  return {
    id: String(dto.id),
    result: dto.result === "PASS" ? "passed" : "failed",
    submittedAt: dto.createdAt,
    submitterName: dto.submitterName || undefined,
    inspectorName: dto.inspectorName || undefined,
    samples: dto.samples.map((sample) => toSample(sample)),
  };
}

function toTaskId(taskId: string): number {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`Invalid annotation task id: ${taskId}`);
  }
  return id;
}

/** 将页面样本 ID 转为后端 itemId；非法值直接拒绝，避免请求错误路径。 */
function toItemId(itemId: string): number {
  const id = Number(itemId);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`Invalid annotation item id: ${itemId}`);
  }
  return id;
}

/** 分页查询当前用户的标注任务，并将后端状态和字段转换为页面模型。 */
export async function getAnnotationTaskListApi(
  params: AnnotationTaskListParams = {},
): Promise<AnnotationTaskListResult> {
  const pageNo = params.page ?? ANNOTATION_TASK_DEFAULT_PAGE;
  const pageSize = params.pageSize ?? ANNOTATION_TASK_DEFAULT_PAGE_SIZE;
  const response = await http.get<ApiResponse<AnnotationTaskListDataDto>>(
    "/annotation-tasks",
    {
      params: {
        pageNo,
        pageSize,
        statusFilter:
          params.status && params.status !== "all"
            ? params.status
                .replace(/[A-Z]/g, (letter) => `_${letter}`)
                .toUpperCase()
            : undefined,
        keyword: params.keyword?.trim() || undefined,
        projectCode: params.projectCode,
        sortField: params.sortField,
        ascSort: params.ascSort,
      },
    },
  );
  const data = unwrapRequired(response.data, "标注任务列表数据为空");
  if (!data.summary || !Array.isArray(data.list)) {
    throw new Error("标注任务列表响应格式无效");
  }
  return {
    list: data.list.map(toTask),
    total: data.total,
    page: data.pageNo,
    pageSize: data.pageSize,
    statistics: data.summary,
  };
}

/** 查询标注任务详情；样本由详情接口一次性返回。 */
export async function getAnnotationTaskDetailApi(
  taskId: string,
): Promise<AnnotationTaskDetail> {
  const response = await http.get<ApiResponse<AnnotationTaskDetailDto>>(
    `/annotation-tasks/${toTaskId(taskId)}`,
  );
  const data = unwrapRequired(response.data, "标注任务详情数据为空");
  return {
    ...toTask(data),
    samples: (data.samples ?? []).map(toSample),
    validationRecords: [],
  };
}

/** 查询任务规则校验记录，并转换为详情页展示模型。 */
export async function getAnnotationTaskValidationRecordsApi(
  taskId: string,
): Promise<AnnotationTaskValidationRecord[]> {
  const response = await http.get<ApiResponse<AnnotationTaskRuleCheckPageDto>>(
    `/annotation-tasks/${toTaskId(taskId)}/rule-check-records`,
    { params: { pageNo: 1, pageSize: 100 } },
  );
  const data = unwrapRequired(response.data, "规则校验记录数据为空");
  if (!Array.isArray(data.list)) {
    throw new Error("规则校验记录响应格式无效");
  }
  return data.list.map(toValidationRecord);
}

/** 分页查询任务人工质检记录，并转换为详情页业务模型。 */
export async function getAnnotationTaskQualityRecordsApi(
  taskId: string,
  params: AnnotationTaskQualityRecordsParams = {},
): Promise<AnnotationTaskQualityRecordsResult> {
  const response = await http.get<
    ApiResponse<AnnotationTaskQualityRecordPageDto>
  >(`/annotation-tasks/${toTaskId(taskId)}/quality-records`, {
    params: {
      submissionId: params.submissionId,
      itemId: params.itemId,
      issueLevel: params.issueLevel,
      pageNo: params.page ?? 1,
      pageSize:
        params.pageSize ?? ANNOTATION_TASK_QUALITY_RECORD_DEFAULT_PAGE_SIZE,
    },
  });
  const data = unwrapRequired(response.data, "人工质检记录数据为空");
  if (!Array.isArray(data.list)) {
    throw new Error("人工质检记录响应格式无效");
  }
  return {
    list: data.list.map(toQualityRecord),
    total: data.total,
    page: data.pageNo,
    pageSize: data.pageSize,
    statistics: data.summary,
  };
}

/** 重新指派标注员；成功响应的 data 按接口约定为 null。 */
export async function assignAnnotationTaskApi(
  taskId: string,
  annotatorId: number,
): Promise<void> {
  const response = await http.post<ApiResponse<null>>(
    `/annotation-tasks/${toTaskId(taskId)}/assign`,
    { annotatorId },
  );
  assertSuccess(response.data);
}

/** 查询任务标签及动态属性配置，供标注工作台加载标签表单。 */
export async function getAnnotationTaskLabelConfigApi(
  taskId: string,
): Promise<AnnotationTaskLabelConfig> {
  const response = await http.get<ApiResponse<AnnotationTaskLabelConfigDto>>(
    `/annotation-tasks/${toTaskId(taskId)}/label-config`,
  );
  return unwrapRequired(response.data, "标注任务标签配置数据为空");
}

/** 提交标注任务质检，状态流转和质检任务编排由后端完成。 */
export async function submitAnnotationTaskQualityApi(
  taskId: string,
): Promise<AnnotationTaskSubmitQualityResult> {
  const response = await http.post<
    ApiResponse<AnnotationTaskSubmitQualityResult>
  >(`/annotation-tasks/${toTaskId(taskId)}/submit-quality`);
  return unwrapRequired(response.data, "提交质检未返回结果");
}

/**
 * 按样本 itemId 查询 OHIF 工作台所需的 studyInstanceUID。
 * 请求参数为路径中的 itemId；成功时返回非空影像标识字符串。
 */
export async function getAnnotationTaskOhifStudyInstanceUidApi(
  itemId: string,
): Promise<string> {
  const response = await http.get<ApiResponse<AnnotationTaskOhifDto>>(
    `/annotation-tasks/ohif/${toItemId(itemId)}`,
  );
  const data = unwrapRequired(response.data, "OHIF 影像标识为空");
  const studyInstanceUID = data.studyInstanceUID?.trim();
  if (!studyInstanceUID) {
    throw new Error("OHIF 影像标识为空");
  }
  return studyInstanceUID;
}

/** 直接完成迭代预标注任务复核，跳过规则质检和人工质检流程。 */
export async function completeIterativeAnnotationTaskApi(
  taskId: string,
): Promise<AnnotationTaskCompleteIterativeResult> {
  const response = await http.post<ApiResponse<boolean>>(
    `/annotation-tasks/${toTaskId(taskId)}/complete-iterative`,
  );
  return unwrapRequired(response.data, "完成复核未返回结果");
}
