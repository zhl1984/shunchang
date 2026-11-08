import type {
  DynamicFormField,
  DynamicFormValidationErrors,
  DynamicFormValues,
} from "./types";

function isEmptyValue(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function toNumber(value: unknown) {
  // 与控件边界归一化保持一致，避免未配置的 null/空白值被解释为 0。
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const result = Number(value.trim());
  return Number.isFinite(result) ? result : undefined;
}

function toDateTimestamp(value: unknown) {
  if (typeof value !== "string") return undefined;
  const timestamp = Date.parse(value.replace(" ", "T"));
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

/** 校验 Demo 表单的必填、类型、枚举和范围规则，返回字段级错误。 */
export function validateDynamicForm(
  schema: DynamicFormField[],
  values: DynamicFormValues,
): DynamicFormValidationErrors {
  const errors: DynamicFormValidationErrors = {};
  schema.forEach((field) => {
    const value = values[field.id];
    const min = toNumber(field.minValue);
    const max = toNumber(field.maxValue);
    if (min !== undefined && max !== undefined && min > max) {
      errors[field.id] = { code: "schema" };
      return;
    }
    if (field.required && isEmptyValue(value)) {
      errors[field.id] = { code: "required" };
      return;
    }
    if (isEmptyValue(value)) return;

    if (field.type === "NUMBER") {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        errors[field.id] = { code: "type" };
        return;
      }
      if (min !== undefined && numberValue < min) {
        errors[field.id] = { code: "min", bound: min };
      } else if (max !== undefined && numberValue > max) {
        errors[field.id] = { code: "max", bound: max };
      }
    }

    if (field.type === "DATE" && toDateTimestamp(value) === undefined) {
      errors[field.id] = { code: "type" };
      return;
    }

    if (field.type === "BOOLEAN" && typeof value !== "boolean") {
      errors[field.id] = { code: "type" };
      return;
    }

    if (["RADIO", "DROPDOWN", "MULTI_SELECTION"].includes(field.type)) {
      const options = new Set(
        (field.options || []).map((option) => option.value),
      );
      const valuesToCheck = field.type === "MULTI_SELECTION" ? value : [value];
      if (
        !Array.isArray(valuesToCheck) ||
        valuesToCheck.some((optionValue) => !options.has(optionValue))
      ) {
        errors[field.id] = { code: "option" };
      }
    }
  });
  return errors;
}
