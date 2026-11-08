import http from "./http";
import { i18n } from "@/locales";

export type LabelTreeNodeType = "GROUP" | "LABEL";

/** 标签树节点，与标签节点接口的请求和响应字段保持一致。 */
export type LabelTreeNode = {
  id: number;
  parentId: number;
  nodeType: LabelTreeNodeType;
  nodeName: string;
  nodeDescription?: string | null;
  sortOrder: number;
  children: LabelTreeNode[];
};

export type LabelGroupTreeNode = LabelTreeNode & { nodeType: "GROUP" };
export type LabelTreeLeafNode = LabelTreeNode & { nodeType: "LABEL" };

/** 创建和更新标签节点时完整提交的请求体。 */
export type LabelTreeNodeInput = {
  parentId: number;
  nodeType: LabelTreeNodeType;
  nodeName: string;
  nodeDescription?: string | null;
};

export type LabelTreeNodeUpdate = LabelTreeNodeInput;

export type LabelAttributeValueType =
  | "NUMBER"
  | "TEXT"
  | "DATE"
  | "BOOLEAN"
  | "ENUM"
  | "JSON";

export type LabelAttributeDefaultValue = unknown;

export type LabelAttributeOption = {
  value: string;
  label: string;
  description?: string;
};

/** 不同属性值类型共用的约束对象，未适用字段由接口忽略。 */
export type LabelAttributeConstraint = {
  min?: number | null;
  max?: number | null;
  unit?: string | null;
  maxLength?: number | null;
  pattern?: string | null;
  minDate?: string | null;
  maxDate?: string | null;
  options?: LabelAttributeOption[];
};

export type LabelAttributeConfig = {
  valueType: LabelAttributeValueType;
  defaultValue: LabelAttributeDefaultValue;
  readOnly: boolean;
  required: boolean;
  constraint: LabelAttributeConstraint;
};

export type LabelPropertyToolBinding = {
  toolId: number;
  toolCode: string;
  toolName: string;
  toolDescription?: string | null;
  toolPropertyCode: string;
  toolPropertyName: string;
  toolPropertyType: string;
};

/** 标签详情中的属性对象，字段与接口文档完全一致。 */
export type LabelAttribute = {
  id: number;
  attributeName: string;
  config: LabelAttributeConfig;
  attributeDescription?: string | null;
  sortOrder: number;
  toolBindings: LabelPropertyToolBinding[];
};

/** 创建和更新标签属性时完整提交的请求体。 */
export type LabelAttributeInput = {
  attributeName: string;
  config: LabelAttributeConfig;
  attributeDescription?: string | null;
};

export type LabelDetail = {
  id: number;
  labelName: string;
  labelDescription?: string | null;
  attributes: LabelAttribute[];
};

export type LabelPropertyToolBindingsInput = {
  bindings: LabelPropertyToolBinding[];
};

export type LabelApiResponse<T> = {
  code: string | number;
  message?: string | null;
  data?: T | null;
};

/** 校验统一业务响应码，失败时将后端消息交给业务层展示。 */
function assertSuccess<T>(response: LabelApiResponse<T>): void {
  if (String(response.code) !== "0") {
    throw new Error(
      response.message || i18n.global.t("labelManagement.api.requestFailed"),
    );
  }
}

/** 解包必须存在 data 的成功响应，阻止异常空值进入页面。 */
function unwrapRequired<T>(
  response: LabelApiResponse<T>,
  emptyMessage: string,
): T {
  assertSuccess(response);

  if (response.data === null || response.data === undefined) {
    throw new Error(emptyMessage);
  }

  return response.data;
}

/** 查询标签树；成功但 data 为空时按空树处理。 */
export async function getLabelTreeNodeListApi(): Promise<LabelTreeNode[]> {
  const response =
    await http.get<LabelApiResponse<LabelTreeNode[]>>("/label-nodes/tree");
  assertSuccess(response.data);
  return response.data.data ?? [];
}

