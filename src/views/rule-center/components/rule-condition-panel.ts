import type { LabelAttribute, LabelAttributeValueType } from "@/api/label";
import type {
  RuleConditionGroup,
  RuleLogic,
  RuleOperator,
  RuleValue,
} from "@/api/rule";

export type ConditionValueModel =
  | { kind: "number"; value?: number }
  | { kind: "text"; value?: string | string[] }
  | { kind: "date"; value?: string }
  | { kind: "boolean"; value?: "true" | "false" | Array<"true" | "false"> }
  | { kind: "enum"; value?: string | number | Array<string | number> }
  | { kind: "json"; value?: string };
export type ConditionFormItem = {
  labelAttributeId?: string | number;
  operator: RuleOperator;
  valueModel?: ConditionValueModel;
};
export type ConditionFormGroup = {
  logic: RuleLogic;
  conditions: ConditionFormItem[];
};

/** 创建包含一条空条件的面板初始值。 */
export function createConditionGroup(): ConditionFormGroup {
  return { logic: "AND", conditions: [resetConditionItem()] };
}

/** 创建或重置条件项，操作符固定恢复为等于。 */
export function resetConditionItem(
  labelAttributeId?: string | number,
  propertyType?: LabelAttributeValueType,
): ConditionFormItem {
  return {
    labelAttributeId,
    operator: "EQUALS",
    valueModel: propertyType
      ? createConditionValueModel(propertyType)
      : undefined,
  };
}

/** 根据标签属性类型创建供对应值控件使用的可辨识表单模型。 */
export function createConditionValueModel(
  propertyType: LabelAttributeValueType,
): ConditionValueModel {
  const kind = propertyType.toLowerCase() as ConditionValueModel["kind"];
  return { kind, value: undefined } as ConditionValueModel;
}

/** 将接口布尔值转换为选择框使用的字符串值，其他类型保持原值。 */
function normalizeRuleValue(
  value: RuleValue,
  propertyType: LabelAttributeValueType,
): ConditionValueModel["value"] {
  if (propertyType !== "BOOLEAN") return value as ConditionValueModel["value"];
  if (Array.isArray(value))
    return value.map((item) => String(item)) as Array<"true" | "false">;
  return String(value) as "true" | "false";
}

/** 将接口条件组转换为按标签属性类型区分的 UI 表单模型。 */
export function createConditionGroupFromRule(
  group: RuleConditionGroup,
  properties: readonly LabelAttribute[],
): ConditionFormGroup {
  return {
    logic: group.logic,
    conditions: group.conditions.map((condition) => {
      const property = properties.find(
        (item) => item.id === condition.labelAttributeId,
      )!;
      return {
        labelAttributeId: condition.labelAttributeId,
        operator: condition.operator,
        valueModel: {
          kind: property.config.valueType.toLowerCase(),
          value: normalizeRuleValue(condition.value, property.config.valueType),
        } as ConditionValueModel,
      };
    }),
  };
}

/** 判断值是否满足保存要求，零和 false 均为有效值。 */
export function isConditionValueValid(
  valueModel: ConditionValueModel | undefined,
): boolean {
  const value = valueModel?.value;
  if (value === undefined || value === "") return false;
  return !Array.isArray(value) || value.length > 0;
}

/** 校验条件组至少有一项且所有字段完整。 */
export function isConditionGroupValid(group: ConditionFormGroup): boolean {
  return (
    group.conditions.length > 0 &&
    group.conditions.every(
      (item) =>
        item.labelAttributeId !== undefined &&
        Boolean(item.operator) &&
        isConditionValueValid(item.valueModel),
    )
  );
}
