import http from "@/api/http";
import utils from "@/utils";

export type QualityPlanScope = "full" | "sample";

// 执行方式和分配方式由字典驱动，页面模型不锁死未来取值。
export type QualityExecutionMode = string;
export type QualityAssignmentMode = string;

export type QualityPlanDictionaryOption = {
  value: string;
  labelKey: string;
};

export const QUALITY_PLAN_DEFAULT_PAGE = 1;
export const QUALITY_PLAN_DEFAULT_PAGE_SIZE = 20;

export const QUALITY_PLAN_SCOPE_OPTIONS = [
  { value: "full", labelKey: "qualityPlan.scope.full" },
  { value: "sample", labelKey: "qualityPlan.scope.sample" },
] as const satisfies readonly QualityPlanDictionaryOption[];

export const QUALITY_EXECUTION_MODE_OPTIONS = [
  { value: "single", labelKey: "qualityPlan.executionMode.single" },
] as const satisfies readonly QualityPlanDictionaryOption[];

export const QUALITY_ASSIGNMENT_MODE_OPTIONS = [
  { value: "automatic", labelKey: "qualityPlan.assignmentMode.automatic" },
] as const satisfies readonly QualityPlanDictionaryOption[];

export type QualityPlanLevel = {
  id?: number;
  draftKey: string;
  name: string;
  levelOrder: number;
  scope: QualityPlanScope;
  sampleRate?: number;
  executionMode: QualityExecutionMode;
  assignmentMode: QualityAssignmentMode;
};

export type QualityPlanListItem = {
  id: number;
  name: string;
  description: string;
  levelCount: number;
};

export type QualityPlan = {
  id: number;
  name: string;
  description: string;
  levels: QualityPlanLevel[];
};

export type QualityPlanInput = Omit<QualityPlan, "id">;

export type QualityPlanListParams = {
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type QualityPlanListResult = {
  list: QualityPlanListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type QualitySchemeCheckScopeDto = "FULL" | "SAMPLED";

type QualitySchemeLevelDto = {
  id: number;
  levelName: string;
  levelOrder: number;
  checkScope: QualitySchemeCheckScopeDto;
  samplingRatio: number;
  executionType: string;
  assignmentType: string;
};

type QualitySchemeLevelRequestDto = Omit<QualitySchemeLevelDto, "id"> & {
  id?: number;
};

type QualitySchemeRequestDto = {
  schemeName: string;
  schemeDescription: string | null;
  levels: QualitySchemeLevelRequestDto[];
};

type QualitySchemeListItemDto = {
  id: number;
  schemeName: string;
  schemeDescription?: string | null;
  levelCount: number;
};

type QualitySchemeDetailDto = {
  id: number;
  schemeName: string;
  schemeDescription?: string | null;
  levels: QualitySchemeLevelDto[];
};

type QualitySchemePageDto = {
  pageNo: number;
  pageSize: number;
  total: number;
  list: QualitySchemeListItemDto[];
};

type QualitySchemeResponse<T> = {
  code: string;
  message?: string;
  data: T | null;
};

/** 质量方案业务错误，保留后端 code 和可直接展示的 message。 */
export class QualityPlanApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "QualityPlanApiError";
    this.code = code;
  }
}

/** 把页面检查范围转换为后端枚举值。 */
function toCheckScopeDto(scope: QualityPlanScope): QualitySchemeCheckScopeDto {
  return scope === "full" ? "FULL" : "SAMPLED";
}

/** 把后端检查范围转换为页面字典值。 */
function fromCheckScopeDto(
  scope: QualitySchemeCheckScopeDto,
): QualityPlanScope {
  return scope === "FULL" ? "full" : "sample";
}

/** 转换当前固定字典值，同时允许未来字典值由模块透传。 */
function toExecutionTypeDto(mode: QualityExecutionMode): string {
  return mode === "single" ? "SINGLE" : mode;
}

/** 转换执行方式响应值，未知值保持不变。 */
function fromExecutionTypeDto(type: string): QualityExecutionMode {
  return type === "SINGLE" ? "single" : type;
}

