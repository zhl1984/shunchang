import http from "@/api/http";
import { i18n } from "@/locales";

/** 开发配置接口统一响应包装。 */
export interface DevelopmentConfigApiResponse<T> {
  code: string;
  data: T;
  message: string;
}

export type DevelopmentConfigStatus = "ENABLED" | "DISABLED";
export type DesignerPresetType = "PLATFORM_PRESET" | string;

export interface DesignerToolPropertyItem {
  code: string;
  name: string;
}

export interface DesignerToolProperties {
  description: string;
  name: string;
  properties: DesignerToolPropertyItem[];
  value: string;
}

export interface AnnotationDesignerTool {
  status: DevelopmentConfigStatus;
  toolDesc: string;
  toolId: number;
  toolName: string;
  toolProperties: DesignerToolProperties;
}

export interface AnnotationDesigner {
  designerCode: string;
  designerDesc: string;
  designerId: number;
  designerName: string;
  inputFormats: string;
  outputFormats: string;
  presetType: DesignerPresetType;
  status: DevelopmentConfigStatus;
  tools: AnnotationDesignerTool[];
}

export interface AnnotationDesignerListParams {
  status?: DevelopmentConfigStatus;
}

export interface AnnotationTypeRecord {
  annotationTypeDesc: string;
  annotationTypeId: number;
  annotationTypeName: string;
  dataFormat: string;
  designerId: number;
  designerName: string;
  isUsed: boolean;
  status: DevelopmentConfigStatus;
}

export interface AnnotationTypePageParams {
  keyword?: string;
  pageNo?: number;
  pageSize?: number;
  status?: DevelopmentConfigStatus;
}

export interface AnnotationTypePageData {
  list: AnnotationTypeRecord[];
  pageNo: number;
  pageSize: number;
  total: number;
}

export interface CreateAnnotationTypeInput {
  annotationTypeDesc?: string;
  annotationTypeName: string;
  dataFormat: string;
  designerId: number;
}

export interface CreateAnnotationTypeParams {
  status?: DevelopmentConfigStatus;
}

export interface UpdateAnnotationTypeInput {
  annotationTypeDesc: string;
  annotationTypeName: string;
  dataFormat: string;
  designerId: number;
}

export type AnnotationToolProperty = {
  code: string;
  name: string;
  type: "number" | "json" | "boolean";
};

export type AnnotationTool = {
  toolId: number;
  toolCode: string;
  toolName: string;
  toolDesc: string;
  toolProperties: AnnotationToolProperty[];
};

type AnnotationToolResponse = {
  code: string | number;
  message?: string | null;
  data?: AnnotationTool[] | null;
};

const DEVELOPMENT_CONFIG_API = {
  annotationDesigners: "/annotation-designers",
  annotationTypes: "/annotation-types",
  annotationTypePage: "/annotation-types/page",
  annotationTools: "/annotation-tools",
} as const;

/** 从统一响应包装中提取业务数据，页面无需感知 code/message 字段。 */
function unwrap<T>(response: DevelopmentConfigApiResponse<T>): T {
  return response.data;
}

/** 从 400 响应中兼容读取后端 message/msg，交给页面展示业务校验信息。 */
function throwBadRequestMessage<T>(response: {
  status: number;
  data: T;
}): void {
  if (response.status !== 400) return;
  const payload = response.data as { message?: unknown; msg?: unknown };
  const detail =
    (typeof payload.message === "string" && payload.message) ||
    (typeof payload.msg === "string" && payload.msg) ||
    i18n.global.t("developmentConfig.api.validationFailed");
  throw new Error(detail);
}

/**
 * 查询标注设计器列表。
 * @param params 可选状态筛选，ENABLED 为启用、DISABLED 为禁用。
 * @returns 符合状态条件的设计器及其工具、输入和输出格式。
 */
