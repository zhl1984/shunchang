import type {
  LabelAttribute,
  LabelAttributeInput,
  LabelAttributeValueType,
  LabelAttributeOption,
} from "@/api/label";

export type LabelPropertyModalMode = "create" | "edit";
export type LabelPropertyFormType =
  | "number"
  | "text"
  | "date"
  | "boolean"
  | "enum"
  | "json";
export type LabelPropertyFormOption = {
  value: string;
  label: string;
  description?: string;
};

type BaseForm = {
  name: string;
  description: string;
  unit: string;
  readonly: boolean;
  required: boolean;
};

export type LabelPropertyForm =
  | (BaseForm & {
      type: "number";
      defaultValue?: number;
      min?: number;
      max?: number;
      options: [];
      optionsMultiple: false;
    })
  | (BaseForm & {
      type: "text" | "date";
      defaultValue?: string;
      options: [];
      optionsMultiple: false;
    })
  | (BaseForm & {
      type: "boolean";
      defaultValue?: boolean;
      options: [];
      optionsMultiple: false;
    })
  | (BaseForm & {
      type: "enum";
      defaultValue?: string | string[];
      options: LabelPropertyFormOption[];
      optionsMultiple: boolean;
    })
  | (BaseForm & {
      type: "json";
      defaultValue?: undefined;
      unit: string;
      readonly: boolean;
      options: [];
      optionsMultiple: false;
    });

const FORM_TYPE_FROM_API: Record<
  LabelAttributeValueType,
  LabelPropertyFormType
> = {
  NUMBER: "number",
  TEXT: "text",
  DATE: "date",
  BOOLEAN: "boolean",
  ENUM: "enum",
  JSON: "json",
};

const FORM_TYPE_TO_API: Record<LabelPropertyFormType, LabelAttributeValueType> =
  {
    number: "NUMBER",
    text: "TEXT",
    date: "DATE",
    boolean: "BOOLEAN",
    enum: "ENUM",
    json: "JSON",
  };

/** 将接口枚举值转换为弹窗编辑行，表单字段不进入 API 数据模型。 */
function createFormOptions(
  options?: LabelAttributeOption[],
): LabelPropertyFormOption[] {
  if (!options?.length) {
    return [{ label: "", value: "", description: "" }];
  }

  return options.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description ?? "",
  }));
}

/** 创建按值类型收窄的独立表单，并从后端嵌套字段回填。 */
export function createPropertyForm(
  property?: LabelAttribute,
): LabelPropertyForm {
  const type = property
    ? FORM_TYPE_FROM_API[property.config.valueType]
    : "text";
  const constraint = property?.config.constraint ?? {};
  const defaultValue = property?.config.defaultValue;
  const base = {
    name: property?.attributeName ?? "",
    description: property?.attributeDescription ?? "",
    unit: constraint.unit ?? "",
    readonly: property?.config.readOnly ?? false,
    required: property?.config.required ?? false,
  };

  if (type === "number") {
    return {
      ...base,
      type,
      defaultValue: typeof defaultValue === "number" ? defaultValue : undefined,
      min: constraint.min ?? undefined,
      max: constraint.max ?? undefined,
      options: [],
      optionsMultiple: false,
    };
  }

  if (type === "boolean") {
    return {
      ...base,
      type,
      defaultValue:
        typeof defaultValue === "boolean" ? defaultValue : undefined,
      options: [],
      optionsMultiple: false,
    };
  }

  if (type === "enum") {
    const enumDefault = Array.isArray(defaultValue)
      ? defaultValue.filter((item): item is string => typeof item === "string")
      : typeof defaultValue === "string"
        ? defaultValue
        : undefined;
    return {
      ...base,
      type,
      defaultValue: enumDefault,
      options: createFormOptions(constraint.options),
      optionsMultiple: Array.isArray(defaultValue),
    };
  }

  if (type === "json") {
    return {
      ...base,
      type,
      defaultValue: undefined,
      unit: "",
      readonly: false,
      options: [],
      optionsMultiple: false,
    };
  }

  return {
    ...base,
    type,
    defaultValue: typeof defaultValue === "string" ? defaultValue : undefined,
    options: [],
    optionsMultiple: false,
  };
}

/** 切换值类型并清空旧类型专属字段。 */
export function changePropertyType(
  form: LabelPropertyForm,
  type: LabelPropertyFormType,
): LabelPropertyForm {
  const base = {
    name: form.name,
    description: form.description,
    unit: "",
    readonly: form.readonly,
    required: form.required,
  };

  if (type === "number") {
    return {
      ...base,
      type,
      defaultValue: undefined,
      min: undefined,
      max: undefined,
      options: [],
      optionsMultiple: false,
    };
  }

  if (type === "boolean") {
    return {
      ...base,
      type,
      defaultValue: undefined,
      options: [],
      optionsMultiple: false,
    };
  }

  if (type === "enum") {
    return {
      ...base,
      type,
      defaultValue: undefined,
      options: [{ label: "", value: "", description: "" }],
      optionsMultiple: false,
    };
  }

  if (type === "json") {
    return {
      ...base,
      type,
      defaultValue: undefined,
      readonly: false,
      options: [],
      optionsMultiple: false,
    };
  }

  return {
    ...base,
    type,
    defaultValue: undefined,
    options: [],
    optionsMultiple: false,
  };
}

/** 过滤完整枚举行，生成接口 constraint.options 的原始值数组。 */
function buildEnumOptions(options: LabelPropertyFormOption[]): LabelPropertyFormOption[] {
  return options.filter((option) => {
    const value = String(option.value ?? "").trim();
    const label = String(option.label ?? "").trim();
    return Boolean(value && label);
  });
}

/** 将弹窗表单转换为接口文档定义的完整属性请求体。 */
export function buildLabelPropertyInput(
  form: LabelPropertyForm,
): LabelAttributeInput {
  const constraint =
    form.type === "number"
      ? {
          min: form.min ?? null,
          max: form.max ?? null,
          unit: form.unit || null,
        }
      : form.type === "enum"
        ? { options: buildEnumOptions(form.options) }
        : {};

  return {
    attributeName: form.name.trim(),
    attributeDescription: form.description.trim() || null,
    config: {
      valueType: FORM_TYPE_TO_API[form.type],
      defaultValue: form.type === "json" ? null : (form.defaultValue ?? null),
      readOnly: form.type === "json" ? false : form.readonly,
      required: form.required,
      constraint,
    },
  };
}

/** 更新与创建使用同一完整请求体，避免编辑接口产生部分字段。 */
export function buildLabelPropertyUpdate(
  form: LabelPropertyForm,
): LabelAttributeInput {
  return buildLabelPropertyInput(form);
}

/** 过滤枚举默认值，仅保留当前枚举项中仍然存在的值。 */
export function normalizeEnumDefaultValue(
  value: string | string[] | undefined,
  options: readonly LabelPropertyFormOption[],
  multiple: boolean,
): string | string[] | undefined {
  const validValues = new Set(
    options.flatMap((option) =>
      option.value === "" ? [] : [option.value],
    ),
  );
  if (multiple) {
    return Array.isArray(value)
      ? value.filter((item) => validValues.has(item))
      : [];
  }
  return value !== undefined && !Array.isArray(value) && validValues.has(value)
    ? value
    : undefined;
}