/** 创建标签或分组节点，返回服务端生成字段后的完整节点。 */
export async function createLabelTreeNodeApi(
  input: LabelTreeNodeInput,
): Promise<LabelTreeNode> {
  const response = await http.post<LabelApiResponse<LabelTreeNode>>(
    "/label-nodes",
    input,
  );
  return unwrapRequired(
    response.data,
    i18n.global.t("labelManagement.api.nodeDataEmpty"),
  );
}

/** 完整更新标签或分组节点，nodeType 必须与原节点保持一致。 */
export async function updateLabelTreeNodeApi(
  labelNodeId: number,
  input: LabelTreeNodeUpdate,
): Promise<LabelTreeNode> {
  const response = await http.put<LabelApiResponse<LabelTreeNode>>(
    `/label-nodes/${labelNodeId}`,
    input,
  );
  return unwrapRequired(
    response.data,
    i18n.global.t("labelManagement.api.nodeDataEmpty"),
  );
}

/** 删除标签节点，级联和冲突规则由后端处理。 */
export async function deleteLabelTreeNodeApi(
  labelNodeId: number,
): Promise<void> {
  const response = await http.delete<LabelApiResponse<null>>(
    `/label-nodes/${labelNodeId}`,
  );
  assertSuccess(response.data);
}

/** 查询标签详情，返回名称、说明和完整属性列表。 */
export async function getLabelDetailApi(labelId: number): Promise<LabelDetail> {
  const response = await http.get<LabelApiResponse<LabelDetail>>(
    `/labels/${labelId}`,
  );
  return unwrapRequired(
    response.data,
    i18n.global.t("labelManagement.api.detailDataEmpty"),
  );
}

/** 按标签 ID 查询属性列表，直接复用详情响应中的 attributes。 */
export async function getLabelPropertyListApi(
  labelId: number,
): Promise<LabelAttribute[]> {
  const detail = await getLabelDetailApi(labelId);
  return detail.attributes ?? [];
}

/** 创建标签属性，请求和响应均使用接口文档原始字段。 */
export async function createLabelPropertyApi(
  labelId: number,
  input: LabelAttributeInput,
): Promise<LabelDetail> {
  const response = await http.post<LabelApiResponse<LabelDetail>>(
    `/labels/${labelId}/attributes`,
    input,
  );
  return unwrapRequired(
    response.data,
    i18n.global.t("labelManagement.api.detailDataEmpty"),
  );
}

/** 完整更新指定标签属性，返回更新后的标签详情。 */
export async function updateLabelPropertyApi(
  labelId: number,
  attributeId: number,
  input: LabelAttributeInput,
): Promise<LabelDetail> {
  const response = await http.put<LabelApiResponse<LabelDetail>>(
    `/labels/${labelId}/attributes/${attributeId}`,
    input,
  );
  return unwrapRequired(
    response.data,
    i18n.global.t("labelManagement.api.detailDataEmpty"),
  );
}

/** 删除指定标签下的属性，成功响应的 data 为 null。 */
export async function deleteLabelPropertyApi(
  labelId: number,
  attributeId: number,
): Promise<void> {
  const response = await http.delete<LabelApiResponse<null>>(
    `/labels/${labelId}/attributes/${attributeId}`,
  );
  assertSuccess(response.data);
}

/** 整体覆盖保存标签属性的工具绑定列表。 */
export async function saveLabelPropertyToolBindingsApi(
  labelId: number,
  attributeId: number,
  bindings: LabelPropertyToolBinding[],
): Promise<LabelDetail> {
  const input: LabelPropertyToolBindingsInput = { bindings };
  const response = await http.put<LabelApiResponse<LabelDetail>>(
    `/labels/${labelId}/attributes/${attributeId}/tool-bindings`,
    input,
  );
  return unwrapRequired(
    response.data,
    i18n.global.t("labelManagement.api.detailDataEmpty"),
  );
}
