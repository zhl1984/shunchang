import { getAnnotationTaskOhifStudyInstanceUidApi } from "@/api/annotation-task";
import { SCENARIO_URL_MAPPING, type SCENARIO_TYPE } from "@/constants/scenario";
import { i18n } from "@/locales";
import { message } from "ant-design-vue";

/** 将数组转换为 Map；未指定字段时分别使用索引和整行数据。 */
export function toMap<T>(list: readonly T[]): Map<number, T>;
export function toMap<T, K extends keyof T>(
  list: readonly T[],
  key: K,
): Map<T[K], T>;
export function toMap<T, K extends keyof T, V extends keyof T>(
  list: readonly T[],
  key: K,
  value: V,
): Map<T[K], T[V]>;
export function toMap<T, K extends keyof T, V extends keyof T>(
  list: readonly T[],
  key?: K,
  value?: V,
): Map<number | T[K], T | T[V]> {
  return new Map(
    list.map((item, index) => [
      key === undefined ? index : item[key],
      value === undefined ? item : item[value],
    ]),
  );
}

export type CommonUtils = {
  toMap: typeof toMap;
  getPublicImageUrl: typeof getPublicImageUrl;
  goToScenarioWorkbench: typeof goToScenarioWorkbench;
};

/** 工作台跳转所需的业务上下文参数。 */
export interface ScenarioWorkbenchParams {
  taskId: string;
  itemId: string;
  /** 质检任务上下文；普通标注任务不传。 */
  qualityTaskId?: string;
  status?: string;
}

/** 生成兼容 Vite base 配置的 public/images 静态资源地址。 */
export function getPublicImageUrl(path: string): string {
  const imageUrl = `${import.meta.env.BASE_URL}images/${path.replace(/^\/+/, "")}`;
  return `${imageUrl}?v=${encodeURIComponent(__ASSET_VERSION__)}`;
}

/** HTTP 层已弹窗的错误不再重复提示，避免遮挡工作台跳转失败原因。 */
function isHandledHttpError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "status" in error && error.status,
  );
}

/**
 * 按场景生成工作台地址并打开新窗口。
 * 非点云场景需先按 itemId 查询 studyInstanceUID，查询失败时不打开窗口。
 */
export async function goToScenarioWorkbench(
  designerCode: SCENARIO_TYPE,
  params: ScenarioWorkbenchParams,
): Promise<void> {
  const workbenchUrl = SCENARIO_URL_MAPPING[designerCode];
  if (!workbenchUrl) {
    message.warning(i18n.global.t("annotationTask.feedback.workbenchFailed"));
    return;
  }

  /** 不同工作台沿用各自协议的查询参数，避免页面层重复拼接地址。 */
  const url = new URL(workbenchUrl, window.location.origin);
  if (designerCode === "3D_DY") {
    url.searchParams.set("taskId", String(params.taskId));
    url.searchParams.set("clipId", String(params.itemId));
    if (params.qualityTaskId) {
      url.searchParams.set("qualityTaskId", String(params.qualityTaskId));
    }
    const modeByStatus: Record<string, string> = params.qualityTaskId
      ? {
          qualityChecking: "qc",
          reworking: "readonly",
          completed: "readonly",
        }
      : {
          qualityChecking: "readonly",
          reworking: "re",
          completed: "readonly",
        };
    const mode = params.status ? modeByStatus[params.status] : undefined;
    if (mode) url.searchParams.set("mode", mode);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    return;
  }

  try {
    const studyInstanceUID = await getAnnotationTaskOhifStudyInstanceUidApi(
      params.itemId,
    );
    url.searchParams.set("taskId", String(params.taskId));
    url.searchParams.set("itemId", String(params.itemId));
    if (params.qualityTaskId) {
      url.searchParams.set("qualityTaskId", String(params.qualityTaskId));
    }
    const modeByStatus: Record<string, string> = params.qualityTaskId
      ? {
          qualityChecking: "qc",
          reworking: "readonly",
          completed: "readonly",
        }
      : {
          qualityChecking: "readonly",
          reworking: "re",
          completed: "readonly",
        };
    const mode = params.status ? modeByStatus[params.status] : undefined;
    if (mode) url.searchParams.set("mode", mode);
    url.searchParams.set("StudyInstanceUIDs", studyInstanceUID);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  } catch (error: unknown) {
    if (isHandledHttpError(error)) {
      return;
    }
    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : i18n.global.t("annotationTask.feedback.workbenchFailed");
    message.warning(errorMessage);
  }
}

export const commonUtils: CommonUtils = {
  getPublicImageUrl,
  toMap,
  goToScenarioWorkbench,
};
