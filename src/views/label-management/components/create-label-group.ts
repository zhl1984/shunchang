import type { LabelTreeNodeInput, LabelTreeNodeUpdate } from "@/api/label";
import type { LabelTreeStoreNode } from "@/stores/label";
import { deepFilter, deepMap, type TreeMapResult } from "@/utils/tree";

export const NO_PARENT_VALUE = "__no_parent_label_group__";

export type LabelModalMode = "create" | "edit";

export type LabelGroupCascaderOption = {
  value: string | number;
  label: string;
  children?: LabelGroupCascaderOption[];
};

export type CreateLabelGroupFormValues = {
  name: string;
  description: string;
  parentPath: Array<string | number>;
};

export type CreateLabelFormValues = CreateLabelGroupFormValues;

type LabelGroupPathNode = {
  nodeType: LabelTreeStoreNode["nodeType"];
  parentId: LabelTreeStoreNode["parentId"];
  path: readonly (string | number)[];
};

/** 将级联路径的末级值转换为接口使用的父节点 ID。 */
function resolveParentId(parentPath: readonly (string | number)[]): number {
  const parentValue = parentPath[parentPath.length - 1];

  return parentValue === undefined || parentValue === NO_PARENT_VALUE
    ? 0
    : Number(parentValue);
}

/** 将完整标签树转换为仅包含分组的级联选项，并补充无父分组选项。 */
export function buildGroupCascaderOptions(
  tree: readonly TreeMapResult<LabelTreeStoreNode>[],
  noParentLabel: string,
): LabelGroupCascaderOption[] {
  const groupTree = deepFilter(tree, (node) => node.nodeType === "GROUP");
  const groupOptions = deepMap(groupTree, (node) => ({
    label: node.nodeName,
    value: node.id,
  }));

  return [{ label: noParentLabel, value: NO_PARENT_VALUE }, ...groupOptions];
}

/** 将弹窗表单值转换为不包含标签专属 code 的分组创建参数。 */
export function buildCreateLabelGroupInput(
  values: CreateLabelGroupFormValues,
): LabelTreeNodeInput {
  return {
    nodeDescription: values.description.trim() || null,
    nodeName: values.name.trim(),
    nodeType: "GROUP",
    parentId: resolveParentId(values.parentPath),
  };
}

/** 将分组表单值转换为不包含节点类型的更新参数。 */
export function buildLabelGroupUpdate(
  values: CreateLabelGroupFormValues,
): LabelTreeNodeUpdate {
  return {
    nodeDescription: values.description.trim() || null,
    nodeName: values.name.trim(),
    nodeType: "GROUP",
    parentId: resolveParentId(values.parentPath),
  };
}

/** 根据当前分组或标签节点计算表单默认使用的完整分组路径。 */
export function resolveLabelGroupPath(
  nodeId: string | number | null,
  mapping: ReadonlyMap<string | number, LabelGroupPathNode>,
): Array<string | number> {
  const selectedNode = nodeId === null ? undefined : mapping.get(nodeId);

  if (selectedNode?.nodeType === "GROUP") {
    return [...selectedNode.path];
  }

  if (selectedNode?.parentId) {
    return [...(mapping.get(selectedNode.parentId)?.path ?? [NO_PARENT_VALUE])];
  }

  return [NO_PARENT_VALUE];
}

/** 根据现有节点的直接父级计算编辑表单需要回填的完整级联路径。 */
export function resolveNodeParentPath(
  node: LabelTreeStoreNode,
  mapping: ReadonlyMap<string | number, LabelGroupPathNode>,
): Array<string | number> {
  if (node.parentId === 0) {
    return [NO_PARENT_VALUE];
  }

  return [...(mapping.get(node.parentId)?.path ?? [NO_PARENT_VALUE])];
}

/** 将标签弹窗表单值转换为标签创建接口所需的参数。 */
export function buildCreateLabelInput(
  values: CreateLabelFormValues,
): LabelTreeNodeInput {
  return {
    nodeDescription: values.description.trim() || null,
    nodeName: values.name.trim(),
    nodeType: "LABEL",
    parentId: resolveParentId(values.parentPath),
  };
}

/** 将标签表单值转换为不包含节点类型的更新参数。 */
export function buildLabelUpdate(
  values: CreateLabelFormValues,
): LabelTreeNodeUpdate {
  return {
    nodeDescription: values.description.trim() || null,
    nodeName: values.name.trim(),
    nodeType: "LABEL",
    parentId: resolveParentId(values.parentPath),
  };
}
