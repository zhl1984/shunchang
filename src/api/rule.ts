import http from "@/api/http";

export type RuleType = "WHILE_THEN" | "THEN";
export type RuleLogic = "AND" | "OR";
export type RuleOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "IN"
  | "NOT_IN"
  | "GREATER_THAN"
  | "LESS_THAN";
export type RuleValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>;
export type RuleConditionItem = {
  labelAttributeId: number;
  operator: RuleOperator;
  value: RuleValue;
  attributeName?: string;
};
export type RuleConditionGroup = {
  logic: RuleLogic;
  conditions: RuleConditionItem[];
};
export type RuleContent = {
  then: RuleConditionGroup;
  while?: RuleConditionGroup;
};
export type RuleListItem = {
  id: number;
  ruleName: string;
  ruleType: RuleType;
  labelId: number;
  labelName: string;
  ruleDescription: string | null;
  conditionSummary: string;
};
export type Rule = RuleListItem & { ruleContent: RuleContent };
export type RuleInput = {
  ruleName: string;
  ruleType: RuleType;
  labelId: number;
  ruleDescription?: string | null;
  ruleContent: RuleContent;
};
export type RuleUpdate = RuleInput;
export type RuleListParams = {
  keyword?: string;
  ruleType?: RuleType;
  pageNo?: number;
  pageSize?: number;
};
export type RuleListResult = {
  pageNo: number;
  pageSize: number;
  total: number;
  list: RuleListItem[];
};
export type ApiResponse<T> = { code: string; message: string; data: T };

/** 分页查询可信规则，参数使用后端 pageNo/pageSize 和 ruleType 字段。 */
export async function getRuleListApi(
  params: RuleListParams = {},
): Promise<ApiResponse<RuleListResult>> {
  const response = await http.get<ApiResponse<RuleListResult>>(
    "/trusted-rules",
    { params },
  );
  return response.data;
}
/** 查询可信规则详情，返回完整 ruleContent 条件树。 */
export async function getRuleDetailApi(id: number): Promise<ApiResponse<Rule>> {
  return (await http.get<ApiResponse<Rule>>(`/trusted-rules/${id}`)).data;
}
/** 新增可信规则，提交后端要求的规则基础字段和条件树。 */
export async function createRuleApi(
  input: RuleInput,
): Promise<ApiResponse<Rule>> {
  return (await http.post<ApiResponse<Rule>>("/trusted-rules", input)).data;
}
/** 更新可信规则，规则 ID 通过路径传递。 */
export async function updateRuleApi(
  id: number,
  input: RuleUpdate,
): Promise<ApiResponse<Rule>> {
  return (await http.put<ApiResponse<Rule>>(`/trusted-rules/${id}`, input))
    .data;
}
/** 逻辑删除可信规则。 */
export async function deleteRuleApi(id: number): Promise<ApiResponse<null>> {
  return (await http.delete<ApiResponse<null>>(`/trusted-rules/${id}`)).data;
}
