import http from "./http";
import { i18n } from "@/locales";

export type ProjectStatus = "PROCESSING" | "RUNNING" | "COMPLETED" | "FAILED";
export interface ProjectListItem {
  projectId: number;
  projectCode: string;
  projectName: string;
  deadline: string;
  dataCount: number;
  batchSize: number;
  projectStatus: ProjectStatus;
  iterationEnabled: boolean;
}
export interface ProjectListQuery {
  ascSort?: boolean;
  keyword?: string;
  status?: ProjectStatus;
  iterationEnabled?: boolean;
  pageNo: number;
  pageSize: number;
  sortField?: "deadline";
}
export interface ProjectListResult {
  pageNo: number;
  pageSize: number;
  total: number;
  list: ProjectListItem[];
}
export interface ProjectStatistics {
  total: number;
  PROCESSING: number;
  RUNNING: number;
  COMPLETED: number;
  FAILED: number;
}
export interface ProjectIterationConfig {
  targetAccuracy: number;
  maxRounds: number;
}
export type IterationStatus =
  | "NOT_STARTED"
  | "SELECTING"
  | "PRE_LABELING"
  | "MANUAL_REVIEWING"
  | "TRAINING"
  | "VERSION_CONFIRMING"
  | "FULL_PRE_LABELING"
  | "COMPLETED"
  | "FAILED";
export interface ProjectIteration {
  iterationId: number;
  projectCode: string;
  runId: number;
  roundNo: number;
  modelId: number;
  modelVersionNo: string;
  nextModelVersionNo: string;
  status: IterationStatus;
  accuracy: number | null;
  accuracyDelta: number | null;
  stopReason: string | null;
  manualCount: number;
  preLabelCount: number;
}
export interface CreateProjectParams {
  projectName: string;
  projectDesc: string;
  ownerUserId: number;
  deadline: string;
  annotationTypeId: number;
  sceneId: number;
  datasetId: number;
  dataType: string;
  batchSize: number;
  annotatorUserIds: number[];
  qualityUserIds: Record<string, number[]>;
  iterationEnabled: boolean;
  iterationConfig: ProjectIterationConfig;
}
export interface ProjectDetail extends ProjectListItem {
  projectDesc: string;
  ownerUserId: number;
  ownerUserName?: string;
  annotationTypeId: number;
  sceneId: number;
  sceneName?: string;
  datasetId: number;
  dataType: string;
  errorMessage?: string | null;
  iterationConfig?: ProjectIterationConfig | null;
  annotatorUserIds?: number[];
  qualityUserIds?: Record<string, number[]>;
}
interface ApiResponse<T> {
  code: string | number;
  message?: string;
  data?: T | null;
}

/** 分页查询项目列表，支持筛选及按截止时间服务端排序，并返回后端分页结果。 */
export async function getProjectListApi(
  query: ProjectListQuery,
): Promise<ProjectListResult> {
  const response = await http.get<ApiResponse<ProjectListResult>>("/projects", {
    params: query,
  });
  if (String(response.data.code) !== "0" || !response.data.data)
    throw new Error(
      response.data.message ||
        i18n.global.t("projectManagement.feedback.listFailed"),
    );
  return { ...response.data.data, list: response.data.data.list ?? [] };
}

/** 查询项目状态统计数据。 */
export async function getProjectStatisticsApi(): Promise<ProjectStatistics> {
  const response = await http.get<ApiResponse<ProjectStatistics>>(
    "/projects/statistics",
  );
  if (String(response.data.code) !== "0" || !response.data.data)
    throw new Error(
      response.data.message ||
        i18n.global.t("projectManagement.feedback.statisticsFailed"),
    );
  return response.data.data;
}

/** 删除指定项目。 */
export async function deleteProjectApi(projectCode: string): Promise<boolean> {
  const response = await http.delete<ApiResponse<boolean>>(
    `/projects/${projectCode}`,
  );
  if (String(response.data.code) !== "0")
    throw new Error(
      response.data.message ||
        i18n.global.t("projectManagement.feedback.deleteFailed"),
    );
  return response.data.data === true;
}

/** 查询项目详情，返回用于查看弹窗初始化的详情对象。 */
export async function getProjectDetailApi(
  projectCode: string,
): Promise<ProjectDetail> {
  const response = await http.get<ApiResponse<ProjectDetail>>(
    `/projects/${projectCode}`,
  );
  if (String(response.data.code) !== "0" || !response.data.data)
    throw new Error(
      response.data.message ||
        i18n.global.t("projectManagement.feedback.detailFailed"),
    );
  return response.data.data;
}

/** 创建项目，返回后端是否创建成功。 */
export async function createProjectApi(
  params: CreateProjectParams,
): Promise<boolean> {
  const response = await http.post<ApiResponse<boolean>>("/projects", params);
  if (String(response.data.code) !== "0")
    throw new Error(
      response.data.message ||
        i18n.global.t("projectManagement.feedback.createFailed"),
    );
  return response.data.data === true;
}

/** 查询项目模型自迭代轮次；接口无数据时返回空列表。 */
export async function getProjectIterationsApi(
  projectCode: string,
): Promise<ProjectIteration[]> {
  try {
    const response = await http.get<ApiResponse<ProjectIteration[]>>(
      `/projects/${projectCode}/iterations`,
    );
    if (
      String(response.data.code) === "0" &&
      Array.isArray(response.data.data)
    ) {
      return response.data.data;
    }
  } catch {
    /* 迭代接口异常时返回空列表，避免展示过期或伪造的静态数据。 */
  }
  return [];
}
