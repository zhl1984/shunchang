export type DynamicFormFieldType =
  | "RADIO"
  | "MULTI_SELECTION"
  | "DROPDOWN"
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "BOOLEAN";

export interface DynamicFormOption {
  value: unknown;
  label: string;
}

export interface DynamicFormField {
  id: string;
  type: DynamicFormFieldType;
  name: string;
  label?: string;
  required?: boolean;
  options?: DynamicFormOption[];
  parent?: string;
  parentValue?: unknown;
  unit?: string;
  readOnly?: boolean;
  minValue?: number | string | null;
  maxValue?: number | string | null;
  description?: string;
  value?: unknown;
}

export type DynamicFormValues = Record<string, unknown>;

export type DynamicFormTheme = "dark" | "light";

export interface DynamicFormContext {
  objectId: string;
  revision: number;
  schema: DynamicFormField[];
  values: DynamicFormValues;
  disabled?: boolean;
  theme?: DynamicFormTheme;
}

export interface DynamicFormValidationError {
  code: "required" | "type" | "min" | "max" | "option" | "schema";
  bound?: number | string;
}

export type DynamicFormValidationErrors = Record<
  string,
  DynamicFormValidationError
>;
