import http from "@/api/http";
import type { AxiosResponse } from "axios";

/** 模型配置接口统一响应包装。 */
export interface ModelConfigApiResponse<T> {
  code: string;
  data: T;
  message: string;
}

export type ModelConfigStatus = "ENABLED" | "DISABLED" | string;
export type ModelApiProtocol = "HTTP_JSON" | string;

/** 模型输出标签及其关联的平台标签。 */
export interface ModelOutputLabel {
  outputLabelName: string;
  platformLabelId: number;
  platformLabelName?: string;
}

/** 模型列表、详情和版本接口共用的模型信息。 */
export interface ModelConfigRecord {
  accuracy: number | null;
  apiEndpoint: string;
  apiKey?: string | null;
  apiProtocol: ModelApiProtocol;
  createdAt: string;
  createdBy: number;
  latestVersionId: number;
  labels: ModelOutputLabel[];
  modelDesc: string | null;
  modelId: number;
  modelName: string;
  selfIterationEnabled: boolean;
  selfIterationSupported: boolean;
  status: ModelConfigStatus;
  updatedAt: string;
  updatedBy: number;
  versionId?: number;
  versionNo: string;
}

/** 模型分页查询参数。 */
export interface ModelConfigPageParams {
  ascSort?: boolean;
  keyword?: string;
  pageNo?: number;
  pageSize?: number;
  selfIterationSupported?: boolean;
  sortField?: "createdAt";
}

/** 模型分页查询结果。 */
export interface ModelConfigPageData {
  list: ModelConfigRecord[];
  pageNo: number;
  pageSize: number;
  total: number;
}

/** 新增模型时提交的模型基础信息和输出标签。 */
export interface CreateModelConfigInput {
  apiEndpoint: string;
  apiKey: string;
  apiProtocol: ModelApiProtocol;
  labels: ModelOutputLabelInput[];
  modelDesc: string;
  modelName: string;
  selfIterationEnabled: boolean;
  selfIterationSupported: boolean;
}

/** 更新模型时允许修改的字段。 */
export interface UpdateModelConfigInput {
  apiKey: string;
  labels: ModelOutputLabelInput[];
  modelDesc: string;
  selfIterationEnabled: boolean;
  selfIterationSupported: boolean;
}

/** 新增和更新模型提交的输出标签字段。 */
export interface ModelOutputLabelInput {
  outputLabelName: string;
  platformLabelId: number;
}

/** 模型版本信息。 */
export interface ModelVersionRecord {
  accuracy: number | null;
  apiEndpoint: string;
  apiKey: string | null;
  apiProtocol: ModelApiProtocol;
  selfIterationEnabled: boolean;
  selfIterationSupported: boolean;
  status: string;
  versionId: number;
  versionNo: string;
}

const MODEL_CONFIG_API = {
  associatedLabelIds: "/models/label-ids",
  modelDetail: (modelId: string | number) => `/models/${modelId}`,
  modelPage: "/models/page",
  models: "/models",
  versions: (modelId: string | number) => `/models/${modelId}/versions`,
} as const;

/** 从统一响应包装中提取业务数据，页面无需感知 code/message 字段。 */
function unwrap<T>(response: AxiosResponse<ModelConfigApiResponse<T>>): T {
  const payload = response.data;
  if (response.status === 400 || payload.code !== "0") {
    throw new Error(payload.message || "模型配置请求失败");
  }
  return payload.data;
}

/** 查询已关联模型的标签 ID 列表。 */
export async function getAssociatedModelLabelIdsApi(): Promise<number[]> {
  const response = await http.get<ModelConfigApiResponse<number[]>>(
    MODEL_CONFIG_API.associatedLabelIds,
  );
  return unwrap(response);
}

/** 分页查询模型列表，支持关键词、自迭代能力筛选和创建时间服务端排序。 */
export async function getModelConfigPageApi(
  params: ModelConfigPageParams = {},
): Promise<ModelConfigPageData> {
  const response = await http.get<ModelConfigApiResponse<ModelConfigPageData>>(
    MODEL_CONFIG_API.modelPage,
    { params },
  );
  return unwrap(response);
}

/** 查询指定模型的最新版本详情和输出标签。 */
export async function getModelConfigDetailApi(
  modelId: string | number,
): Promise<ModelConfigRecord> {
  const response = await http.get<ModelConfigApiResponse<ModelConfigRecord>>(
    MODEL_CONFIG_API.modelDetail(modelId),
  );
  return unwrap(response);
}

/** 创建模型及其首个版本配置。 */
export async function createModelConfigApi(
  data: CreateModelConfigInput,
): Promise<boolean> {
  const response = await http.post<ModelConfigApiResponse<boolean>>(
    MODEL_CONFIG_API.models,
    data,
  );
  return unwrap(response);
}

/** 更新模型最新版本的描述、密钥、自迭代配置和输出标签。 */
export async function updateModelConfigApi(
  modelId: string | number,
  data: UpdateModelConfigInput,
): Promise<boolean> {
  const response = await http.put<ModelConfigApiResponse<boolean>>(
    MODEL_CONFIG_API.modelDetail(modelId),
    data,
  );
  return unwrap(response);
}

/** 删除指定模型。 */
export async function deleteModelConfigApi(
  modelId: string | number,
): Promise<boolean> {
  const response = await http.delete<ModelConfigApiResponse<boolean>>(
    MODEL_CONFIG_API.modelDetail(modelId),
  );
  return unwrap(response);
}

/** 查询指定模型的历史版本列表。 */
export async function getModelVersionListApi(
  modelId: string | number,
): Promise<ModelVersionRecord[]> {
  const response = await http.get<ModelConfigApiResponse<ModelVersionRecord[]>>(
    MODEL_CONFIG_API.versions(modelId),
  );
  return unwrap(response);
}