export async function getAnnotationDesignerListApi(
  params: AnnotationDesignerListParams = {},
): Promise<AnnotationDesigner[]> {
  const response = await http.get<
    DevelopmentConfigApiResponse<AnnotationDesigner[]>
  >(DEVELOPMENT_CONFIG_API.annotationDesigners, { params });
  throwBadRequestMessage(response);
  return unwrap(response.data);
}

/**
 * 查询指定标注设计器详情。
 * @param designerId 标注设计器 ID，按 OpenAPI 作为 URL 路径参数传递。
 * @returns 设计器基础信息、格式配置和完整工具集合。
 */
export async function getAnnotationDesignerDetailApi(
  designerId: string | number,
): Promise<AnnotationDesigner> {
  const response = await http.get<
    DevelopmentConfigApiResponse<AnnotationDesigner>
  >(`${DEVELOPMENT_CONFIG_API.annotationDesigners}/${designerId}`);
  throwBadRequestMessage(response);
  return unwrap(response.data);
}

/**
 * 分页查询标注类型列表。
 * @param params 搜索关键词、页码、每页条数和可选状态筛选。
 * @returns 当前页标注类型、分页信息和总条数。
 */
export async function getAnnotationTypePageApi(
  params: AnnotationTypePageParams = {},
): Promise<AnnotationTypePageData> {
  const response = await http.get<
    DevelopmentConfigApiResponse<AnnotationTypePageData>
  >(DEVELOPMENT_CONFIG_API.annotationTypePage, {
    autoCancel: "development-config-annotation-type-page",
    params,
  });
  throwBadRequestMessage(response);
  return unwrap(response.data);
}

/**
 * 创建标注类型。
 * @param data 标注类型名称、可选说明、设计器 ID 和设计器支持的数据格式。
 * @param params OpenAPI 定义的可选状态查询参数。
 * @returns 后端是否创建成功。
 */
export async function createAnnotationTypeApi(
  data: CreateAnnotationTypeInput,
  params: CreateAnnotationTypeParams = {},
): Promise<boolean> {
  const response = await http.post<DevelopmentConfigApiResponse<boolean>>(
    DEVELOPMENT_CONFIG_API.annotationTypes,
    data,
    { params },
  );
  throwBadRequestMessage(response);
  return unwrap(response.data);
}

/**
 * 更新指定标注类型。
 * @param annotationTypeId 待更新标注类型 ID。
 * @param data 完整的标注类型名称、说明、设计器 ID 和数据格式。
 * @returns 后端是否更新成功。
 */
export async function updateAnnotationTypeApi(
  annotationTypeId: string | number,
  data: UpdateAnnotationTypeInput,
): Promise<boolean> {
  const response = await http.put<DevelopmentConfigApiResponse<boolean>>(
    `${DEVELOPMENT_CONFIG_API.annotationTypes}/${annotationTypeId}`,
    data,
  );
  throwBadRequestMessage(response);
  return unwrap(response.data);
}

/**
 * 删除指定标注类型。
 * @param annotationTypeId 待删除标注类型 ID。
 * @returns 后端是否删除成功；已被业务使用时由后端拒绝操作。
 */
export async function deleteAnnotationTypeApi(
  annotationTypeId: string | number,
): Promise<boolean> {
  const response = await http.delete<DevelopmentConfigApiResponse<boolean>>(
    `${DEVELOPMENT_CONFIG_API.annotationTypes}/${annotationTypeId}`,
  );
  throwBadRequestMessage(response);
  return unwrap(response.data);
}

/** 查询系统可用的标注工具列表。 */
export async function getAnnotationToolsApi(): Promise<AnnotationTool[]> {
  const response = await http.get<AnnotationToolResponse>(
    DEVELOPMENT_CONFIG_API.annotationTools,
  );
  const payload = response.data;
  if (String(payload.code) !== "0") {
    throw new Error(
      payload.message ||
        i18n.global.t("developmentConfig.api.toolsQueryFailed"),
    );
  }
  return payload.data ?? [];
}