/** 转换当前固定分配值，同时允许未来字典值由模块透传。 */
function toAssignmentTypeDto(mode: QualityAssignmentMode): string {
  return mode === "automatic" ? "AUTO" : mode;
}

/** 转换分配方式响应值，未知值保持不变。 */
function fromAssignmentTypeDto(type: string): QualityAssignmentMode {
  return type === "AUTO" ? "automatic" : type;
}

/** 校验字符串长度，尽早给表单返回与接口契约一致的提示。 */
function validateTextLength(
  value: string,
  fieldName: string,
  minLength: number,
  maxLength: number,
) {
  if (value.length < minLength || value.length > maxLength) {
    throw new QualityPlanApiError(
      "100001",
      `${fieldName}长度需为 ${minLength}～${maxLength} 个字符`,
    );
  }
}

/** 将页面提交模型规范化并转换为正式接口请求 DTO。 */
function toQualitySchemeRequestDto(
  input: QualityPlanInput,
): QualitySchemeRequestDto {
  const schemeName = input.name.trim();
  const schemeDescription = input.description.trim();

  validateTextLength(schemeName, "质量方案名称", 1, 50);
  if (schemeDescription.length > 200) {
    throw new QualityPlanApiError(
      "100001",
      "质量方案描述长度不能超过 200 个字符",
    );
  }
  if (input.levels.length < 1) {
    throw new QualityPlanApiError("100001", "质量方案至少需要一个质检层级");
  }

  const normalizedLevelNames = new Set<string>();
  const levels = input.levels.map((level, index) => {
    const levelName = level.name.trim();

    validateTextLength(levelName, "质检层级名称", 1, 50);
    if (normalizedLevelNames.has(levelName)) {
      throw new QualityPlanApiError(
        "160024",
        "同一质量方案内的层级名称不能重复",
      );
    }
    normalizedLevelNames.add(levelName);

    const samplingRatio = level.scope === "full" ? 100 : level.sampleRate;
    if (
      samplingRatio === undefined ||
      !Number.isInteger(samplingRatio) ||
      samplingRatio < 1 ||
      samplingRatio > 100
    ) {
      throw new QualityPlanApiError("160025", "抽样比例需为 1～100 的整数");
    }
    if (
      level.id !== undefined &&
      (!Number.isInteger(level.id) || level.id < 1)
    ) {
      throw new QualityPlanApiError("160024", "质检层级 ID 不合法");
    }

    return {
      ...(level.id === undefined ? {} : { id: level.id }),
      levelName,
      levelOrder: index + 1,
      checkScope: toCheckScopeDto(level.scope),
      samplingRatio,
      // executionMode 和 assignmentMode 不做未来值校验，交由服务端字典处理。
      executionType: toExecutionTypeDto(level.executionMode),
      assignmentType: toAssignmentTypeDto(level.assignmentMode),
    };
  });

  return {
    schemeName,
    schemeDescription: schemeDescription || null,
    levels,
  };
}

/** 将层级 DTO 转换为页面模型，并生成稳定的 Vue key。 */
function toQualityPlanLevel(level: QualitySchemeLevelDto): QualityPlanLevel {
  return {
    id: level.id,
    draftKey: `quality-plan-level-${level.id}`,
    name: level.levelName,
    levelOrder: level.levelOrder,
    scope: fromCheckScopeDto(level.checkScope),
    sampleRate: level.samplingRatio,
    executionMode: fromExecutionTypeDto(level.executionType),
    assignmentMode: fromAssignmentTypeDto(level.assignmentType),
  };
}

/** 将列表 DTO 转换为页面列表项。 */
function toQualityPlanListItem(
  item: QualitySchemeListItemDto,
): QualityPlanListItem {
  return {
    id: item.id,
    name: item.schemeName,
    description: item.schemeDescription ?? "",
    levelCount: item.levelCount,
  };
}

