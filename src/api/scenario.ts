import http from "./http";

/** 统一业务响应包装，业务成功由 code=0 判定。 */
export interface ScenarioApiResponse<T> {
  code: string;
  message: string;
  data: T;
}
export type ScenarioAnnotationType = "MANUAL" | "PRE_ANNOTATION";
export type ScenarioRuleStatus = "ENABLED" | "DISABLED";
export interface ScenarioLabelModelInput {
  labelId: number;
  annotationType: ScenarioAnnotationType;
  modelId: number | null;
  modelVersionId: number | null;
}
export interface ScenarioRuleMappingInput {
  ruleId: number;
  status: ScenarioRuleStatus;
}
export interface ScenarioLabelModelMapping extends ScenarioLabelModelInput {
  id: number | null;
  sceneId: number | null;
  labelName: string;
}
export interface ScenarioRuleMapping {
  id: number;
  sceneId: number;
  ruleId: number;
  ruleName: string;
  status: ScenarioRuleStatus;
  ruleDescription: string;
}
export interface Scenario {
  sceneId: number;
  sceneName: string;
  sceneDesc: string;
  annotationTypeId: number;
  qualityPlanId: number;
  annotationTypeName: string;
  qualityPlanName: string;
  labelModelMappings: ScenarioLabelModelMapping[];
  ruleMappings: ScenarioRuleMapping[] | null;
}
export interface ScenarioInput {
  sceneName: string;
  sceneDesc: string;
  annotationTypeId: number;
  qualityPlanId: number;
  labelModels: ScenarioLabelModelInput[];
  ruleMappings: ScenarioRuleMappingInput[];
}
export interface ScenarioListQuery {
  keyword?: string;
  pageNo?: string;
  pageSize?: string;
}
export interface ScenarioPage {
  pageNo: number;
  pageSize: number;
  total: number;
  list: Scenario[];
}

function assertSuccess<T>(response: ScenarioApiResponse<T>): T {
  if (String(response?.code) !== "0")
    throw new Error(response?.message || "Scenario request failed");
  return response.data;
}
/** 查询场景分页列表。 */
export async function getScenarioListApi(
  query: ScenarioListQuery = {},
): Promise<ScenarioPage> {
  const response = await http.get<ScenarioApiResponse<ScenarioPage>>(
    "/scenes",
    { params: query },
  );
  const data = assertSuccess(response.data);
  return {
    pageNo: data?.pageNo ?? 1,
    pageSize: data?.pageSize ?? 10,
    total: data?.total ?? 0,
    list: data?.list ?? [],
  };
}
/** 查询指定场景详情。 */
export async function getScenarioDetailApi(sceneId: string): Promise<Scenario> {
  const response = await http.get<ScenarioApiResponse<Scenario>>(
    `/scenes/${sceneId}`,
  );
  return assertSuccess(response.data);
}
/** 新建场景。 */
export async function createScenarioApi(
  input: ScenarioInput,
): Promise<boolean> {
  const response = await http.post<ScenarioApiResponse<boolean>>(
    "/scenes",
    input,
  );
  return assertSuccess(response.data);
}
/** 更新指定场景。 */
export async function updateScenarioApi(
  sceneId: string,
  input: ScenarioInput,
): Promise<boolean> {
  const response = await http.put<ScenarioApiResponse<boolean>>(
    `/scenes/${sceneId}`,
    input,
  );
  return assertSuccess(response.data);
}
/** 删除指定场景。 */
export async function deleteScenarioApi(sceneId: string): Promise<boolean> {
  const response = await http.delete<ScenarioApiResponse<boolean>>(
    `/scenes/${sceneId}`,
  );
  return assertSuccess(response.data);
}
/** 查询标签对应的模型映射列表。 */
export async function getScenarioLabelModelsApi(
  labelIds: number[],
): Promise<ScenarioLabelModelMapping[]> {
  const response = await http.get<
    ScenarioApiResponse<ScenarioLabelModelMapping[]>
  >("/scenes/label-models", {
    params: { labelIds: labelIds.join(",") },
    autoCancel: "scenario-label-models",
  });
  return assertSuccess(response.data) ?? [];
}