/** 将详情 DTO 转换为页面详情模型。 */
function toQualityPlan(detail: QualitySchemeDetailDto): QualityPlan {
  return {
    id: detail.id,
    name: detail.schemeName,
    description: detail.schemeDescription ?? "",
    levels: detail.levels
      .slice()
      .sort(
        (left, right) =>
          left.levelOrder - right.levelOrder || left.id - right.id,
      )
      .map(toQualityPlanLevel),
  };
}

/** 解包统一响应，覆盖业务失败码和成功但 data 为空的异常响应。 */
function unwrapQualitySchemeResponse<T>(
  response: QualitySchemeResponse<T>,
  emptyDataMessage: string,
): T {
  if (response.code !== "0") {
    throw new QualityPlanApiError(
      response.code,
      response.message ?? "质量方案接口请求失败",
    );
  }
  if (response.data === null || response.data === undefined) {
    throw new QualityPlanApiError("INVALID_RESPONSE", emptyDataMessage);
  }

  return response.data;
}

/** 分页查询质量方案，显式传递产品确认的默认每页 20 条。 */
export async function getQualityPlanListApi(
  params: QualityPlanListParams = {},
): Promise<QualityPlanListResult> {
  const pageNo = params.page ?? QUALITY_PLAN_DEFAULT_PAGE;
  const pageSize = params.pageSize ?? QUALITY_PLAN_DEFAULT_PAGE_SIZE;
  const response = await http.get<QualitySchemeResponse<QualitySchemePageDto>>(
    "/quality-schemes",
    {
      params: {
        keyword: params.keyword?.trim() || undefined,
        pageNo,
        pageSize,
      },
    },
  );
  const page = unwrapQualitySchemeResponse(
    response.data,
    "质量方案列表数据为空",
  );

  return {
    list: page.list.map(toQualityPlanListItem),
    total: page.total,
    page: page.pageNo,
    pageSize: page.pageSize,
  };
}

/** 查询指定质量方案详情，并转换为页面模型。 */
export async function getQualityPlanDetailApi(
  id: number,
): Promise<QualityPlan> {
  const response = await http.get<
    QualitySchemeResponse<QualitySchemeDetailDto>
  >(`/quality-schemes/${id}`);
  return utils.cloneDeep(
    toQualityPlan(
      unwrapQualitySchemeResponse(response.data, "质量方案详情数据为空"),
    ),
  );
}

/** 新增质量方案，页面模型在 API 边界转换为正式请求 DTO。 */
export async function createQualityPlanApi(
  input: QualityPlanInput,
): Promise<QualityPlan> {
  const response = await http.post<
    QualitySchemeResponse<QualitySchemeDetailDto>
  >("/quality-schemes", toQualitySchemeRequestDto(input));
  return utils.cloneDeep(
    toQualityPlan(
      unwrapQualitySchemeResponse(response.data, "新增质量方案未返回数据"),
    ),
  );
}

/** 整体更新质量方案，保留已有层级 ID 并按数组顺序生成 levelOrder。 */
export async function updateQualityPlanApi(
  id: number,
  input: QualityPlanInput,
): Promise<QualityPlan> {
  const response = await http.put<
    QualitySchemeResponse<QualitySchemeDetailDto>
  >(`/quality-schemes/${id}`, toQualitySchemeRequestDto(input));
  return utils.cloneDeep(
    toQualityPlan(
      unwrapQualitySchemeResponse(response.data, "更新质量方案未返回数据"),
    ),
  );
}

/** 逻辑删除指定质量方案，成功响应的 data 按接口契约为 null。 */
export async function deleteQualityPlanApi(id: number): Promise<void> {
  const response = await http.delete<QualitySchemeResponse<null>>(
    `/quality-schemes/${id}`,
  );
  if (response.data.code !== "0") {
    throw new QualityPlanApiError(
      response.data.code,
      response.data.message ?? "删除质量方案失败",
    );
  }
}

/** 返回接口或模块错误的可展示信息，非项目错误码直接透传 message。 */
export function getQualityPlanErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (error instanceof QualityPlanApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const responseData = (error as { response?: { data?: unknown } }).response
      ?.data;
    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "message" in responseData &&
      typeof responseData.message === "string"
    ) {
      return responseData.message;
    }
  }

  return fallbackMessage;
}
